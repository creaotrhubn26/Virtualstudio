# AI Worldbuilding Task List

## Product Goal

Brukeren skal kunne beskrive en scene med tekst, referansebilde eller Genie-lignende world sketch, og få et faktisk byggbart 3D-miljø med riktig rom, riktige props, lys, kamerarigg og en evaluert preview.

## Phase 1: Asset Brain

- [x] Etablere et eksplisitt `Asset Brain`-lag for props, vegger og gulv.
- [x] Legge inn søkbar metadata for kategori, tags, stil, mood, romtype, plassering og footprint.
- [x] Eksponere `placementProfile` for hver prop med `ground | wall | surface`, clearance og anchor-rolle.
- [x] Koble `Asset Brain` inn i `environmentPropMapper` som robust fallback.
- [x] Legge inn lokal embedding-index for assets, ikke bare token-søk.
- [x] Lagre bruksscore, scene-kontekstscore og “assets that work well together”.
- [x] Støtte aktiv læring: når bruker flytter, bytter eller sletter props, bruk det som signal tilbake til `Asset Brain`.
- [x] Bygge et retrieval-endepunkt: `POST /api/environment/retrieve-assets`.

## Phase 2: Placement Engine v2

- [x] Bruke footprint, clearance og anchor-profiler under auto-plassering.
- [x] Finne bord-/counter-ankere for surface-props automatisk.
- [x] Unngå enkle overlappinger på gulv og på samme surface-anchor.
- [x] Legge inn eksplisitt kollisjonssjekk med mesh-bounds, ikke bare footprint.
- [x] Bruke `layoutGuidance` for surface-props, ikke bare gulv- og veggprops.
- [ ] Legge inn “snap to wall / floor / surface” med normale og offsets.
- [x] Støtte relative relasjoner som `next_to`, `behind` og `facing`.
- [ ] Utvide relative relasjoner med `stacked_on` og `under`.
- [x] Prioritere shot-aware plassering: hero-objekter i kameraets primære komposisjonsfelt.
- [x] Bygge `POST /api/environment/assemble` som returnerer konkret scenegraph, ikke bare forslag.

## Phase 3: Image -> Layout

- [ ] Koble på `SAM 2` for promptbar segmentering av objekter/personer.
- [ ] Koble på `Depth Anything V2` for dybdekart og plane-estimering.
- [x] Gjøre layout-tjenesten provider-basert med `auto | heuristics | sam2_depth`.
- [x] Normalisere separate `SAM 2`-/depth-svar til strukturerte layout-signaler som `detectedOpenings`, `objectAnchors`, `surfacePolygons` og `visiblePlaneConfidence`.
- [x] Trekke ut layout-hints: veggflater, gulv, horisont, vanishing lines, avstander, høyder.
- [x] Konvertere bildeanalyse til `LayoutHints`-JSON.
- [x] Koble `LayoutHints` inn i planner og placement engine.
- [x] Bruke `objectAnchors` til å styre surface-/wall-placement og karakterplassering når referansebildet gir tydelige ankere.
- [x] Bygge `POST /api/environment/layout-from-image`.

## Phase 4: Lighting + Camera Auto-Rig

- [x] Introdusere `LightingIntent` i planen: `hero_product`, `beauty`, `interview`, `dramatic`, `soft_daylight`, `noir`, `cyberpunk`.
- [x] Rigge kamera i runtime fra `shotType`, hero-prop og room shell.
- [x] Generere faktisk lysrigg i runtime, ikke bare tekstlige cues.
- [x] Gjøre lysriggen layout-aware, så key/fill/background-lys følger hero- og bakgrunnssoner.
- [ ] Legge inn AI-validering for separasjon, catchlights, highlight-kontroll og bakgrunnsratio.
- [x] Støtte bevegelse i lyset via cue curves og behaviors:
  - `pulse`
  - `flicker`
  - `orbit`
  - `pan sweep`
  - `motivated practical animation`
- [ ] Koble lysbevegelse til eksisterende animation composer / light behavior-system.
- [ ] Bygge `POST /api/environment/auto-rig-lighting`.
- [ ] Bygge `POST /api/environment/auto-rig-camera`.

## Phase 5: Parametric Room Shell

- [x] Erstatte fast 20x20-shell med første parametriske rombygger.
- [x] Støtte bredde, dybde, høyde, taktype, åpninger, nisjer og modulære veggsegmenter.
- [x] Legge inn første runtime-støtte for `ceilingStyle` og modulære `wallSegments`.
- [x] Legge inn nisjer som første modulære veggdetalj i planner, shell-builder og runtime.
- [x] Støtte typene `interior_room`, `warehouse`, `storefront`, `abstract_stage`, `outdoor_illusion`.
- [x] Bygge `POST /api/environment/build-shell`.
- [x] Oppdatere diagnostics så faktisk shell-størrelse er synlig i e2e.
- [x] Utvide diagnostics med åpninger og shell-tilbehør i e2e.

## Phase 6: Missing Asset Generation

- [ ] Legge inn “retrieval first, generation second”.
- [ ] Når retrieval feiler, sende objektbrief til `Rodin` eller `Hunyuan3D`.
- [ ] Normalisere skala, pivot, materialer og thumbnail etter generering.
- [ ] Registrere nye assets automatisk inn i `Asset Brain`.
- [ ] Bygge `POST /api/environment/generate-missing-assets`.

## Phase 7: Evaluation Loop

- [ ] Rendre preview-frame etter assembly.
- [ ] Sammenligne preview mot prompt eller referansebilde med VLM.
- [ ] Scorer:
  - prompt fidelity
  - composition match
  - lighting intent match
  - collision / floating / clipping
  - room realism
- [ ] Auto-iterere scene til scoren er over terskel eller budsjettet er brukt opp.
- [x] Bygge `POST /api/environment/validate`.

## Phase 8: Virtual Production Alignment

- [ ] Støtte USD/USDZ roundtrip.
- [ ] Legge inn locators for scene, props og kamera.
- [ ] Legge inn lens calibration, tracking og set-scan import.
- [ ] Koble compositing-signaler som mattes og holdout-objekter.

## Immediate Next Sprint

- [ ] Erstatte token-søk i `Asset Brain` med embedding-basert retrieval.
- [x] Lage en egen `scenegraph assembly`-modell som placement engine skriver til.
- [x] Gjøre lysrigg om fra forslag til faktisk runtime-rigg.
- [x] Bruke `roomShell`-data til å bygge første modulære parametriske geometri for nisjer, takbehandling og veggsegmenter.
- [x] Legge på en Playwright-regresjon for “AI -> shell -> props -> lys -> kamera -> diagnostics”.
