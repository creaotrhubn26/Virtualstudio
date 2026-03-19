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
- [ ] Støtte aktiv læring: når bruker flytter, bytter eller sletter props, bruk det som signal tilbake til `Asset Brain`.
- [x] Bygge et retrieval-endepunkt: `POST /api/environment/retrieve-assets`.

## Phase 2: Placement Engine v2

- [x] Bruke footprint, clearance og anchor-profiler under auto-plassering.
- [x] Finne bord-/counter-ankere for surface-props automatisk.
- [x] Unngå enkle overlappinger på gulv og på samme surface-anchor.
- [ ] Legge inn eksplisitt kollisjonssjekk med mesh-bounds, ikke bare footprint.
- [ ] Legge inn “snap to wall / floor / surface” med normale og offsets.
- [ ] Støtte relative relasjoner som `next_to`, `behind`, `stacked_on`, `under`, `facing`.
- [ ] Prioritere shot-aware plassering: hero-objekter i kameraets primære komposisjonsfelt.
- [ ] Bygge `POST /api/environment/assemble` som returnerer konkret scenegraph, ikke bare forslag.

## Phase 3: Image -> Layout

- [ ] Koble på `SAM 2` for promptbar segmentering av objekter/personer.
- [ ] Koble på `Depth Anything V2` for dybdekart og plane-estimering.
- [ ] Trekke ut layout-hints: veggflater, gulv, horisont, vanishing lines, avstander, høyder.
- [ ] Konvertere bildeanalyse til `LayoutHints`-JSON.
- [ ] Koble `LayoutHints` inn i planner og placement engine.
- [ ] Bygge `POST /api/environment/layout-from-image`.

## Phase 4: Lighting + Camera Auto-Rig

- [ ] Introdusere `LightingIntent` i planen: `hero_product`, `beauty`, `interview`, `dramatic`, `soft_daylight`, `noir`, `cyberpunk`.
- [ ] Generere faktisk lysrigg i runtime, ikke bare tekstlige cues.
- [ ] Legge inn AI-validering for separasjon, catchlights, highlight-kontroll og bakgrunnsratio.
- [ ] Støtte bevegelse i lyset via cue curves og behaviors:
  - `pulse`
  - `flicker`
  - `orbit`
  - `pan sweep`
  - `motivated practical animation`
- [ ] Koble lysbevegelse til eksisterende animation composer / light behavior-system.
- [ ] Bygge `POST /api/environment/auto-rig-lighting`.
- [ ] Bygge `POST /api/environment/auto-rig-camera`.

## Phase 5: Parametric Room Shell

- [ ] Erstatte fast 20x20-shell med parametrisk rombygger.
- [ ] Støtte bredde, dybde, høyde, taktype, åpninger, nisjer og modulære veggsegmenter.
- [ ] Støtte typene `interior_room`, `warehouse`, `storefront`, `abstract_stage`, `outdoor_illusion`.
- [ ] Bygge `POST /api/environment/build-shell`.
- [ ] Oppdatere diagnostics så faktisk shell-størrelse, åpninger og ankerflater er synlige i e2e.

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
- [ ] Bygge `POST /api/environment/validate`.

## Phase 8: Virtual Production Alignment

- [ ] Støtte USD/USDZ roundtrip.
- [ ] Legge inn locators for scene, props og kamera.
- [ ] Legge inn lens calibration, tracking og set-scan import.
- [ ] Koble compositing-signaler som mattes og holdout-objekter.

## Immediate Next Sprint

- [ ] Erstatte token-søk i `Asset Brain` med embedding-basert retrieval.
- [x] Lage en egen `scenegraph assembly`-modell som placement engine skriver til.
- [ ] Gjøre lysrigg om fra forslag til faktisk runtime-rigg.
- [ ] Bruke `roomShell`-data til å bygge ekte parametrisk geometri.
- [ ] Legge på en Playwright-regresjon for “AI -> shell -> props -> lys -> kamera -> diagnostics”.
