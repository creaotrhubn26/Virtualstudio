# src/main.ts split plan

`src/main.ts` is 35,974 lines and mounts 30 React islands via `createRoot()`.
All 30 call sites are nearly identical (`getElementById` → `createRoot` →
`render`). The audit flagged this file as the single biggest maintainability
blocker — any merge collides, no island can be code-reviewed in isolation.

## Pattern (established, see `src/bootstrap/`)

1. `src/bootstrap/mount.ts` — shared helper. Exports `mountIsland(id, loader, props?)`
   which checks whether `id` exists, dynamically imports the component via
   `loader()`, and mounts via `createRoot().render()`. Keeps a `Map` of active
   roots so a repeat call is idempotent.
2. `src/bootstrap/mount-<island>.ts` — one per island. Owns the dynamic
   import call so the chunk is only downloaded when the DOM container is
   actually present.
3. Inline callsite in `main.ts` becomes one line:
   `mount<Island>().catch((err) => console.error(...))`.

## Extracted (POC)

- `mount-story-character-hud.ts` → `#storyCharacterHudRoot`. Was 6 lines inline;
  now 1 line call + a focused 12-line module. Build passes (`npm run build`).

## Remaining 29 islands

Extract in this order (batch by bundle weight — move the heavy ones first to
maximise lazy-loading win):

| # | Container ID | App export | Approx weight | main.ts line (pre-split) |
| :-: | --- | --- | --- | --- |
| 1 | `keyframeTimelineRoot` | `TidslinjeLibraryPanelApp` | small | ~32494 |
| 2 | `assetLibraryRoot` | `AssetLibraryApp` | medium | ~32500 |
| 3 | `characterLoaderRoot` | `CharacterLoaderApp` | medium | ~32506 |
| 4 | `lightsBrowserRoot` | `LightsBrowserApp` | **74 kB** | ~32512 |
| 5 | `cameraGearRoot` | `CameraGearApp` | small | ~32518 |
| 6 | `hdriPanelRoot` | `HDRIPanelApp` | small | ~32524 |
| 7 | `equipmentPanelRoot` | `EquipmentPanelApp` | small | ~32530 |
| 8 | `scenerPanelRoot` | `ScenerPanelApp` | **139 kB** | ~32536 |
| 9 | `notesPanelRoot` | `NotesPanelApp` | **383 kB** | ~32542 |
| 10 | `cinematographyPatternsRoot` | `CinematographyPatternsApp` | medium | ~32549 |
| 11 | `lightPatternLibraryRoot` | `LightPatternLibraryApp` | medium | ~32556 |
| 12 | `avatarGeneratorRoot` | `AvatarGeneratorApp` | **68 kB** | ~32563 |
| 13 | `aiAssistantPanelRoot` | `AIAssistantApp` | medium | ~32571 |
| 14 | `assetBrowserPanelRoot` | `AssetBrowserPanelApp` | — | ~32582 |
| 15 | `marketplacePanelRoot` | `MarketplacePanelApp` | **67 kB** | ~32591 |
| 16 | `sceneComposerRoot` | `SceneComposerPanelApp` | **94 kB** | ~32601 |
| 17 | `animationComposerRoot` | `AnimationComposerApp` | medium | ~32611 |
| 18 | `virtualStudioProRoot` | `VirtualStudioProApp` | medium | ~32621 |
| 19 | `interactiveElementsRoot` | `InteractiveElementsBrowserApp` | medium | ~32631 |
| 20 | `ambientSoundsRoot` | `AmbientSoundsBrowserApp` | small | ~32639 |
| 21 | `storyCharacterHudRoot` | `StoryCharacterHUDApp` | small | **✓ EXTRACTED** |
| 22 | `accessoriesPanelRoot` | `AccessoriesPanelApp` | small | ~32655 |
| 23 | `posingPanelRoot` | `PosingModePanelApp` | small | ~32665 |
| 24 | `gelPickerRoot` | `GelPickerApp` | small | ~32673 |
| 25 | `outdoorLightingRoot` | `OutdoorLightingApp` | small | ~32681 |
| 26 | `cinematicEvalRoot` | `CinematicEvaluationApp` | medium | ~32689 |
| 27 | `accessible3DControlsRoot` | `Accessible3DControlsApp` | small | ~35231 |
| 28 | `actorPanelRoot` | (see line 35357) | — | ~35357 |
| 29 | `loading-overlay-root` | `LoadingOverlay` | small | ~32082 |
| 30 | `keyframeTimelineRoot` duplicate? | `KeyframeTimeline` | — | check at 32496 |

## Chunks that need attention

The current build emits these oversize panels (>50 kB):

| Chunk | gzip | Notes |
| --- | --- | --- |
| `main-*.js` | 514 kB | main.ts + all eagerly-imported services. Splitting mounts alone won't fix this — also need to remove the top-of-file eager `from './App'` imports and let each mount-file do its own dynamic import. |
| `babylon-core-*.js` | 1.3 MB | Babylon is inherently large. Already in its own chunk via `rollupOptions.output.manualChunks`. Safe to leave. |
| `NotesPanel-*.js` | 122 kB | Contains Monaco editor; already lazy — no action. |

## Lift remaining work into App.tsx

`src/App.tsx` re-exports 30 `<X>App` React.FC wrappers (lines 150-1000+).
Each is a Suspense + ToastProvider + CustomThemeProvider + `<LazyPanel />`.
Once every mount-`<id>` file owns its own `import('../panels/X')`, those
re-exports become dead weight in the eager import at `main.ts` line 6.

To actually shrink the `main-*.js` chunk (the real goal):

1. Finish extracting all 30 mounts.
2. Replace `main.ts` line 6 (the mega-import from `./App`) with only what's
   still used outside of bootstrap. Likely only `App` itself and the root
   `AppContent` — everything else goes through dynamic imports.
3. Consider whether `App.tsx` itself should split: each `<X>App` moves to
   `src/apps/<X>App.tsx`, and `App.tsx` stays as the root `<AppContent>`.

Expected outcome: main chunk drops from 514 kB gzip to <150 kB. Cold-load
time for a user who only opens one panel should drop proportionally.
