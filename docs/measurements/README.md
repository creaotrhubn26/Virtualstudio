# The first measurements

Taken by the iPad app in `apple/Virtualstudio`, which exists for this: to answer
the questions in [`../ipad-plan.md`](../ipad-plan.md) with numbers instead of
expectations.

**On the iPad Pro 13-inch (M5) simulator, iOS 26.5. Not a device.** The plan says
so itself, and it says it about the browser tests too: a simulator answers nothing
about frame time, thermals or memory. What it can answer is whether an API does
what the product needs, and both findings below are about that.

Reproduce:

```sh
cd apple && xcodegen generate
xcodebuild -project Virtualstudio.xcodeproj -scheme Virtualstudio \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5)' build
xcrun simctl launch <udid> no.holycrust.virtualstudio --modifier "Snute 10 cm"
xcrun simctl launch <udid> no.holycrust.virtualstudio --stops -1
```

## 1. A modifier's size changes nothing

`shadow-Softboks.png` and `shadow-Snute.png` are the same frame with the key on a
90 × 120 cm softbox and on a 10 cm snoot. By the arithmetic the product is built
on, those are a 1.04 m source and a 0.10 m source, and
`contactHardeningRatio` puts their penumbra widths a factor of ten apart.

Rendered, across 3 296 896 pixels of the scene:

```
max difference   0
mean difference  0.0
pixels differing by more than 2   0
```

Not close — identical. RealityKit has no penumbra to set, so the shadow of a
metre-wide softbox and the shadow of a snoot are the same shadow. This is the
thing the product sells, and it is the finding that decides the renderer: either
a custom Metal shadow pass through `renderingEffects.customPostProcessing`, or
Metal for the scene.

The rod standing in front of the wall is in the frame for this reason. A face has
no straight edge to read a penumbra against.

## 2. The picture is not linear in the light

`stops0.png` and `stops-1.png` are the same rig one stop apart. Mean pixel value
over a patch of lit floor:

| Rig | Mean pixel | Ratio | Stops, measured |
|---|---|---|---|
| as written | 41.69 | 1.000 | +0.000 |
| one stop down | 24.21 | 0.581 | −0.784 |
| two stops down | 12.53 | 0.300 | −1.735 |

One stop of light arrives as three quarters of a stop on screen, two as one and
three quarters. Some of that is display gamma, which is expected and correct —
sRGB alone would give 0.729 and 0.532. The rest is tone mapping, which is not:
0.581 is darker than gamma explains.

`RealityRenderer.CameraSettings` has `isToneMappingEnabled` and can be told to
stop. `RealityView` does not expose it — searching the whole
`_RealityKit_SwiftUI` interface for "tonemap" returns nothing — and its
`renderingEffects` offers motion blur, depth of field, camera grain,
antialiasing, dynamic range and a custom post-process, but no curve control.

This does not make the preview wrong to look at; it makes it wrong to *measure*.
A photographer judging a two-to-one ratio needs the ratio to be two to one. So
the rendering path for judging light is the offscreen `RealityRenderer`, where
the curve can be switched off, rather than the `RealityView` the interface is
built on — or the same custom pass finding 1 already calls for.

## 3. The custom pass, unfinished

Finding 1 says the shadow has to be drawn by hand, so `apple/Virtualstudio` now
carries one: a compute kernel on `renderingEffects.customPostProcessing` that
turns the depth buffer back into world positions and traces a bundle of rays at a
light that is a disc as wide as the modifier really is.

What is established:

- The pass runs, and its output is presented. Painting the frame red
  (`--debug-shadow 4`) turns the screen red; darkening it by 0.18
  (`--debug-shadow 5`) darkens the picture by a mean of 3.76 levels.
- It traces real occlusion. `--debug-shadow 1` draws a shadow map with structure
  in it rather than a blank.
- `SpotLightComponent.Shadow` has to be taken *off* the key when the pass draws
  its shadow. Two shadow terms multiply, and RealityKit's is hard: wherever its
  shadow falls the floor is already dark, so a penumbra drawn on top has nothing
  left to darken. Not a fact about RealityKit — it is how any two shadow terms
  compose — but it cost a round of measurement to see.
- A layout bug, found by measurement and worth recording because nothing warns
  about it: `SIMD3<UInt32>` is sixteen-byte aligned in Swift, so the occluder
  struct was 64 bytes there and 48 in Metal. Every occluder after the first was
  read from the wrong offset. The only symptom was a shadow that did not change.
  Both sides are now asserted at 48 and 496 bytes in `prepare(for:)`.

**What is not established: the penumbra still does not vary with the source.** The
shader is handed radius 1.039 for the softbox and 0.100 for the snoot — the log
line confirms it, along with mode and struct stride — and returns the same
occlusion to the pixel. Somewhere between the radius arriving and the rays being
cast, the size stops mattering, and that is not yet diagnosed. It is the next
thing to pick up, and the diagnostics to pick it up with are all in place.

## 4. The depth texture cannot be read — in the simulator

This is the one to settle on the device, and it is worth stating exactly, because
the failure gives no signal at all.

The pass composites correctly. Painting the frame solid turns the screen solid;
multiplying the colour by 0.18 darkens the picture. Both confirmed with the
shader as a compute kernel and again as a fragment shader.

**Any access to `context.sourceDepthTexture` discards everything after it.** Not
an error, not a warning, not a log line: the instructions before the first access
run and are visible, the instructions after are gone, and the frame arrives
exactly as RealityKit rendered it. A shader that has quietly lost half its body
looks identical to a shader whose logic is wrong, which is where most of the time
on this went.

Four ways were tried, all with the same result:

| Attempt | Result |
|---|---|
| `depth2d<float, access::read>` in a compute kernel | everything after the read discarded |
| `texture2d<float, access::read>` in a compute kernel | same |
| `depth2d<float>` sampled in a fragment shader | same |
| blit into a private `shaderRead`-only copy, sampled | same |

The texture itself reports nothing unusual:

```
depth 2752x2064  format=260 (.depth32Float)  usage=5 (.shaderRead|.renderTarget)
type=2 (.type2D)  samples=1        colour usage=5
```

Same size as the colour texture, declared readable, not multisampled, not an
array. By its own description it should read.

**So this is most likely a simulator limitation rather than an API one**, and it
is exactly the kind of thing the plan says a simulator cannot answer. The next
step is not more shader work: it is to run the same build on the physical M5 iPad
and see whether the depth texture reads there. Everything needed for that is in
place — the pass, the debug modes, and the two launch arguments.

If it reads on the device, the shadow pass finishes in an afternoon: the
occlusion tracing already works against the reconstructed positions. If it does
not read there either, the conclusion is larger and clearer — a custom shadow in
RealityKit's post-process has nothing to reconstruct from, and the scene renderer
has to be Metal.

## What is still unmeasured

Everything that needs the hardware: sustained frame time, `thermalState` over a
real session, and `os_proc_available_memory`, which the simulator reports as
zero. The app shows all three on screen for exactly that reason — the failure
that matters on location is not a crash but the preview quietly ceasing to match
what was set.
