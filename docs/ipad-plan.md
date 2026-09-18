# iPad edition: a staged plan

This is the plan for a native iPad edition of Virtualstudio, staged so that each
stage produces something usable and the expensive decision is taken last, on
measurements rather than on expectations. It supersedes the "iPad
recommendation" paragraphs in [`studio-scene-and-ipad.md`](studio-scene-and-ipad.md),
which were written before the SDK was inspected.

The web editor stays. Nothing here proposes replacing it.

## What the iPad is for

The browser editor is where a scene is built. The iPad is where a scene is
**used**, and that is a different job:

> Stand in the actual restaurant, the actual ward, the actual kitchen. Scan the
> room. Put the figures where the people will be. Turn the screen around and
> show the extra, the nurse, the waiter what they are going to do.

That is the one thing the browser cannot do, and it is the entire product
argument. A laptop on a service counter is not the same tool. Everything in
this plan is ordered by how directly it serves that sentence.

## What decides this plan

Two sets of facts. Both were measured rather than recalled.

### The repository

Fourteen modules, 3,641 lines, contain the photographic and anatomical
correctness of this product and import nothing from Babylon:

| Module | Lines | What it is |
|---|---|---|
| `core/rendering/photometry.ts` | 353 | candela, inverse square, ISO 2720 metering, modifier size |
| `core/rendering/poseRig.ts` | 350 | editable joints, swing-and-twist limits |
| `core/rendering/limbIk.ts` | 157 | two-bone solve |
| `services/lightingLooks.ts` | 477 | eleven looks, in stops |
| `services/studioLocations.ts` | 385 | places, bounds, marks, polar placement |
| `services/sceneAnimation.ts` | 317 | keyframes and sampling |
| `core/models/sceneComposer.ts` | 269 | the document types |
| `services/movePresets.ts` | 259 | twelve camera moves, eight light moves |
| `services/wardrobeService.ts` | 245 | catalogue resolution, covered-triangle ranges |
| `services/storyboard.ts` | 243 | shots and directions |
| `services/storyboardSheet.ts` | 183 | call sheets |
| `services/sceneMeter.ts` | 166 | a reading at a point |
| `services/studioProps.ts` | 161 | what a prop is in a document |
| `services/studioDocument.ts` | 76 | validation before the scene is cleared |

Every one of them is unit-tested. `wardrobeService.ts` imports Babylon *types*
only and splits cleanly into a pure half and a mesh half.

`src/main.ts` is 37,244 lines and is not portable. It is not a candidate for
translation, and no part of this plan depends on it.

### The SDK

Read from the iOS 26.5 SDK on this machine, so it can be re-checked:

```sh
SDK=$(xcrun --sdk iphoneos --show-sdk-path)
grep -n 'LightComponent\|jointTransforms\|LowLevelMesh.Part\|isToneMappingEnabled' \
  "$SDK/System/Library/Frameworks/RealityFoundation.framework/Modules/RealityFoundation.swiftmodule/arm64e-apple-ios.swiftinterface"
```

| Need | What RealityKit actually has |
|---|---|
| Per-joint posing | `HasModel.jointTransforms: [Transform] { get set }` — writable, by name via `jointNames`. The pose editor ports. |
| Inverse kinematics | A full `IKComponent` with solvers, constraints and per-axis stiffness. Not used: our two-bone solve is tested and deterministic, theirs is neither known nor pinned. |
| Wardrobe layering | `LowLevelMesh.Part(indexOffset:indexCount:…)`. The garments' sorted `[start, end)` triangle ranges **are** parts. No live index-buffer mutation, and no precomputed outfit combinations either. |
| Focal length | `PerspectiveCameraComponent.fieldOfViewInDegrees` with `fieldOfViewOrientation = .vertical`. Our conversion already computes vertical FOV. Exact match. |
| Second camera preview, PNG export | `RealityRenderer.updateAndRender(deltaTime:cameraOutput:)` renders offscreen into a texture. |
| Exposure that does not touch the lights | `RealityRenderer.CameraSettings.isToneMappingEnabled` can be turned off. The rule survives. |
| A custom render pass | `postProcess` on `ARView.renderCallbacks`, and `PostProcessEffectContext<MTLCommandBuffer>`. Metal can be dropped into an otherwise-RealityKit frame. |
| **Shadow softness from the modifier's real size** | **Nothing.** See below. |
| An area light | Nothing. There is no rect or area light component. A softbox cannot be an emitter. |
| Ambient fill | No hemispheric light. `ImageBasedLight` instead — a different model that has to be calibrated, not translated. |
| Physical falloff | `attenuationRadius` windows the falloff to zero at a radius; it is not plain `E = I/d²`. Set it far beyond the set so the window never bites, then verify two stops per doubling by measurement. |

## The one hard finding

Everything a spot light's shadow can be told, on iOS 18 and later, counting the
availability-gated extensions:

```swift
extension SpotLightComponent {
  var attenuationFalloffExponent: Float
}
extension SpotLightComponent.Shadow {
  var depthBias: Float
  var cullModeOverride: FaceCulling?
  var zNear: ShadowClippingPlane      // .automatic or .fixed(Float)
  var zFar:  ShadowClippingPlane
}

public struct PointLightComponent { … }   // ← no Shadow type; cannot cast one
```

Depth, clipping and culling. Not one word about softness: searching the whole
interface for `penumbra`, `softShadow`, `shadowMapSize`, `lightSize`,
`shadowResolution` or `softness` returns nothing at all.

```sh
SDK=$(xcrun --sdk iphoneos --show-sdk-path)
grep -ciE 'penumbra|softshadow|shadowmapsize|lightsize|shadowresolution|softness' \
  "$SDK/System/Library/Frameworks/RealityFoundation.framework/Modules/RealityFoundation.swiftmodule/arm64e-apple-ios.swiftinterface"
# 0
```

So there is no penumbra control, no light-size control and no shadow-map
resolution. A spot light's shadow is whatever RealityKit decides it is; what can
be set is how deep it reaches and where it is clipped.

**Now measured rather than inferred.** The app in `apple/Virtualstudio` renders
the same frame with the key on a 90 × 120 cm softbox and on a 10 cm snoot — a
1.04 m source and a 0.10 m source, a factor of ten apart in
`contactHardeningRatio`. Across 3 296 896 pixels of the scene the two images
differ by a maximum of **zero**. See
[`measurements/README.md`](measurements/README.md).

`zNear`/`zFar` do map cleanly onto the web renderer's `shadowMinZ = 0.2` and
`shadowMaxZ = 20`, which is worth having. It is the softness that has nowhere to
go.

This matters more here than in most apps, because it is the specific claim the
product makes. `contactHardeningRatio` in `photometry.ts` derives the penumbra
from the modifier's real width and height, which is why a 30 × 120 cm stripbox
reads crisper across its short axis than a 90 cm softbox — not because someone
tuned a constant, but because the catalogue's real dimensions drive the shadow
map. On RealityKit as shipped, both read identically.

So this is **not** an open question to spike. The API answer is already no. What
remains to be measured is only how much that costs in practice, and that changes
the shape of stage 2 below: it is a measurement, not an exploration.

## Stage 0 — stop shipping a false export

`src/services/exportService.ts` offers USDZ and USDA. `generateUSDAContent`
writes the declarations and no data:

```
int[] faceVertexCounts        ← no values
int[] faceVertexIndices       ← no values
point3f[] points (26756 points)  ← a note, not an array
```

and the "USDZ" is that text with a `.usdz` extension and `type: 'text/plain'`.
A USDZ is a zip. This file opens in nothing.

Delete both entries from the export panel, or write a real exporter. Do not
leave an iPad plan resting on an export path that does not exist. This is a
small change and it comes first, because everything downstream reads USD.

### And then: no USD at all — a conclusion since contradicted

**Read [`campfire-precedent.md`](campfire-precedent.md) before acting on this
section.** The reasoning below is sound and its premise is incomplete: USD can be
written directly with the `pxr` API, in the same Blender Python this builder
already runs in, and the Campfire Games project next door has been doing exactly
that for eight characters. That path hands RealityKit the skinning and the
materials, which is where `FigureMesh` is currently stuck on both the hair and the
eyes. The decision is open again.

The paragraph that stood here said to extend `build_studio_characters.py` to call
`bpy.ops.wm.usd_export` from the same morphed, rigged, posed Blender scene that
writes the GLB. **There is no Blender scene.** The builder imports NumPy and
nothing else from Blender and writes the glTF document by hand, accessor by
accessor; Blender is a Python runtime there, not a modeller. `bpy.ops.wm.usd_export`
would have nothing to export.

That left converting the finished GLB to USD — the second lossy hop this document
already warned against, through exactly the properties the pipeline is careful
about: four-influence skin weights, Mixamo joint names, clip boundaries. Or
reading the GLB.

Reading it wins, and not only by elimination. The wardrobe needs
`LowLevelMesh.Part` whatever the format, because a garment hides a sorted list of
body triangles and parts are how one mesh is drawn in pieces. A `MeshResource`
built from raw buffers is therefore required either way — and once the buffers are
being assembled by hand, there is no reason to route them through a second file
format on the way. One pipeline, one set of hashes, no conversion to validate, and
the builder stays the single place a figure is defined.

`StudioAssets` is that reader, and it is done: the GLB container, the document, the
five surfaces, the 53-joint skeleton and the three pose clips, checked against the
real bundled figure — 26 756 triangles, normalised weights, unit quaternions in
every clip — and against the same wardrobe ranges the browser uses, through a
shared fixture like every other module.

It also turns the wardrobe from a rebuild into a selection. The browser rebuilds
the whole index buffer when a garment changes; `visibleParts` turns
`female_casualsuit01`'s 102 hidden ranges into **103 mesh parts** over the one
buffer the figure already has.

**Done when** no format is offered that cannot be opened — which is now true — and
the reader's output reaches a `MeshResource` on the device.

## Stage 1 — the portable core, as Swift packages, with no user interface

One Xcode workspace. One app target. Local Swift packages holding the domain
logic, in the dependency direction the repository already enforces: the pure
packages know nothing about the renderer, never the reverse.

- `Photometry` — candela, inverse square, ISO 2720, modifier size, contact-hardening ratio.
- `PoseRig` — the joint table, swing and twist, the clamp.
- `LimbIK` — the two-bone solve.
- `SceneDocument` — `Codable` mirrors of `SceneComposition`, `StudioProp`, `SceneAnimation`, enforcing the same rules.
- `StudioContent` — looks, moves, locations, marks, storyboard. Mostly tables and small pure functions.

Each ported against **the existing TypeScript tests' own fixtures**, not
re-derived. The numbers in `photometry.test.ts`, `poseRig.test.ts`,
`limbIk.test.ts`, `sceneMeter.test.ts`, `studioDocument.test.ts`,
`lightingLooks.test.ts` and `movePresets.test.ts` become XCTest golden values.
Where a fixture is inline, export it to JSON once and let both suites read the
same file — then a divergence is a test failure in one language rather than a
discrepancy nobody notices.

`studioDocument.test.ts` is the specification for `SceneDocument`: it already
writes down, as executable assertions, that a scene with no camera is refused, a
room type that does not exist is refused, a keyframe with no time is refused,
`1/0` is not a shutter speed, an infinite number is refused — and that unknown
fields are **carried through**, so an older reader does not discard what a newer
writer added. A Swift decoder that does not do all of that will eventually eat
someone's work.

**Done when** the Swift suite and the TypeScript suite agree on every shared
fixture, and a v2 document written by the browser decodes in Swift and
re-encodes byte-for-byte equivalent. That round trip is the payoff of the whole
effort: one person plans on a laptop, briefs on the iPad, from one file.

Nothing here needs a device, a renderer, or a decision about either. It is the
cheapest 3,600 lines of value in this plan, and it is worth having even if
stage 2 fails.

## Stage 2 — one measurement, on one device

Not a prototype. A rig that answers four questions with numbers, on a physical
M5 iPad Pro. The simulator does not answer any of them, for the same reason
`PLAYWRIGHT_SOFTWARE_GL=1` is not a performance benchmark.

The scene: two bundled figures, one room, the default studio portrait look —
key, fill and rim, each casting a shadow — plus the live taking-camera preview
rendered beside the navigation view.

1. **Does a modifier's size change anything?** *(Answered, and the answer is no:
   the same image to the last bit.)* So the custom Metal shadow pass through
   `renderingEffects.customPostProcessing` is not optional — it is the feature.
   Port `contactHardeningRatio` into that pass; the maths already exists and is
   tested. That pass is now started and is not finished: it runs and it
   composites, and every attempt to read the depth buffer it needs is
   silently discarded in the simulator. See findings 3 and 4 in
   [`measurements/README.md`](measurements/README.md). What remains for the
   device is whether the depth buffer reads there at all, and then whether the
   pass is affordable.
2. **Is light linear?** *(Answered no, then fixed: it is now, to three decimal places.)* The same rig one stop
   apart reads 0.581 of the pixel value, and two stops apart 0.300 — three
   quarters of a stop and one and three quarters. sRGB gamma alone would give
   0.729 and 0.532, so the rest is tone mapping. `RealityRenderer.CameraSettings`
   can switch it off; `RealityView` cannot, and searching the whole
   `_RealityKit_SwiftUI` interface for "tonemap" returns nothing. This does not
   make the preview wrong to look at, it makes it wrong to meter, and it points at
   the same place finding 1 does. Still to do: calibrate the intensity unit
   against one known fixture, the way `SCENE_INTENSITY_PER_CANDELA` was fixed on
   the Aputure LS 300d II.
3. **Does it hold up?** Frame time and `ProcessInfo.thermalState`, sampled for
   thirty minutes of ordinary editing, in Stage Manager alongside another app.
   The failure that matters is not a crash — it is the preview quietly ceasing to
   match what was set, which an on-location user will not notice until the shoot.
4. **Does it fit in memory?** `os_proc_available_memory`, not device RAM. Total
   up two figures with their skin, eye, hair and garment textures, a scanned
   room, and the shadow maps. The web app spends 2048² per shadow-casting light;
   at six lights that alone is substantial before mip chains.

Also in this stage, because it is cheap once the rig exists: write one joint
quaternion per frame through `jointTransforms` and confirm the mesh deforms
correctly. The API is writable; that it is *reliable* under per-frame
procedural writes is a different claim.

**Decision taken here, and not before:** RealityKit throughout; RealityKit with
a custom Metal shadow pass; or Metal for the scene. On the shadow evidence
above, the middle answer is the likely one. Frame it that way in advance so the
result is not read as a defeat.

## Stage 3 — the app, if stage 2 passes

The interface rules are the ones in
[`.claude/skills/virtual-studio/SKILL.md`](../.claude/skills/virtual-studio/SKILL.md),
and they were written for exactly this: a tool used by someone who has never lit
anything, standing in a room, with a person waiting.

**Progressive disclosure, on a device held in one hand.** Layer one is the whole
screen: the place, the look, the marks. Name it, do not configure it. Layer two
is a sheet: length, start, on and off. Layer three is a separate inspector with
candela, stops, kelvin and metres in it, reached deliberately. The iPad makes
this easier than the browser did, not harder: there is no room for a wall of
buttons, so the discipline is enforced by the screen.

**Immediate feedback is harder here and matters more.** A rig rebuild takes a
moment. The state changes first and the work happens second, the buttons disable
while it runs, and nothing is silently inert. On a phone-sized panel a dead
button is indistinguishable from a broken app.

**Every state, and one more than the browser needs.** Empty, working,
impossible, active, failed — plus *not scanned yet*, *scan is poor*, and *this
room is not rectangular*, which are states only the iPad can be in.

**Prevent the error.** Marks instead of coordinates: nobody drags a light to
`x: 2.4, z: -1.8` on a touchscreen. `resolvePlacement`, `insideRoom` and
`clearOfCamera` already exist and already refuse to put a light inside a wall or
in front of the lens; on the iPad they are not a safeguard, they are the whole
placement interface.

**One scene state, four inputs.** Pencil, touch, pointer and keyboard all mutate
the same model through the same path. Apple gives four gesture APIs, not one
editing model — that is ours to write, and writing it twice is how the four
inputs drift apart. WASD ports directly via `UIKeyCommand`.

**RoomPlan, not ARKit meshes.** `CapturedRoom` returns walls as dimensioned
rectangles, openings, and furniture as categorised oriented boxes.
`StudioLocation.bounds` is essentially that output already, and `StudioMark` is
essentially a furniture box with a role attached — "ved benken" and "ved bordet"
are hand-authored today precisely because no counter or table was measured. Walk
`CapturedRoom.objects`, propose marks, let the photographer assign roles and
facing. ARKit's raw mesh would mean building room extraction from scratch to
arrive at less.

Expect a few centimetres of error, which `insideRoom`'s 0.35 m margin already
absorbs. Expect rectilinear snapping to regularise a genuinely angled room, and
design the *scan is poor* state for it rather than pretending. Neither RoomPlan
nor ARKit measures reflectance, so a scanned room lights exactly as the built
rooms do: direct falloff and shadow, no bounce. That is already in the known
limits, and it stays there.

**Offline, because the use case is a basement restaurant.** Cache the figures'
USD on first launch, keep documents as local files in the same JSON, and require
no backend for anything in the core loop. The web editor already needs no
backend for the scene; do not introduce one here.

## The five questions

1. **Does it hurt?** Briefing extras and staff today means describing a shot in
   words on the day, and re-lighting or re-staging when the description was not
   what was meant. That cost lands on the shoot day, with everyone present.
2. **Does it happen often?** Every shoot with more than one person in frame.
   Weekly for a commercial photographer, daily for a production company.
3. **Who has the budget?** Photographers and small production companies;
   restaurant and retail chains producing their own content; health authorities
   making training video, which is where the hospital room and the marks-with-roles
   model came from.
4. **Can it be shown in a minute?** Scan the room, pick a look, place three
   marks, turn the screen around. That is the demonstration, and it is under a
   minute.
5. **Does it get more valuable with use?** Saved scenes, looks, the wardrobe, the
   prop library, the storyboard and call sheets all accumulate, and they are the
   same files on both platforms.

Question 4 is the reason to build the iPad edition at all. It cannot be
demonstrated in a browser on a laptop, because the demonstration is standing in
the room.

## What this plan does not claim

- No native performance, thermal or memory figure exists yet. The two findings
  recorded in [`measurements/README.md`](measurements/README.md) are about what
  the API can do, which a simulator can answer; frame time, thermals and
  `os_proc_available_memory` need the hardware, and the app puts all three on
  screen for when it has it.
- RealityKit's shadow softness cannot be driven from a modifier's real size.
  That is measured from the SDK, not estimated, and it is not worked around by
  choosing better numbers. An earlier draft of this document said
  `SpotLightComponent.Shadow` had no properties at all; it has four on iOS 18 and
  later, through an availability-gated extension that reading the struct body
  alone misses. They govern depth bias, clipping and culling. The conclusion is
  unchanged and the reason is narrower: softness is the thing with nowhere to go.
- The Apple documentation figure of eight dynamic lights, relaxed on later GPU
  families, describes *lit*, not *shadow-casting*. Take the shadow count from
  stage 2 and from nothing else.
- No USD asset has been exported or validated yet. Stage 0 exists for that
  reason.
- Facial expressions, cloth simulation, bounce light and measured photometry are
  out of scope here exactly as they are out of scope in the web editor. The known
  limits in `CLAUDE.md` are the same limits on the iPad.
