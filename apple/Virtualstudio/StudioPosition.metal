#include <metal_stdlib>
#include <RealityKit/RealityKit.h>
using namespace metal;

// Where each visible surface is, written into a texture the app owns.
//
// The soft shadow needs a world position per screen pixel, and RealityKit will not
// hand over the depth buffer that would reconstruct one: every attempt to read
// `PostProcessEffectContext.sourceDepthTexture` discards the rest of the shader in
// silence, from compute and from a fragment shader alike. See finding 4 in
// docs/measurements/README.md.
//
// So the position is not reconstructed, it is rendered. A surface shader is handed
// `world_position()` for every fragment it shades, and a second pass over a cloned
// scene writes that into a half-float target. The technique is the Campfire Games
// project's; the comment in its own shader says it plainly — "without reading
// RealityRenderer's inaccessible internal depth texture".
//
// The position is normalised into [0,1] over an eight-metre cube around the set,
// because emissive colour is not a place to put raw metres. Half-float across that
// range resolves about four millimetres, which is finer than any penumbra this is
// used to measure. Anything outside the cube clamps, and the shadow simply does not
// reach there.
constant float3 kStageCentre = float3(0, 2, 0);
constant float kStageHalfExtent = 4.0;

[[visible]] void studioPosition(realitykit::surface_parameters params) {
    float4 config = params.uniforms().custom_parameter();

    // A cutout has to be cut here too, or hair writes the position of a rectangle.
    // CustomMaterial does not apply opacityThreshold on its own.
    if (config.x > 0) {
        constexpr sampler s(coord::normalized, address::repeat, filter::linear, mip_filter::linear);
        float2 uv = params.geometry().uv0();
        uv.y = 1 - uv.y;
        float alpha = params.textures().base_color().sample(s, uv).a
            * params.material_constants().opacity_scale();
        if (alpha < config.x) discard_fragment();
    }

    float3 world = params.geometry().world_position();
    float3 encoded = saturate((world - kStageCentre) / (2 * kStageHalfExtent) + 0.5);
    params.surface().set_base_color(half3(0));
    params.surface().set_emissive_color(half3(encoded));
    params.surface().set_opacity(1.0h);
}
