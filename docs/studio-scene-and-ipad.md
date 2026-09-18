# Studio scene and iPad assessment

The immediate issue was the character/rendering pipeline. Changing platform would leave the same underlying asset and hierarchy problems. This change replaces the default astronaut demo with two anatomical figures and makes a practical studio workflow available in the existing application. The supplied industrial-studio image also guides a new furnished 3D room.

## What the existing application already contains

Repository inspection found a React/TypeScript application with Babylon.js as the main studio renderer. `src/main.ts` owns the scene, lights, shooting camera, character loading and much of the input handling. React panels expose a large collection of existing features:

- Light fixtures and modifiers, stand controls, colour temperature, power and aiming.
- Scene hierarchy, model/prop import, backdrops and environment controls.
- Focal length, exposure, focus/DOF, scopes and monitor cameras.
- Character rigs, pose/animation tools, story loading and scene composition.
- A 2D lighting plan, measurement tools, PNG/PDF export and rental lists.
- Backend-dependent projects, asset services, AI generation and scene direction.

Presence in the repository is not proof that every feature works. The scene workflow below is exercised in the browser. Backend workflows require their own running services; the local frontend currently receives HTTP 500 from `/api` because that backend is unavailable.

## Implemented changes

- **Figures:** two locally built anatomical GLBs, 53-joint skinning, real eyes and hair, fitted clothing, embedded colour/normal/occlusion maps and three studio poses. See [asset provenance](../public/models/avatars/studio/PROVENANCE.md).
- **Import correctness:** preserve glTF conversion nodes, texture atlases, material properties, cutout hair and complete mesh hierarchies. Move the common character root instead of separating skin from clothing. Ground poses after the skin matrices update. Release old materials, textures, skeletons and animation groups when replacing the character. A failed import reports failure and retains the previous model.
- **Usable catalogue:** the adult model entries point to the actual bundled figures. The character panel omits missing age/body-type files and the fifty repeated demo variants that were presented as distinct models.
- **Surroundings:** a 16 × 17 m industrial interior with concrete walls, I beams, overhead rails, sofa, coffee table, plant, dressing station, clothes rail, equipment cart and cables. Furniture and the two warm room lights are independently switchable. Roof geometry cuts away in elevated editor views. Static parts are batched by material. These are modeled surfaces; the reference image is not pasted behind the scene.
- **Portrait chair:** choosing “Sitt på portrettstol” applies the seated skeleton pose and creates a real leather-and-chrome chair. Its adjustable pedestal fits the actual skinned pelvis after the feet have been grounded. It follows the model when the model moves, disappears for standing poses, and is reconstructed from a saved seated setup.
- **Local documents:** save/open a JSON studio setup containing the anatomical model source, pose, light fixture type, aiming and power, camera settings and room options. Validate the file before clearing the current scene. Version 2 serialization retains complete scene data, while legacy compact files remain readable.
- **Scene:** a continuous matte cyclorama with tangent-continuous floor and wall joins, neutral floor, daylight key/fill/rim setup and reduced shadow offsets for facial detail.
- **Camera:** separate navigation and shooting cameras; studio, camera, top, front and side views; live 16:9 camera preview; direct portrait/full-body framing; metre grid and optional 2D plan. Orbiting the studio preserves the shooting camera.
- **Optics:** longer focal lengths now narrow the field of view. Camera exposure changes preserve actual light output. The exposure baseline is a preview calibration at ISO 100, f/2.8 and 1/125 s, not a measured camera response curve.
- **Rendering:** neutral default image processing. Artistic effects are optional. Final mode uses higher MSAA and direct export; the old timer-based “progressive rendering” progress indicator has been removed because it did not accumulate rendered samples.

## iPad recommendation

Superseded by [`ipad-plan.md`](ipad-plan.md), which is staged and grounded in the
installed iOS SDK rather than in expectations about it. Two paragraphs here were
wrong in a way worth recording: the eight-light figure in Apple's documentation
describes lit lights, not shadow-casting ones, and RealityKit turns out to expose
no control over shadow softness at all — `SpotLightComponent.Shadow` has no
properties. The recommendation to keep the web editor and reuse the character
source pipeline and the scene document still stands, and is the foundation of
that plan.

## Remaining distance to set.a.light 3D

The reference includes configurable human models, light modifiers, camera simulation, rooms and reusable setups. [Official feature overview](https://www.elixxier.com/en/set-a-light-3d/technique-and-features/).

This implementation establishes real figures and a more useful scene workflow. It does not claim parity with the reference. Remaining work includes a broader character library and facial expressions, calibrated fixture/modifier photometry, area-light shadow accuracy and indirect/bounce lighting, validated animation retargeting, and device-specific performance work. The current eye and hair geometry is suitable for a game-style character, not a high-resolution scan or a full cinematic skin/eye shader.

## Verification

The repeatable checks are:

```sh
npm test
npm run build
python3 scripts/characters/validate_studio_characters.py
PLAYWRIGHT_SOFTWARE_GL=1 npm run test:e2e -- e2e/studio-scene.spec.ts --workers=1
```

Use `PLAYWRIGHT_MANAGED_SERVER=0` if a dev server already runs on port 5173. `PLAYWRIGHT_SOFTWARE_GL=1` is for machines without working hardware WebGL; it is not an iPad performance benchmark. Playwright now uses its installed Chromium when the old Replit-specific executable does not exist.

The browser test exercises both actual GLBs, preserved material maps, model-root movement, view switching, seated body-to-chair contact, chair tracking and removal, pose restoration from a local document, photographic exposure stops, resource cleanup, failed-import recovery, live preview pixels and 1920×1080 camera export. Screenshots are written into the Playwright test output directory. TypeScript and all 111 unit tests pass under Node 22. Production build completes with the repository's existing large-chunk warnings.
