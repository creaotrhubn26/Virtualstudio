# The native core

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

Still to come: the storyboard and its call sheets. `storyboard.ts` is portable
the same way; `storyboardSheet.ts` writes HTML, which a native app would not use
— a call sheet there is a SwiftUI view, not a generated page — so it stays where
it is.

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
into `Sources/StudioContent/Resources/content.json`, which the package carries as
a resource and decodes:

```
studioContent.fixtures.test.ts ──writes──→ Sources/StudioContent/Resources/content.json
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
