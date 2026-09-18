# The iPad edition

`Virtualstudio` is the app; `VirtualstudioCore` is what it is built out of.

## The app

```sh
brew install xcodegen          # once
cd apple && xcodegen generate  # writes Virtualstudio.xcodeproj, which is gitignored
open Virtualstudio.xcodeproj
```

The project is described by [`project.yml`](project.yml) and generated, so the
repository carries the description and not a large plist that merge-conflicts on
every change.

It is at the stage the plan calls a measurement rather than a prototype: it puts
the bundled figure on a stage, dressed, lit by the same catalogue and the same
arithmetic the web studio uses, and reports what the device is doing while it
renders.

The figures are not in git. `scripts/aws/fetch-assets.sh models` brings them down;
without them the app still builds and runs and shows a box where she should be. It has
already answered two of the plan's four questions, both in the negative — see
[`../docs/measurements/README.md`](../docs/measurements/README.md).

Two launch arguments drive the comparison without a finger, because a measurement
that can only be taken by hand is a measurement that gets taken once:

```sh
xcrun simctl launch <udid> no.holycrust.virtualstudio --modifier "Snute 10 cm"
xcrun simctl launch <udid> no.holycrust.virtualstudio --stops -1
```

## The core

Swift packages holding the photographic and anatomical arithmetic of
Virtualstudio, and nothing else. No RealityKit, no Metal, no SwiftUI. This is
stage 1 of [`../docs/ipad-plan.md`](../docs/ipad-plan.md): de-risk the maths
before anyone decides how to draw it.

```sh
cd apple/VirtualstudioCore && swift test
```

No simulator, no device, no network. It runs in well under a second, so it can
run on every commit next to `npm test`.

## What is here

| Package | Ported from | Status |
|---|---|---|
| `Photometry` | `src/core/rendering/photometry.ts` | complete, 96 golden cases |
| `SceneDocument` | `src/services/studioDocument.ts` | validation complete, 50 golden documents |
| `PoseRig` | `src/core/rendering/poseRig.ts` | complete, 816 clamp cases plus the joint table |
| `LimbIK` | `src/core/rendering/limbIk.ts` | complete, 14 solved limbs |
| `StudioContent` | `studioLocations.ts`, `lightingLooks.ts`, `movePresets.ts` | complete: the catalogue as data, 234 placements, 48 cues |
| `Storyboard` | `src/services/storyboard.ts` | complete, 14 badly written boards |
| `StudioAssets` | the GLB the character builder writes | reader complete, checked against the real figure |

`StudioAssets` is the exception to "ported from TypeScript": there is nothing to
port, because the browser lets Babylon read the GLB. It exists because the plan's
USD step turned out to rest on a Blender scene that does not exist — the builder
writes glTF by hand — and because the wardrobe needs `LowLevelMesh.Part` whatever
the format. `visibleParts` turns a garment's 102 hidden triangle ranges into 103
parts over the buffer the figure already has, instead of rebuilding the buffer the
way the browser does.

That is the whole renderer-free core. `storyboardSheet.ts` stays where it is: it
writes HTML, and a call sheet on a device is a SwiftUI view, not a generated page.

## Why the tests read a JSON file

A Swift reimplementation checked only by fresh Swift tests would assert that
Swift agrees with itself. What has to be true is that **both editions agree with
each other**, because they share one document format: the same file has to
describe the same photograph on a laptop and on an iPad.

So each module's numbers are generated from the TypeScript implementation into a
JSON fixture that both test suites read:

```
src/core/rendering/photometry.fixtures.test.ts  ──generates──┐
                                                             ├─→ Tests/PhotometryTests/Fixtures/photometry.json
apple/.../PhotometryTests.swift  ──────────────────reads─────┘
```

Change the arithmetic on either side and one of the two suites fails. After a
deliberate change, regenerate:

```sh
UPDATE_FIXTURES=1 npm test -- fixtures
```

Regenerating is a decision, not a build step. The fixtures are in git, and a
diff on one of them is the record of a photographic change.

### What each fixture is for

**`documents.json` is the one that decides whether the plan works at all.** Validation runs *before
the current scene is cleared*, so a native app that accepts what the browser
refuses will open half a scene over someone's work, and one that refuses what
the browser writes will not open their own files at all. It carries 50
documents — 23 that must open and 27 that must not — and the Swift suite reaches
the same verdict on every one.

**`poseRig.json` is the anatomical correctness.** 816 clamp cases: each of the
seventeen joints, against four bone axes, against twelve rotations — resting,
folded, twisted, past its limit, a half turn, unnormalised, all zero, and not a
number at all. Quaternion code looks the same whatever it computes, which is
exactly why a port of it has to be checked against the original rather than
against fresh tests written from the same intuition. The table itself is pinned
too: the same joints in the same order, with the same limits, and each limb's
`bendSign` — an elbow folds forward and a knee folds back, which is invisible in
a unit test and obvious on screen.

**`limbIk.json` holds the two facts a port loses.** A limb must not lock
straight, and a solved limb must keep the bend plane its clip gave it or the
elbow flips behind the body. Both were tried as deliberate breakages against
these fixtures: clamping a hinge in degrees instead of radians fails 28
assertions, and replacing the inherited bend plane with a fixed one moves every
elbow by 2–4 cm and fails as well.

**`photometry.json` is the light.** Falloff, metering, guide numbers, and the
modifier sizes the penumbra is derived from.

## The catalogue is data, not transcribed code

`StudioContent` is the exception to "ported as Swift", and deliberately.

Twelve looks, five places with thirteen marks, twenty named moves: those tables
*are* the content of the product. Hand-copying them into Swift would buy nothing
and risk a mistyped azimuth that no test would catch, because the test would have
been written from the same typo. So the tables stay in TypeScript and are exported
into `Sources/StudioContent/Catalogue/content.json`, which the package carries as
a resource and decodes (the folder is not called `Resources` — a directory by that
name at a bundle's root collides with the bundle layout and `codesign` refuses the
result):

```
studioContent.fixtures.test.ts ──writes──→ Sources/StudioContent/Catalogue/content.json
                                                      │
                               StudioCatalogue.shipped ┘  (decoded, not restated)
```

Add a look on the web, regenerate, and it is on the iPad — the same label, the
same hint, the same stops. "Kjøkken · morgen" and "sitter ved bordet" mean the
same thing on both platforms rather than the iPad inventing separate content.

The risk this introduces is the opposite one: `Codable` decodes the keys it
declares and forgets the rest, so a field the Swift model forgot would vanish in
silence — a mark's `seatHeight`, and the figure sits on air. So one test
re-encodes the decoded catalogue and compares it against the file key by key.
Removing `normalBias` from the model was tried on purpose: it names all fourteen
places the field went missing.

The arithmetic *around* the tables is ported as code and pinned as usual: 234
resolved fixture positions (every look's working lights, three subject heights,
three camera angles, walked inside the walls and swung clear of the lens) and 48
built cues. Flipping one pan's turn direction fails five assertions.

## Two divergences the fixtures caught

Both in `Storyboard`, and both worth recording, because they are the kind of
thing a port loses in silence.

**An array was a shot.** `typeof [] === 'object'` and an array is truthy, so
`parseShot`'s `typeof` check let a stray array through: `{ shots: [[]] }` came
back with a fully defaulted "Opptak 1" on the board, camera and all, ready to be
printed on a call sheet and handed to somebody. Swift dropped it, because an
array is not a dictionary there. The fixture disagreed, and **the TypeScript was
the one that was wrong** — it now uses an `isRecord` guard.

**`printf` is not `toFixed`.** JavaScript rounds a tie to the larger value; C
rounds it to even. A 6.25-second shot reads "6,3 s" in the browser and would have
read "6,2 s" through `String(format:)` — the same shot, two different sheets, and
nobody would ever look for the cause there. `Storyboard.toFixed` implements
JavaScript's rule, and the rounding cases are generated from the TypeScript so
they cannot drift.

Text limits are counted in UTF-16 units for the same reason:
`String.prototype.slice` counts them that way, so a direction with 200 fire emoji
in it is cut to 240 units — 120 emoji — on both, rather than 240 characters on
one and 240 units on the other.

## Two places the Swift deliberately differs

- **Unknown fields.** The web validator uses Zod's `passthrough`, so a field a
  newer version invented survives an older reader. A Swift `Codable` struct drops
  what it does not declare, which would silently destroy work. `StudioDocument`
  therefore keeps the whole document as a `JSONValue` tree and reads typed views
  out of it. A re-encoded document is *equal* to the original, not byte-identical:
  object key order is not preserved, and nothing else changes.
- **Errors say which field was wrong.** The web version throws one Norwegian
  sentence, which is all a file picker needed. On a device the photographer is
  standing in the room with the file, so the failed state has to say something
  they can act on.

## One number that is not portable

`SCENE_INTENSITY_PER_CANDELA` is calibrated against the Aputure LS 300d II for
the web renderer. A native renderer's intensity unit is not that one and will
need its own constant, measured the same way — against a single known fixture,
linearly, with no ceiling. It is kept in `Photometry` so both calibrations are
stated in the same file, and so a document written by either edition means the
same light.
