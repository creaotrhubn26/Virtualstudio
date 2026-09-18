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
// How many samples look for something in the way before the penumbra is sized.
constant uint kBlockerSamples = 12;

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
    float4x4 lightViewProjection;
    float3 cameraPosition;
    float3 lightPosition;
    /// The emitting source's real size, in metres. The number everything follows.
    float lightRadius;
    /// How dark a fully shadowed pixel becomes. Not zero: a real set has bounce,
    /// and this pass models none of it.
    float shadowDepth;
    float lightNear;
    float lightFar;
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

// A full-screen triangle, so the composite is a draw rather than a dispatch.
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

// Encoded the same way StudioPosition.metal encodes it. The two constants are the
// one thing that has to stay in step between the two shaders.
constant float3 kStageCentre = float3(0, 2, 0);
constant float kStageHalfExtent = 4.0;

// The shadow term, on its own and at its own resolution.
//
// Tracing twenty-four rays against four occluders for every one of 5.7 million
// pixels is thirteen milliseconds on an M5, against one for the whole rest of the
// frame. The term does not need the colour's resolution: a penumbra is a gradient
// by definition, and a gradient upsamples honestly where a silhouette would not.
// The position it reads is still full resolution and sampled nearest, so no pixel
// is ever given a place halfway between a near edge and a far floor.
/// How far the light can see in a direction, in metres, from the map it rendered.
///
/// The map holds a world position per texel, the same encoding the camera's pass
/// uses, so the distance is read rather than decoded from a depth curve.
static float lightReach(texture2d<float> map, sampler s, float2 uv, float3 lightPosition, float far) {
    float3 encoded = map.sample(s, uv).rgb;
    // Nothing drawn: the light reaches as far as it likes.
    if (all(encoded < 1e-5)) return far;
    float3 world = (encoded - 0.5) * (2 * kStageHalfExtent) + kStageCentre;
    return length(world - lightPosition);
}

// The shadow term, from the light's own view of the scene.
//
// Percentage-closer soft shadows: find what is blocking, measure how far in front
// of the receiver it is, and let the penumbra grow with that distance and with the
// size of the source. That last factor is the product's whole claim — a 90 cm
// softbox and a 10 cm snoot differ by it and by nothing else — and it is the same
// relationship `contactHardeningRatio` encodes for the web renderer.
//
// The occluders are now the scene's own geometry rather than four analytic boxes
// standing in for a figure, which is what makes the shadow of a hand look like a
// hand.
fragment float shadowFactor(FullScreen in [[stage_in]],
                            texture2d<float> surfacePosition [[texture(0)]],
                            texture2d<float> lightMap [[texture(1)]],
                            constant ShadowUniforms &uniforms [[buffer(0)]]) {
    constexpr sampler pointSampler(filter::nearest, address::clamp_to_edge);
    float3 encoded = surfacePosition.sample(pointSampler, in.uv).rgb;
    if (all(encoded < 1e-5)) return 1.0;

    float3 surface = (encoded - 0.5) * (2 * kStageHalfExtent) + kStageCentre;
    float4 clip = uniforms.lightViewProjection * float4(surface, 1);
    if (clip.w <= 0) return 1.0;
    float3 ndc = clip.xyz / clip.w;
    float2 uv = float2(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
    // Outside the beam there is no light to block.
    if (any(uv < 0.0) || any(uv > 1.0)) return 1.0;

    float receiver = length(surface - uniforms.lightPosition);

    // How wide to look for a blocker: the source's own size, as it projects at the
    // receiver's distance.
    float searchRadius = uniforms.lightRadius / max(receiver, 0.1) * 0.35;

    float blockerSum = 0;
    uint blockerCount = 0;
    for (uint step = 0; step < kBlockerSamples; step++) {
        float2 offset = discSample(step, kBlockerSamples) * searchRadius;
        float reach = lightReach(lightMap, pointSampler, uv + offset, uniforms.lightPosition, uniforms.lightFar);
        // A bias in metres, so a surface does not shadow itself at a grazing angle.
        if (reach < receiver - 0.02) { blockerSum += reach; blockerCount++; }
    }
    if (blockerCount == 0) return 1.0;

    float blocker = blockerSum / float(blockerCount);
    // The penumbra a source of this size casts, given how far the blocker stands in
    // front of what catches its shadow. This is the whole photographic claim in one
    // line: double the source, double the softness; move the blocker away from the
    // floor, the same.
    float penumbra = uniforms.lightRadius * (receiver - blocker) / max(blocker, 0.1);
    float radius = clamp(penumbra / max(receiver, 0.1) * 0.5, 0.0005, 0.25);

    uint blocked = 0;
    for (uint step = 0; step < kShadowRays; step++) {
        float2 offset = discSample(step, kShadowRays) * radius;
        float reach = lightReach(lightMap, pointSampler, uv + offset, uniforms.lightPosition, uniforms.lightFar);
        if (reach < receiver - 0.02) blocked++;
    }
    return 1.0 - float(blocked) / float(kShadowRays);
}

// Colour, darkened where the light cannot reach. Linear sampling on the factor,
// which is what makes a half-resolution term acceptable: the thing being spread
// over four pixels is a gradient, not an edge.
fragment half4 softShadow(FullScreen in [[stage_in]],
                          texture2d<half> sourceColor [[texture(0)]],
                          texture2d<float> shadow [[texture(1)]],
                          texture2d<float> surfacePosition [[texture(2)]],
                          constant ShadowUniforms &uniforms [[buffer(0)]]) {
    constexpr sampler pointSampler(filter::nearest, address::clamp_to_edge);
    constexpr sampler smoothSampler(filter::linear, address::clamp_to_edge);
    half4 colour = sourceColor.sample(pointSampler, in.uv);

    if (uniforms.debugMode == 2) {
        return half4(half3(surfacePosition.sample(pointSampler, in.uv).rgb), 1.0h);
    }

    float visible = shadow.sample(smoothSampler, in.uv).r;
    if (uniforms.debugMode == 1) {
        half occluded = half(1.0 - visible);
        return half4(occluded, occluded, occluded, 1.0h);
    }
    return half4(colour.rgb * half(mix(uniforms.shadowDepth, 1.0, visible)), colour.a);
}
