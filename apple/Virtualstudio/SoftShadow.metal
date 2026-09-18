#include <metal_stdlib>
using namespace metal;

// A shadow whose edge is as wide as the light is big.
//
// This is the one thing RealityKit will not do. Its SpotLightComponent.Shadow
// takes a depth bias and two clipping planes and nothing about softness, so a
// 90 x 120 cm softbox and a 10 cm snoot render the same shadow — measured at a
// maximum difference of zero across three million pixels. The whole product rests
// on those two being different, so the shadow has to be drawn here instead.
//
// What this is: the camera's depth buffer is turned back into world positions, and
// from each one a bundle of rays is traced towards the light. The light is not a
// point but a disc as wide as the modifier really is, so a surface that can see
// all of the disc is lit, one that can see none of it is in shadow, and one that
// can see part of it is in the penumbra. That is what a penumbra physically is,
// and it is why the width of it follows the size of the source and the distance to
// what casts it, with nothing tuned by hand.
//
// What this is not: a general shadow algorithm. The occluders are handed in as a
// short list of boxes and spheres, which is what this stage is made of. Arbitrary
// geometry needs a shadow map rendered from the light, which is the same pass with
// a depth texture in front of it. The purpose here is to establish that the
// pipeline works — depth in, world position out, source size drives the edge,
// composited back — not to ship the final algorithm.

constant uint kMaxOccluders = 8;
constant uint kShadowRays = 24;

struct Occluder {
    float3 centre;
    // Half extents for a box. A sphere sets all three to its radius.
    // Not named `half`: that is a type in Metal.
    float3 halfExtent;
    // 0 = box, 1 = sphere.
    uint kind;
    uint pad;
};

struct ShadowUniforms {
    float4x4 inverseViewProjection;
    float3 cameraPosition;
    float3 lightPosition;
    /// The emitting source's real size, in metres. The number everything follows.
    float lightRadius;
    /// How dark a fully shadowed pixel becomes. Not zero: a real set has bounce,
    /// and this pass models none of it.
    float shadowDepth;
    uint occluderCount;
    /// 0 draws the picture. 1 shows the shadow factor, 2 shows the reconstructed
    /// world position, 3 shows raw depth. A shader that produces nothing visible
    /// gives no clue why; these do.
    uint debugMode;
    Occluder occluders[kMaxOccluders];
};

// Slab test. Returns true when the segment from `origin` towards `target` meets
// the box before reaching it.
static bool hitsBox(float3 origin, float3 direction, float maxDistance, float3 centre, float3 halfExtent) {
    float3 inverse = 1.0 / max(abs(direction), 1e-6) * sign(direction + 1e-9);
    float3 entryPlane = (centre - halfExtent - origin) * inverse;
    float3 exitPlane  = (centre + halfExtent - origin) * inverse;
    float3 lo = min(entryPlane, exitPlane);
    float3 hi = max(entryPlane, exitPlane);
    float entry = max(max(lo.x, lo.y), lo.z);
    float exit  = min(min(hi.x, hi.y), hi.z);
    return exit >= max(entry, 0.0) && entry < maxDistance;
}

static bool hitsSphere(float3 origin, float3 direction, float maxDistance, float3 centre, float radius) {
    float3 toCentre = centre - origin;
    float along = dot(toCentre, direction);
    if (along < 0.0 || along > maxDistance) {
        // Still inside the sphere at the start counts as blocked.
        return length(toCentre) < radius;
    }
    float3 closest = origin + direction * along;
    return length(closest - centre) < radius;
}

/// A repeatable spiral over the disc, so the penumbra does not crawl with time.
static float2 discSample(uint index, uint count) {
    float golden = 2.39996323;
    float angle = golden * float(index);
    float radius = sqrt((float(index) + 0.5) / float(count));
    return float2(cos(angle), sin(angle)) * radius;
}

kernel void softShadow(texture2d<half, access::read> sourceColor [[texture(0)]],
                       depth2d<float, access::read> sourceDepth [[texture(1)]],
                       texture2d<half, access::write> targetColor [[texture(2)]],
                       constant ShadowUniforms &uniforms [[buffer(0)]],
                       uint2 position [[thread_position_in_grid]]) {
    if (position.x >= targetColor.get_width() || position.y >= targetColor.get_height()) return;

    // 4 paints the frame solid, which answers a question nothing else can: is the
    // pass's output presented at all?
    if (uniforms.debugMode == 4) {
        targetColor.write(half4(1.0h, 0.0h, 0.0h, 1.0h), position);
        return;
    }

    half4 colour = sourceColor.read(position);

    // 5 darkens the whole frame without tracing anything: it separates "the
    // composite write works" from "the shadow term is wrong".
    if (uniforms.debugMode == 5) {
        targetColor.write(half4(colour.rgb * 0.18h, colour.a), position);
        return;
    }

    // The depth texture is not the size of the colour texture. Reading it at colour
    // coordinates returns zero everywhere outside its own bounds, which is most of
    // the frame, and every one of those pixels then looks like empty space — which
    // is exactly how this pass came to do nothing at all while running perfectly.
    float2 colourSize = float2(targetColor.get_width(), targetColor.get_height());
    float2 depthSize = float2(sourceDepth.get_width(), sourceDepth.get_height());
    uint2 depthPosition = uint2(clamp(
        (float2(position) + 0.5) / colourSize * depthSize,
        float2(0.0),
        depthSize - 1.0
    ));
    float depth = sourceDepth.read(depthPosition);

    if (uniforms.debugMode == 3) {
        // Reversed-Z over a 120 m far plane puts a five-metre subject around 0.01,
        // so it is scaled to something an eye or a histogram can read.
        half shown = half(saturate(depth * 40.0));
        targetColor.write(half4(shown, shown, shown, 1.0h), position);
        return;
    }

    // Nothing was drawn here. Reversed-Z, so the far plane is zero.
    if (depth <= 0.0) {
        targetColor.write(colour, position);
        return;
    }

    // Back to where this pixel is in the room.
    float2 uv = (float2(position) + 0.5) / float2(targetColor.get_width(), targetColor.get_height());
    float4 clip = float4(uv.x * 2.0 - 1.0, (1.0 - uv.y) * 2.0 - 1.0, depth, 1.0);
    float4 world = uniforms.inverseViewProjection * clip;
    float3 surface = world.xyz / world.w;

    if (uniforms.debugMode == 2) {
        float3 shown = fract(surface);
        targetColor.write(half4(half3(shown), 1.0h), position);
        return;
    }

    float3 toLight = uniforms.lightPosition - surface;
    float distanceToLight = length(toLight);
    float3 direction = toLight / max(distanceToLight, 1e-5);

    // Two axes across the light's face, to spread the samples over its disc.
    float3 up = abs(direction.y) < 0.9 ? float3(0, 1, 0) : float3(1, 0, 0);
    float3 right = normalize(cross(direction, up));
    float3 across = cross(right, direction);

    // Lift off the surface so a face does not shadow itself.
    float3 origin = surface + direction * 0.02;

    uint blocked = 0;
    for (uint ray = 0; ray < kShadowRays; ray++) {
        float2 disc = discSample(ray, kShadowRays) * uniforms.lightRadius * 0.5;
        float3 target = uniforms.lightPosition + right * disc.x + across * disc.y;
        float3 towards = target - origin;
        float reach = length(towards);
        float3 unit = towards / max(reach, 1e-5);

        for (uint index = 0; index < uniforms.occluderCount; index++) {
            Occluder occluder = uniforms.occluders[index];
            bool hit = occluder.kind == 0
                ? hitsBox(origin, unit, reach, occluder.centre, occluder.halfExtent)
                : hitsSphere(origin, unit, reach, occluder.centre, occluder.halfExtent.x);
            if (hit) { blocked++; break; }
        }
    }

    float visible = 1.0 - float(blocked) / float(kShadowRays);

    if (uniforms.debugMode == 1) {
        half occluded = half(1.0 - visible);
        targetColor.write(half4(occluded, occluded, occluded, 1.0h), position);
        return;
    }

    float shade = mix(uniforms.shadowDepth, 1.0, visible);
    targetColor.write(half4(colour.rgb * half(shade), colour.a), position);
}
