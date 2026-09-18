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

// A full-screen triangle, so the pass is a draw rather than a dispatch.
//
// A compute kernel can write RealityKit's target texture but cannot read its depth
// texture: everything before the first read runs, everything after is silently
// discarded, and the frame arrives unchanged with no error anywhere. That failure
// looks exactly like a shader whose logic is wrong, and it cost most of a day.
// Sampled from a fragment shader the same texture reads fine.
struct FullScreen {
    float4 position [[position]];
    float2 uv;
};

vertex FullScreen fullScreenTriangle(uint id [[vertex_id]]) {
    float2 corner = float2((id << 1) & 2, id & 2);
    FullScreen out;
    out.position = float4(corner * 2.0 - 1.0, 0.0, 1.0);
    out.uv = float2(corner.x, 1.0 - corner.y);
    return out;
}

fragment half4 softShadow(FullScreen in [[stage_in]],
                          texture2d<half> sourceColor [[texture(0)]],
                          depth2d<float> sourceDepth [[texture(1)]],
                          constant ShadowUniforms &uniforms [[buffer(0)]]) {
    constexpr sampler pointSampler(filter::nearest, address::clamp_to_edge);
    uint2 position = uint2(in.uv * float2(sourceColor.get_width(), sourceColor.get_height()));

    // Unused now that the fragment shader knows its own coordinates, but kept so
    // the debug modes still speak in pixels.
    (void)position;

    // 4 paints the frame solid, which answers a question nothing else can: is the
    // pass's output presented at all?
    if (uniforms.debugMode == 4) {
        return half4(1.0h, 0.0h, 0.0h, 1.0h);
    }

    half4 colour = sourceColor.sample(pointSampler, in.uv);

    // 5 darkens the whole frame without tracing anything: it separates "the
    // composite write works" from "the shadow term is wrong".
    if (uniforms.debugMode == 5) {
        return half4(colour.rgb * 0.18h, colour.a);
    }

    float2 colourSize = float2(sourceColor.get_width(), sourceColor.get_height());
    float2 depthSize = float2(sourceDepth.get_width(), sourceDepth.get_height());
    // 7 reports the depth texture's own size without reading a texel: red is its
    // width over 4096, green its height. Everything after the first read of this
    // texture is discarded when it is not really bound, so the size has to be
    // asked for before the read, not after.
    if (uniforms.debugMode == 7) {
        return half4(half(depthSize.x / 4096.0),
                                half(depthSize.y / 4096.0),
                                half(colourSize.x / 4096.0), 1.0h);
    }

    float depth = sourceDepth.sample(pointSampler, in.uv);

    if (uniforms.debugMode == 3) {
        // Reversed-Z over a 120 m far plane puts a five-metre subject around 0.01,
        // so it is scaled to something an eye or a histogram can read.
        half shown = half(saturate(depth * 40.0));
        return half4(shown, shown, shown, 1.0h);
    }

    // 6 asks only one question: which pixels have any depth at all? White is
    // "something was drawn here", black is "the depth texture said nothing".
    if (uniforms.debugMode == 6) {
        half any = depth > 0.0 ? 1.0h : 0.0h;
        return half4(any, any, any, 1.0h);
    }

    // Nothing was drawn here. Reversed-Z, so the far plane is zero.
    if (depth <= 0.0) {
        return colour;
    }

    // Back to where this pixel is in the room.
    float4 clip = float4(in.uv.x * 2.0 - 1.0, (1.0 - in.uv.y) * 2.0 - 1.0, depth, 1.0);
    float4 world = uniforms.inverseViewProjection * clip;
    float3 surface = world.xyz / world.w;

    if (uniforms.debugMode == 2) {
        float3 shown = fract(surface);
        return half4(half3(shown), 1.0h);
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
        return half4(occluded, occluded, occluded, 1.0h);
    }

    float shade = mix(uniforms.shadowDepth, 1.0, visible);
    return half4(colour.rgb * half(shade), colour.a);
}
