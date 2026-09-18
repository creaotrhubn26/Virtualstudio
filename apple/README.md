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

Still to come, in the order the plan gives them: `PoseRig`, `LimbIK`,
`StudioContent` (looks, moves, locations, marks, storyboard).

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
UPDATE_FIXTURES=1 npm test -- photometry.fixtures
UPDATE_FIXTURES=1 npm test -- studioDocument.fixtures
```

Regenerating is a decision, not a build step. The fixtures are in git, and a
diff on one of them is the record of a photographic change.

The document fixture is the more important of the two. Validation runs *before
the current scene is cleared*, so a native app that accepts what the browser
refuses will open half a scene over someone's work, and one that refuses what
the browser writes will not open their own files at all. It carries 50
documents — 23 that must open and 27 that must not — and the Swift suite reaches
the same verdict on every one.

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
