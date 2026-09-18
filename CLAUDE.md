# Virtualstudio: continuation guide

This file is the working context for continuing Virtualstudio with Claude or another coding agent. Read it before changing the scene, characters, lighting or document format. The detailed implementation audit is in [`docs/studio-scene-and-ipad.md`](docs/studio-scene-and-ipad.md), and the staged plan for a native iPad edition is in [`docs/ipad-plan.md`](docs/ipad-plan.md).

## Product direction

Virtualstudio is a browser-based photographic previsualization studio built with TypeScript, Babylon.js and React panels. The target experience is similar to set.a.light 3D: place believable people, cameras, lights, modifiers and surroundings, then judge composition and lighting from the taking camera.

The current work establishes a dependable baseline. It does not claim feature or rendering parity with set.a.light 3D. Preserve the working web application while improving photographic accuracy and editing depth. A native iPad edition is a later product track, not a reason to replace the web scene now.

## Working baseline

The `codex/studio-scene-workspace` branch adds:

- Two bundled anatomical adult characters with skin, eyes, hair, fitted clothes, shoes, a 53-joint rig and three studio poses.
- A seated pose that creates a fitted portrait chair, grounds the feet and follows the character when it moves.
- A furnished 16 × 17 metre industrial studio based on the supplied visual reference.
- Separate navigation and taking cameras, camera/top/front/side views, live 16:9 preview and portrait/full-body framing.
- Correct focal-length-to-FOV behavior and camera exposure that does not change physical light power.
- A tangent-continuous cyclorama, metre grid and neutral default image processing.
- Lossless version 2 local scene documents with validation before the current scene is replaced.
- Repeatable unit, asset and Playwright verification.

Do not reintroduce the missing avatar files or the old catalogue of fifty labels that all resolved to the same demo model. Do not restore the astronaut as the default studio figure.

## How the figures are built

The character solution follows the asset-building approach already used by the local Campfire Games project: prepare anatomical assets offline, export a game-engine skeleton and ship self-contained runtime models.

The implementation is in [`scripts/characters/build_studio_characters.py`](scripts/characters/build_studio_characters.py). It does not call MakeHuman or MPFB application code. It consumes MakeHuman Community **data** distributed under CC0:

- MPFB data is pinned to revision `437dd513888a92399d1d3200d2e80859fae55abc`.
- The official CC0 system-asset archive is pinned by SHA-256 in the builder.
- Source files and hashes are recorded in [`public/models/avatars/studio/manifest.json`](public/models/avatars/studio/manifest.json).
- Licensing, provenance and rebuild limits are recorded in [`public/models/avatars/studio/PROVENANCE.md`](public/models/avatars/studio/PROVENANCE.md).

The builder performs these steps:

1. Load the MakeHuman base topology and apply pinned anatomical targets for male/female shape and head form.
2. Scale the body to the declared real-world height: 1.72 m for the woman and 1.82 m for the man.
3. Transfer and normalize skin weights, retaining at most four joint influences per vertex for GLTF compatibility.
4. Export the 53-joint `game_engine` skeleton with Mixamo-compatible joint names and inverse bind matrices. Joint order is deterministic and identical in every file, which is what lets a garment built separately be worn on any body.
5. Export the body with **every** face, and separate surfaces for skin, eyes and alpha-cutout hair. Embed albedo, normal and occlusion textures.
6. Fit each CC0 garment to the morphed body through its barycentric bindings and export it as its own GLB, carrying the list of body triangles it covers.
7. Export `StudioStand`, `StudioPortrait` and `StudioSeated` as complete fixed-pose animation clips on the body. Every clip writes every joint rotation so switching poses resets cleanly. Garments carry no clips; they ride the body's skeleton.
8. Solve the seated arms from actual limb lengths so the hands rest on the thighs instead of floating beside the body.

The generated runtime files are:

- `public/models/avatars/studio/studio-woman.glb`, `studio-man.glb` — bodies, with no clothes of their own
- `public/models/avatars/studio/wardrobe/<body>/<garment>.glb` — one file per garment
- `public/models/avatars/studio/wardrobe.json` — the catalogue: which garments fit which body, which slot each fills, the body triangles each covers, and what a body opens wearing

### Wardrobe as a layer

A body used to ship with its one outfit baked in, with the body faces underneath **deleted** so skin could not show through. That made a figure able to play exactly one part: you could not put the same person in a work suit and an evening suit.

The body now keeps every face, and each garment records the body triangles it covers as sorted `[start, end)` ranges. Triangle order is the builder's fan triangulation of the full body face list, so the ranges index straight into the exported `Skin` mesh; `validate_studio_characters.py` asserts the body is exactly 26756 triangles for this reason. [`src/services/wardrobeService.ts`](src/services/wardrobeService.ts) rebuilds the index buffer from the union of the worn garments' ranges, so removing a garment puts the skin back.

A garment is imported with a copy of the rig, which is **discarded**: the mesh is skinned to the body's skeleton instead, so it follows every pose and joint edit without being animated separately. The duplicate joints must go — they carry the same names as the body's, and the pose editor looks its joints up by name.

Only the bundled `studio-*` bodies have a wardrobe. Any other import is left exactly as its file describes it, and an unreachable catalogue leaves the figure undressed with a warning rather than failing the load.

Rebuild them with Blender, because the builder uses NumPy:

```sh
STUDIO_CHARACTER_CACHE=/tmp/campfire-character-source \
  /Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup \
  --python scripts/characters/build_studio_characters.py
python3 scripts/characters/validate_studio_characters.py
```

If the shared Campfire cache is unavailable, omit `STUDIO_CHARACTER_CACHE`; the builder uses `/tmp/virtualstudio-character-source` and downloads the pinned sources. Review provenance before changing a revision or archive hash.

The validator checks file hashes, geometry ranges, 53 joints, five surfaces, embedded textures, complete pose rotations, valid indices and normalized skin weights. Keep it updated whenever the export format changes.

## How figures work at runtime

`src/main.ts` owns character import and scene integration:

- `loadStudioCharacter` selects one of the bundled adults.
- `loadCharacterModel` imports the full GLTF hierarchy, validates it before removing the current valid model, normalizes height and records `sourceModelUrl` and `heightMeters`.
- The editable object is a common model root. Moving it keeps body, clothes, hair, eyes, skeleton and animation together.
- `applyStudioPose` stops other movement, selects the fixed animation group and waits until the next rendered frame before refreshing skinned bounds. Grounding before that frame uses stale rest-pose bounds and makes seated feet float.
- `removeCharacterModel` disposes animation groups, rig tracking, skeletons, materials and textures. Preserve this cleanup when adding model replacement paths.

Babylon's `getChildMeshes(true)` returns direct descendants in this codebase's API usage; it must not be treated as a request for recursive traversal. Character code that needs all surfaces uses the normal recursive hierarchy path. This distinction caused the earlier split-body and material bugs.

[`src/services/avatarMaterialService.ts`](src/services/avatarMaterialService.ts) must preserve authored GLTF PBR materials, texture maps and hair alpha. Procedural fallback materials are for untextured imports only. Do not flatten the five authored surfaces to one grey material.

### Editable posing

The three clips remain the reset states; joint editing changes the rotations a clip leaves on the skeleton, and re-applying a clip puts them all back.

[`src/core/rendering/poseRig.ts`](src/core/rendering/poseRig.ts) holds the joint table and is unit-tested. The axis convention is taken from the rig itself rather than guessed: the pose clips in the character builder rotate one local axis per joint, which fixes X as flexion and extension, Y as twist, and Z as movement away from or across the body. A glTF node's rotation is already relative to its bind pose, so the clamped values are anatomical angles measured from the rest stance. The ranges are conventional clinical figures, deliberately a little tighter than a trained body reaches; they are not measured from a subject. A unit test asserts that every rotation the bundled clips strike is inside them, so a limit can never fight a reset state.

Limits are **swing and twist**, not per-axis Euler angles. Elbows and knees are hinges with one axis, one direction, and no sideways play at all. Every other joint has a cone the bone may swing within and a range it may roll about its own length. Per-axis Euler limits were tried first and are the wrong model: every Euler factorisation is ill-conditioned near its middle axis's ±90°, so an ordinary reach decomposes into extreme numbers that a per-axis clamp then mangles — an arm reaching forward came back pinned to its limits with the hand half a metre off target. Swing and twist are stable everywhere, and they are what a published range of motion actually describes. Do not reintroduce per-axis Euler clamping.

[`src/core/rendering/PoseEditor.ts`](src/core/rendering/PoseEditor.ts) owns the interaction: a handle per joint on the helper layer, a rotation gizmo whose rings are limited to the axes that joint actually has, and a clamp that runs every frame so a drag cannot carry a joint out of range even momentarily.

### Reaching with a hand or a foot

A green box on each hand and foot can be dragged to place the limb; the shoulder or hip and the hinge behind it are solved to follow. [`src/core/rendering/limbIk.ts`](src/core/rendering/limbIk.ts) is the pure two-bone solve — the same law-of-cosines construction the character builder uses to put the seated arms on the thighs — and it is unit-tested on segment lengths, reach limits and bend plane. Without a declared pole a solved limb keeps the bend plane its clip gave it, so an elbow never flips behind the body.

Two rig facts that cost real debugging time, both worth keeping in mind before touching this code:

- **The glTF loader parents the figure under a mirrored root**, so a world matrix has a negative determinant and no well-defined rotation to decompose. Reading `absoluteRotationQuaternion` back sent arms off in their own direction entirely. `aimSegment` therefore transforms two *points* into the parent's frame and builds the rotation there, which is exact either way.
- **The hinge axis is not perpendicular to the limb.** A degree at the elbow is worth about two thirds of a degree of bend, so the joint angle cannot be derived from the solver's interior angle; doing so left the hand four centimetres short. `foldHinge` bisects the joint's own range against the rig until the limb spans the right distance, which assumes nothing about how the axes are laid out.

`VirtualStudio.setPoseEditing` builds the editor lazily against the current figure and disposes it with that figure, so a model swap or a document load cannot leave handles on a dead skeleton. Every joint change re-grounds the figure, but only after the next render: grounding immediately measures the previous pose and leaves the feet in the air, the same trap `applyStudioPose` avoids.

Joint edits are stored in the actor's `userData.jointRotations` as the difference from the clip, so a document from an unedited scene is unchanged and only moved joints are written. They are clamped again on load, so a corrupt file cannot bend a figure backwards.

### Objects on set

The studio builds a great deal of geometry the user cannot touch. Each piece of it used to be a special case, and a scenario needing a hospital bed or an air ambulance would have been one more. A **prop** is the single general answer: a named thing with a transform that can be selected, moved, hidden and saved, whatever its geometry came from.

Two things become a prop, and after that they behave identically:

- **Geometry the studio built**, claimed by its stable `metadata.studioObjectKey`. Anything the studio learns to build later becomes claimable by setting that key — nothing is registered in a list. The key matters: the portrait chair's Babylon node is named after the figure's unique id, which differs every session, so a claim on the name would never find it again.
- **A model file**, imported onto the set. The document keeps where it came from.

**Ownership is the point.** Until an object is claimed the studio owns it; afterwards the document owns its transform. `StudioProps.claim` takes a release callback for whatever the studio was doing to that object, and `VirtualStudio.releaseStudioObject` supplies it: the portrait chair follows the figure every frame, and `StudioSeat.release` ends that tracking so the studio does not put the chair back under the figure on the next frame. This is the ownership and serialization design the chair was waiting for.

Claimed objects are stored under `studioProps` in the document — a separate key from the older `props`, which belongs to the asset-library loader and means something else. A claimed object travels as a key and a transform, never as geometry. Removing a prop gives studio-built geometry back untouched and only disposes what the prop system imported.

They are restored **after** the actors and after a few rendered frames, because a derived object does not exist until the thing it derives from does: the chair is built in an after-render callback of the seated pose. Claims this scene cannot honour — a sofa in a document opened against an empty room — are reported to the photographer rather than silently dropped.

Room furniture is still merged into batched geometry for draw-call cost, so individual pieces carry no key yet and cannot be claimed. Giving them keys means keeping them as separate meshes, which is a deliberate trade against the batching `StudioRoom` does today.

### Movement

A scenario is rarely a still: something arrives, a door opens, a light is walked in. The timeline could already keyframe position and rotation, but only for a **light** — `applyAnimationAtTime` looked its target up in the light table and nothing else could be addressed — and none of it was written to the document, so a scene that depended on movement did not survive being reopened.

A track now addresses a node by id and says nothing about what that node is. `VirtualStudio.animatedNode` resolves the id against lights, props and actors in turn, so all three are driven by the same code.

Angles are **radians**, as everywhere else a document stores an angle. The light panel works in degrees and converts at its own edge. Keeping two units in the saved format would guarantee that something eventually turns by a factor of 57.

[`src/services/sceneAnimation.ts`](src/services/sceneAnimation.ts) holds the sampling and is unit-tested. A track holds at its first and last keyframe rather than extrapolating — a helicopter that has landed should stay landed — and an empty track returns null so the caller leaves the node alone instead of moving it to the origin.

The timeline is stored under `animation` in the document, optional and validated, and restored **before** the props it moves. The duration is never allowed to fall short of the last keyframe, or a saved timeline would cut its own movement off.

### Seated contact and chair

[`src/core/rendering/StudioSeat.ts`](src/core/rendering/StudioSeat.ts) creates the leather and chrome portrait chair only for `StudioSeated`:

1. `applyStudioPose` updates skin matrices and grounds the shoes at approximately 0.016 m.
2. `StudioSeat` reads skinned body and clothing positions near `mixamorigHips`.
3. It finds the lower rear pelvis contact patch and uses that world-space height as the cushion top.
4. The pedestal changes height to meet the body; the character is not moved off the grounded pose.
5. A render observer follows the character root, including translation and yaw.
6. Switching to a standing pose or disposing the character removes the chair and observer.

The chair is derived from the character pose. A saved actor with `studioPose: "StudioSeated"` recreates it after document load. The chair is currently not an independently editable prop; making it editable requires an explicit ownership and serialization design.

## Where the assets live

The character bodies and every garment are **not in git**. They are built offline and published to the Virtualstudio S3 bucket, which sits behind a CloudFront distribution; the bucket itself is private and reachable only through that distribution's origin access control.

```
s3://virtualstudio-assets-<account>/
  assets/models|audio|images|textures|pattern-thumbnails/   cached a year, path-addressed
  system/characters/                                        manifests, cached a minute
  releases/                                                 immutable snapshots for rollback
```

- [`scripts/aws/provision-assets.sh`](scripts/aws/provision-assets.sh) creates the bucket, the distribution and the deploy policy. It is idempotent; run it again after changing a policy.
- [`scripts/aws/sync-assets.sh`](scripts/aws/sync-assets.sh) publishes `public/` and invalidates the manifests.
- [`scripts/aws/fetch-assets.sh`](scripts/aws/fetch-assets.sh) brings a published set down into `public/`. **A fresh clone needs this before the studio shows a figure or the Playwright suites run**, because the GLBs are gitignored.

[`src/config/assetConfig.ts`](src/config/assetConfig.ts) resolves an asset against `VITE_ASSET_CDN_BASE` when it is set, Cloudflare R2 when the older flag is set, and the local path otherwise. Development and the browser tests run on local paths, which is why they work offline. Cloudflare R2 remains wired up while assets move across; it is not the destination.

CloudFront charges for egress where R2 did not, so keep an eye on what a first visit actually downloads: a dressed figure is about 23 MB.

## Scene architecture

The renderer is concentrated in a large legacy [`src/main.ts`](src/main.ts). Extend it carefully and move self-contained new behavior into focused modules instead of adding more unrelated UI or geometry code there.

- [`src/core/rendering/StudioWorkspace.ts`](src/core/rendering/StudioWorkspace.ts): studio navigation camera, shot view, live camera preview, model/pose controls, room controls and local document UI.
- [`src/core/rendering/StudioRoom.ts`](src/core/rendering/StudioRoom.ts): industrial room geometry, furniture, practical lights, batching and roof cutaway behavior.
- [`src/core/rendering/StudioSeat.ts`](src/core/rendering/StudioSeat.ts): pose-derived portrait chair and body contact.
- [`src/core/rendering/StudioProps.ts`](src/core/rendering/StudioProps.ts): objects the photographer can take hold of, claim, move and save.
- [`src/services/studioProps.ts`](src/services/studioProps.ts): what a prop is in a document, and how one is read back.
- [`src/services/sceneAnimation.ts`](src/services/sceneAnimation.ts): keyframes, interpolation and the timeline a document carries.
- [`src/core/rendering/studioGeometry.ts`](src/core/rendering/studioGeometry.ts): focal length conversion, exposure calculation, cyclorama and grid.
- [`src/core/rendering/photometry.ts`](src/core/rendering/photometry.ts): candela from fixture specs, inverse-square illuminance, ISO 2720 metering, modifier size and shadow-softness ratio.
- [`src/core/rendering/poseRig.ts`](src/core/rendering/poseRig.ts): editable joints, their axes and their ranges of motion.
- [`src/core/rendering/PoseEditor.ts`](src/core/rendering/PoseEditor.ts): joint handles, the constrained rotation gizmo, limb targets and joint read/write.
- [`src/core/rendering/limbIk.ts`](src/core/rendering/limbIk.ts): two-bone inverse kinematics for arms and legs.
- [`src/core/services/environmentService.ts`](src/core/services/environmentService.ts): environment state and room toggles.
- [`src/services/sceneCompressionService.ts`](src/services/sceneCompressionService.ts): lossless v2 document wrapper and legacy v1 reader.
- [`src/services/studioDocument.ts`](src/services/studioDocument.ts): Zod validation before mutating the scene.
- [`src/core/models/sceneComposer.ts`](src/core/models/sceneComposer.ts): shared scene/document types.

The main dataflows are:

```text
StudioWorkspace controls
  -> VirtualStudio callbacks in main.ts
  -> Babylon scene, character animation and cameras
  -> StudioRoom / StudioSeat focused geometry controllers

Save
  -> getCurrentSceneAsPreset
  -> lossless v2 JSON wrapper
  -> local download

Open
  -> decompress
  -> validate complete document
  -> clear current scene
  -> rebuild room, lights, camera, actors, poses and derived chair
```

The shooting camera is `VirtualStudio.camera`. `StudioWorkspace` owns a separate navigation camera and a low-resolution preview camera. Orbiting in Studio view must not alter the saved shooting shot. Helper meshes use their own layer/metadata and stay out of the shot and preview.

Camera exposure is preview calibration relative to ISO 100, f/2.8 and 1/125 s. It changes image-processing exposure. It must not silently change scene-light intensities. Longer focal lengths must narrow vertical FOV.

The industrial room uses metres and occupies approximately x = -8…8 and z = -9…8. Furniture and room practicals are independently switchable. Roof geometry remains visible to the taking camera but cuts away for high editor viewpoints.

### Light units and shadow softness

[`src/core/rendering/photometry.ts`](src/core/rendering/photometry.ts) holds the photographic units; it is pure arithmetic and unit-tested against ISO 2720 metering, so numbers are asserted rather than judged by eye.

- A continuous fixture's on-axis intensity comes from its published `lux1m`, or from `lumens` spread over the beam solid angle Ω = 2π(1 − cos(θ/2)).
- A strobe is read from its guide number instead: H = (C / S) · GN² lux·s at 1 m, so a flash meter reads f = GN / d at ISO 100. The catalogue's `lux1m` for a strobe usually describes its modelling lamp and would put a 1000 Ws head below a 300 W LED.
- `SCENE_INTENSITY_PER_CANDELA` is the one scene calibration constant, fixed on the Aputure LS 300d II (lux@1m = 45000 → scene intensity 450). The mapping is linear and never clamped. An earlier ceiling of 800 made every fixture above 8000 cd render identically.
- Every studio light uses `FALLOFF_PHYSICAL`, so illuminance is E = I / d². Doubling the distance costs exactly two stops.
- Shadow softness comes from the modifier's emitting size, not from a per-fixture constant. Rectangular sources collapse to the equal-area square, so a 30 × 120 cm stripbox stays crisper than a 90 × 120 cm softbox.
- All shadow generators go through `VirtualStudio.configureStudioShadowSoftness`, which uses contact hardening (PCSS) with `shadowMinZ = 0.2` and `shadowMaxZ = 20`. Do not set `blurKernel` or `usePercentageCloserFiltering` on a studio light: Babylon applies `blurKernel` only to the blur-exponential filters, which is why the old per-fixture kernel values had no effect.
- The default key/fill/rim rig is specified the way it is metered: a key reading at the subject plus the ratios around it (`RIG_KEY_ILLUMINANCE`, `RIG_KEY_TO_FILL`, `RIG_RIM_TO_KEY`). `placeFixtureForIlluminance` then gives each head its catalogue output and derives placement and output percentage from it, moving a fixture closer along its own aim line when the reading is beyond what it can give and dialling it back when it has light to spare. No fixture is ever driven past 100 %.
- Camera exposure remains image processing only, and a fixture's physical output never moves with ISO, aperture, shutter or ND. The one exception is real: a flash is over before the shutter closes, so shutter speed does not change how a strobe exposes. The frame has a single image-processing exposure that carries the shutter term for continuous light, so `updateSceneBrightness` multiplies flash fixtures by `flashShutterCompensation` to cancel it again. Their rendered contribution then depends on aperture and ISO alone.
- A strobe therefore sits several stops above a continuous fixture, and a mixed rig is correctly exposed for one of them at a time. That is the real photographic situation, not a bug. When the frame clips, `offerClippingScope` offers to open zebra or the histogram; it never changes the exposure or the lights. The photographer decides.

### Lighting looks, camera moves and the sequence

Three things are named rather than configured, so that someone who has never
lit anything can still set a scene. All three leave ordinary editable objects
behind — there are no locked presets.

- [`src/services/lightingLooks.ts`](src/services/lightingLooks.ts) describes
  lighting as a place: a kitchen at dinner, a street at night, a hospital room.
  A look is specified in stops — `keyStops` from the studio portrait key, and
  each fixture's `stops` below that key — never in scene units, so the ratios
  survive any change to the scene calibration. `VirtualStudio.applyLook` clears
  the rig and rebuilds it through `placeFixtureForIlluminance`, exactly as the
  default rig is built; `setupDefaultLighting` is now the `studio-portrett`
  look and delivers the readings it always did.
- A fixture marked `motivating` is a source meant to be seen: a lamp, a window,
  a candle. It is never relocated to make a level, because a table candle
  cannot be moved two metres closer. Its `stops` is a ceiling, and it burns at
  whatever it can give from where it stands. Practicals and atmospherics in the
  catalogue put out 20–1800 lux at a metre; asking one to key a face would hang
  it half a metre from the nose, which is what
  [`src/services/lightingLooks.test.ts`](src/services/lightingLooks.test.ts)
  asserts against.
- [`src/services/movePresets.ts`](src/services/movePresets.ts) does the same
  for motion: twelve camera moves and eight light moves, each building cues on
  the scene's own animation format. Camera travel is a share of the shot
  distance, so one button suits a tight portrait and a hangar alike.
- The panel in `StudioWorkspace` shows looks, moves and the resulting sequence
  in the right-hand rail, under the environment panel and the camera preview.
  Every button carries a plain explanation in its `title`, and the unit tests
  assert that none is missing. The groups are `<details>`: the panel opens as
  six summaries rather than thirty-one buttons, with the group the scene is
  already lit in standing open, and camera moves open because they are the
  common case. [`.claude/skills/virtual-studio/SKILL.md`](.claude/skills/virtual-studio/SKILL.md)
  records the interface rules these follow.

[`e2e/light-accuracy.spec.ts`](e2e/light-accuracy.spec.ts) is the reference scene: it places catalogue fixtures, asserts their output ratio in stops, checks the falloff and shadow settings, converts the shadow-map light-size ratio back to metres to confirm the penumbra is built from the modifier's real dimensions, verifies that shutter speed changes continuous exposure but not flash exposure, confirms the default rig still delivers the light its hand-tuned predecessor did, and checks that the clipping prompt offers a scope without touching the exposure.

## Local scene documents

Version 2 documents retain the complete `SceneComposition`, including:

- actor source path, height, transform, studio pose, joint edits and wardrobe;
- claimed objects and imported props under `studioProps`;
- the timeline under `animation`, in radians;
- light fixture ID, position, aim, output, beam settings and enabled state;
- taking-camera settings;
- industrial room type, furnishings and practical-light switches.

Validate an entire file before clearing the current scene. Maintain legacy v1 reading, but do not write new lossy compact documents. Schema changes must be optional or versioned, and require a round-trip unit test plus a browser save/open test.

## The native core

[`apple/VirtualstudioCore`](apple/README.md) holds the renderer-free arithmetic as
Swift packages: `Photometry`, `SceneDocument`, `PoseRig`, `LimbIK` and
`StudioContent`. It is the foundation of the native iPad edition, and it runs in
under a second with no simulator and no device.

The rule that makes it worth having: **a Swift port is checked against the
TypeScript implementation, not against fresh Swift tests.** Each module's numbers
and verdicts are generated from the TypeScript into a JSON fixture that both
suites read, so a divergence is a test failure in one language rather than a
discrepancy nobody notices. Regenerate deliberately after a real change:

```sh
UPDATE_FIXTURES=1 npm test -- fixtures
```

The document fixture matters most. Validation runs before the current scene is
cleared, so the two editions have to agree about every file: 23 documents that
must open, 27 that must not. Add a rule to `studioDocument.ts` and add a case to
the fixture in the same change.

`StudioContent` is the one exception to porting as Swift. The looks, places,
marks and moves are *tables*, so they are exported from the TypeScript into
`Sources/StudioContent/Resources/content.json` and decoded rather than restated —
one source of truth, and no mistyped azimuth that a test written from the same
typo would miss. Add a look in `lightingLooks.ts`, regenerate, and it is on both
platforms. Because `Codable` silently drops undeclared keys, a test re-encodes the
decoded catalogue and compares it against the file key by key; keep that test when
adding a field.

The pose fixture is next in weight: 816 clamp cases covering every joint against
four bone axes and twelve rotations. Two deliberate breakages were tried against
it — clamping a hinge in degrees instead of radians, and replacing a limb's
inherited bend plane with a fixed one — and both fail loudly, so the check has
teeth.

Swift's `Codable` drops fields it does not declare, which would break the
forward-compatibility rule above, so `StudioDocument` keeps the whole document as
a `JSONValue` tree and reads typed views out of it. Do not replace it with a
plain `Codable` struct.

## Verification

Use Node 22 in this repository. Node 26 caused Vitest memory failures in the current local environment.

```sh
scripts/aws/fetch-assets.sh models          # character GLBs are not in git
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm ci
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run build
python3 scripts/characters/validate_studio_characters.py
(cd apple/VirtualstudioCore && swift test)   # the native core; no simulator or device
PLAYWRIGHT_SOFTWARE_GL=1 PATH=/opt/homebrew/opt/node@22/bin:$PATH \
  npm run test:e2e -- e2e/studio-scene.spec.ts e2e/light-accuracy.spec.ts e2e/pose-editing.spec.ts \
    e2e/wardrobe.spec.ts e2e/studio-props.spec.ts e2e/scene-animation.spec.ts \
    e2e/lighting-looks.spec.ts e2e/move-panel.spec.ts e2e/panel-layout.spec.ts --workers=1
```

The character build is reproducible and takes about 11 seconds: the same sources produce byte-identical GLBs, so a changed hash means a changed input.

The software-WebGL browser tests are slow and are not a device-performance measurement. Between them they cover both GLBs, materials, hierarchy movement, views, exposure, seated body-to-chair contact, chair tracking/removal, failed-import recovery, live preview, 1920 × 1080 PNG export, local save/open, a tablet layout check, the lighting reference scene, and joint editing with its limits, grounding, reset and document round trip.

The local API backend is not running in this verification environment and `/api` returns HTTP 500. Do not claim backend-dependent projects, AI generation or cloud asset workflows are verified because the frontend scene test passes.

## Next implementation plan

Work in this order unless the user changes priorities:

1. **Photographic light accuracy.** *(Fixture output, falloff, shadow softness, the flash-versus-continuous exposure model and the default rig have landed; see "Light units and shadow softness".)* Remaining: measured penumbra comparisons, and bounce/soft-source approximation checked against reference renders rather than by eye.
2. **Editable posing.** *(Landed: seventeen joints, swing-and-twist limits, and hand/foot targets solved by two-bone inverse kinematics; see "Editable posing".)* Remaining: an elliptical cone that knows a shoulder is less free across the body than away from it, and self-intersection between limbs and torso.
3. **Broader real character variation.** *(Wardrobe is now a layer; see "Wardrobe as a layer".)* Remaining: body archetypes and the 50 figures built on them, using the pinned pack's 22 usable skins (six ethnicities across three ages), 10 hairstyles and 12 outfits. Garments are fitted per body shape, so a new archetype means refitting the wardrobe for it — keep the number of archetypes small and vary skin, hair, face and height freely on top. Add facial expression blend shapes only when the source and export path are verified.
4. **Studio object editing.** *(The general prop system and the timeline have landed; see "Objects on set" and "Movement".)* Remaining: give room furniture stable keys so individual pieces can be claimed, which means keeping them as separate meshes rather than batched; a panel for browsing and placing props; and a way to author a track for something other than a light, which today means editing the timeline by hand.
5. **Rendering references.** Add controlled portrait comparisons for key/fill/rim ratios, modifier size and camera exposure. Improve soft-source and bounce approximation based on measurements, not only visual tuning.
6. **iPad edition after the scene contract stabilizes.** Staged in [`docs/ipad-plan.md`](docs/ipad-plan.md). *(Landed: the false USD export is gone, and `Photometry`, `SceneDocument`, `PoseRig`, `LimbIK` and `StudioContent` are ported to Swift and checked against the TypeScript implementation through shared JSON fixtures — see [`apple/README.md`](apple/README.md).)* Remaining: the storyboard; a real USD export from the character builder; then the device measurement that decides RealityKit, RealityKit with a custom Metal shadow pass, or Metal. The shadow question is already partly answered: `SpotLightComponent.Shadow` has no properties, so a modifier's real size cannot drive the penumbra there.

Acceptance criteria for each feature should include a real workflow test, scene round-trip when state is persisted, resource cleanup after replacement and a screenshot or numeric result that demonstrates the intended photographic behavior.

## Known limits

- The two people are game-style anatomical characters, not high-resolution scans. There are two body shapes; the wardrobe is cut per shape, so a new shape needs its garments refitted.
- A garment is drawn over the body with the covered triangles removed. There is no cloth simulation and no collision, so an extreme pose can still push a limb through a sleeve.
- Seventeen joints can be posed within conventional ranges of motion, and hands and feet can be placed directly. The swing cone is circular, so a shoulder is allowed as far across the body as away from it, which a real shoulder is not. Limbs can still pass through the torso. Facial expressions remain future work.
- Inverse kinematics covers the two bones of a limb only. The spine, the shoulder blade and the hips are not carried along, so a reach beyond the arm's own span stops at the shoulder rather than leaning the body into it.
- Room furniture is batched geometry and cannot be claimed piece by piece yet. The portrait chair and imported models can.
- The timeline moves anything in the scene and is saved, but only a light can be keyframed from the interface. A track for a prop has to be written by hand today.
- Applying a lighting look rebuilds the whole rig: every fixture loads its stand and takes every mesh in the room as a shadow caster. It is a second or two on a GPU and much slower under software WebGL, so the panel disables its buttons and says what it is doing while it works.
- A document does not record which look it came from. It keeps the fixtures themselves, which may have been edited since, so an opened scene reports the lighting as the document's own rather than claiming a look it may no longer be.
- Fixture output, falloff and shadow softness now follow published specifications, but this is still a real-time approximation, not measured photometry or an offline path tracer.
- Flash exposure is modelled as independent of shutter speed, but flash duration itself is not simulated: motion is never frozen by a short burst, and high-speed sync, sync-speed limits and modelling-lamp contribution are not represented.
- Backend-dependent workflows require a separately running service and verification.
- There is no geometry export. The `ExporterService` stub that answered every format with an empty blob, and the USD/USDZ export that wrote element declarations with no vertex data and a `.usdz` extension on a `text/plain` blob, have both been removed rather than left to look like features. The character builder's GLB export is the real one, and a USD export belongs beside it.
- Native iPad behavior and performance have not been tested on hardware. The renderer-free core is ported and agrees with the web implementation; no native app, renderer or interface exists yet.

Keep claims in documentation and PRs aligned with those limits. The goal is steady progress toward a professional photographic planning tool, with every shipped capability demonstrably working.
