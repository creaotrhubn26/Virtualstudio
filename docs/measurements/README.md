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

## What is still unmeasured

Everything that needs the hardware: sustained frame time, `thermalState` over a
real session, and `os_proc_available_memory`, which the simulator reports as
zero. The app shows all three on screen for exactly that reason — the failure
that matters on location is not a crash but the preview quietly ceasing to match
what was set.
