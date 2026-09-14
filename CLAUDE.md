# Virtualstudio: continuation guide

This file is the working context for continuing Virtualstudio with Claude or another coding agent. Read it before changing the scene, characters, lighting or document format. The detailed implementation audit and iPad assessment are in [`docs/studio-scene-and-ipad.md`](docs/studio-scene-and-ipad.md).

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
3. Fit CC0 clothing and shoes to the morphed body through their barycentric bindings. Delete covered body vertices to prevent skin from showing through clothes.
4. Transfer and normalize skin weights, retaining at most four joint influences per vertex for GLTF compatibility.
5. Export the 53-joint `game_engine` skeleton with Mixamo-compatible joint names and inverse bind matrices.
6. Preserve separate surfaces for skin, clothing, shoes, eyes and alpha-cutout hair. Embed albedo, normal and occlusion textures in each GLB.
7. Export `StudioStand`, `StudioPortrait` and `StudioSeated` as complete fixed-pose animation clips. Every clip writes every joint rotation so switching poses resets cleanly.
8. Solve the seated arms from actual limb lengths so the hands rest on the thighs instead of floating beside the body.

The generated runtime files are:

- `public/models/avatars/studio/studio-woman.glb`
- `public/models/avatars/studio/studio-man.glb`

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

### Seated contact and chair

[`src/core/rendering/StudioSeat.ts`](src/core/rendering/StudioSeat.ts) creates the leather and chrome portrait chair only for `StudioSeated`:

1. `applyStudioPose` updates skin matrices and grounds the shoes at approximately 0.016 m.
2. `StudioSeat` reads skinned body and clothing positions near `mixamorigHips`.
3. It finds the lower rear pelvis contact patch and uses that world-space height as the cushion top.
4. The pedestal changes height to meet the body; the character is not moved off the grounded pose.
5. A render observer follows the character root, including translation and yaw.
6. Switching to a standing pose or disposing the character removes the chair and observer.

The chair is derived from the character pose. A saved actor with `studioPose: "StudioSeated"` recreates it after document load. The chair is currently not an independently editable prop; making it editable requires an explicit ownership and serialization design.

## Scene architecture

The renderer is concentrated in a large legacy [`src/main.ts`](src/main.ts). Extend it carefully and move self-contained new behavior into focused modules instead of adding more unrelated UI or geometry code there.

- [`src/core/rendering/StudioWorkspace.ts`](src/core/rendering/StudioWorkspace.ts): studio navigation camera, shot view, live camera preview, model/pose controls, room controls and local document UI.
- [`src/core/rendering/StudioRoom.ts`](src/core/rendering/StudioRoom.ts): industrial room geometry, furniture, practical lights, batching and roof cutaway behavior.
- [`src/core/rendering/StudioSeat.ts`](src/core/rendering/StudioSeat.ts): pose-derived portrait chair and body contact.
- [`src/core/rendering/studioGeometry.ts`](src/core/rendering/studioGeometry.ts): focal length conversion, exposure calculation, cyclorama and grid.
- [`src/core/rendering/photometry.ts`](src/core/rendering/photometry.ts): candela from fixture specs, inverse-square illuminance, ISO 2720 metering, modifier size and shadow-softness ratio.
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

[`e2e/light-accuracy.spec.ts`](e2e/light-accuracy.spec.ts) is the reference scene: it places catalogue fixtures, asserts their output ratio in stops, checks the falloff and shadow settings, converts the shadow-map light-size ratio back to metres to confirm the penumbra is built from the modifier's real dimensions, verifies that shutter speed changes continuous exposure but not flash exposure, confirms the default rig still delivers the light its hand-tuned predecessor did, and checks that the clipping prompt offers a scope without touching the exposure.

## Local scene documents

Version 2 documents retain the complete `SceneComposition`, including:

- actor source path, height, transform and studio pose;
- light fixture ID, position, aim, output, beam settings and enabled state;
- taking-camera settings;
- industrial room type, furnishings and practical-light switches.

Validate an entire file before clearing the current scene. Maintain legacy v1 reading, but do not write new lossy compact documents. Schema changes must be optional or versioned, and require a round-trip unit test plus a browser save/open test.

## Verification

Use Node 22 in this repository. Node 26 caused Vitest memory failures in the current local environment.

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm ci
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run build
python3 scripts/characters/validate_studio_characters.py
PLAYWRIGHT_SOFTWARE_GL=1 PATH=/opt/homebrew/opt/node@22/bin:$PATH \
  npm run test:e2e -- e2e/studio-scene.spec.ts e2e/light-accuracy.spec.ts --workers=1
```

The software-WebGL browser test is slow and is not a device-performance measurement. It covers both GLBs, materials, hierarchy movement, views, exposure, seated body-to-chair contact, chair tracking/removal, failed-import recovery, live preview, 1920 × 1080 PNG export, local save/open and a tablet layout check.

The local API backend is not running in this verification environment and `/api` returns HTTP 500. Do not claim backend-dependent projects, AI generation or cloud asset workflows are verified because the frontend scene test passes.

## Next implementation plan

Work in this order unless the user changes priorities:

1. **Photographic light accuracy.** *(Fixture output, falloff, shadow softness, the flash-versus-continuous exposure model and the default rig have landed; see "Light units and shadow softness".)* Remaining: measured penumbra comparisons, and bounce/soft-source approximation checked against reference renders rather than by eye.
2. **Editable posing.** Add constrained joint manipulation on top of the 53-joint rig, starting with head, spine, shoulders, elbows, hands, hips and knees. Keep the three fixed poses as reliable reset states. Prevent impossible limb ranges and floor penetration.
3. **Broader real character variation.** Extend the offline builder with visibly distinct, licensed body proportions, ages, skin textures, hair and clothing. Every catalogue card must point to an actual different asset. Add facial expression blend shapes only when the source and export path are verified.
4. **Studio object editing.** Promote selected furniture, including the portrait chair, into scene-owned editable props with clear character-seat attachment state. Serialize ownership and transforms without duplicating the derived chair on load.
5. **Rendering references.** Add controlled portrait comparisons for key/fill/rim ratios, modifier size and camera exposure. Improve soft-source and bounce approximation based on measurements, not only visual tuning.
6. **iPad prototype after the scene contract stabilizes.** Reuse the same source character data and scene schema, export USDZ offline, and test SwiftUI + RealityKit on a physical target iPad. Measure frame time, memory and sustained thermal behavior before choosing RealityKit alone or custom Metal rendering.

Acceptance criteria for each feature should include a real workflow test, scene round-trip when state is persisted, resource cleanup after replacement and a screenshot or numeric result that demonstrates the intended photographic behavior.

## Known limits

- The two people are game-style anatomical characters, not high-resolution scans.
- There are three dependable fixed poses; arbitrary pose editing and facial expressions remain future work.
- The room furniture is a fixed environment preset except for the pose-derived chair.
- Fixture output, falloff and shadow softness now follow published specifications, but this is still a real-time approximation, not measured photometry or an offline path tracer.
- Flash exposure is modelled as independent of shutter speed, but flash duration itself is not simulated: motion is never frozen by a short burst, and high-speed sync, sync-speed limits and modelling-lamp contribution are not represented.
- Backend-dependent workflows require a separately running service and verification.
- Native iPad behavior and performance have not been tested on hardware.

Keep claims in documentation and PRs aligned with those limits. The goal is steady progress toward a professional photographic planning tool, with every shipped capability demonstrably working.
