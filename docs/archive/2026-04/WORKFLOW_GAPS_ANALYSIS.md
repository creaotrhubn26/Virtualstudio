# Virtual Studio (Core) - Workflow Gap-analyse

**Dato:** 7. mars 2026  
**Scope:** Kun Core Virtual Studio (ikke Casting Planner-moduler).

## Kort konklusjon

Core Virtual Studio har tydelige workflow-gap på release-sikkerhet, data-konsistens og brukerfeedback ved degraderte tilstander.

Største risiko nå:

1. `npm run build` feiler med **2020 TypeScript-feil** i **233 filer**.
2. Det finnes ingen CI-gate som stopper røde builds.
3. Flere lagringsflyter signaliserer "lagret" selv når backend kan ha feilet.

## Hva som ble verifisert

- `npm test`: 1 testfil, 18 tester, grønn.
- `npm run build`: exit code `2`, `2020` TS-feil i `233` filer.
- Backend testkommando: `python -m pytest backend/test_flux_service.py -q` feiler med `No module named pytest`.
- Ingen `.github/workflows` funnet.

## Funksjonelle gap (Core Studio)

## 1) Accessibility-kontroll blir ikke mountet (høy)

**Evidens**
- `main.ts` prøver å mounte `accessible3DControlsRoot`.
- `index.html` inneholder ikke dette elementet.

**Impact**
- Del av tilgjengelighetsflyten blir ikke tilgjengelig i runtime.

**Tiltak**
- Enten legg inn manglende root i DOM, eller fjern/erstatt mount-logikken og vis tydelig fallback i UI.

## 2) Initialiseringsflyt kan maskere feil (høy)

**Evidens**
- Safety-timeout etter 10 sekunder tvinger loading til ferdig selv om init ikke er komplett.

**Impact**
- Bruker kan få inntrykk av at studio er klart, mens deler av oppsettet kan være i feiltilstand.

**Tiltak**
- Skill mellom "degradert startup" og "klar", og vis tydelig statusbanner med anbefalt handling.

## 3) Panel-funksjoner avhenger hardt av DOM-ID-er (middels/høy)

**Evidens**
- Én stor entrypoint monterer mange paneler med `getElementById` + manuelle listeners.

**Impact**
- Små markup-endringer i `index.html` kan gi skjulte funksjonsbrudd.

**Tiltak**
- Flytt panel-mounting til modulære entrypoints eller sentral registry med validering ved oppstart.

## Tekniske gap

## 1) Release-gate er brutt (kritisk)

**Evidens**
- `npm run build` feiler med 2020 TS-feil.

**Impact**
- Main branch er ikke pålitelig deploybar.

**Tiltak**
- Etabler "build must pass" som hard gate før merge.

## 2) Lagringsflyt kan gi falsk suksess (kritisk)

**Evidens**
- `settingsService.setSetting` oppdaterer cache først og ignorerer API-feilrespons.

**Impact**
- UI kan vise "lagret", mens backend ikke har persistet data.

**Tiltak**
- Krav om `response.ok` + eksplisitt error-path, med synlig status i UI.

## 3) Test og kvalitetsvern er for svakt (høy)

**Evidens**
- Kun én frontend testfil.
- Backend test-runner mangler i standardmiljø.

**Impact**
- Høy regressjonsrisiko ved endringer i core-flyt.

**Tiltak**
- Legg inn minimum smoke-suite for core studio + backend health i CI.

## 4) Monolittisk struktur og repo-støy (middels/høy)

**Evidens**
- `src/main.ts` ~27k linjer, `backend/main.py` ~9k linjer, `index.html` ~7k linjer.
- 27 `.bak`-filer og 17 `.tsx` på repo-root.

**Impact**
- Lav endringshastighet, vanskelig review og høy sideeffektrisiko.

**Tiltak**
- Modulér entrypoint/backend og fjern arkivfiler fra aktiv kodeflate.

## UX-gap

## 1) Degradert modus er ofte usynlig for bruker (høy)

**Evidens**
- Fallbacks håndteres hovedsakelig via `console.warn/error` i flere tjenester/paneler.

**Impact**
- Bruker får ikke tydelig signal om at data kan være lokale, usynket eller delvis.

**Tiltak**
- Innfør global statusindikator: `Online`, `Degraded`, `Offline cache`, med handlinger.

## 2) Notes-flyt prioriterer lokal suksess uten tydelig sync-status (middels/høy)

**Evidens**
- Notes oppdaterer lokal state/cache ved feil mot DB.

**Impact**
- Utydelig om notater faktisk er synket til backend.

**Tiltak**
- Vis sync-badge per notat/panel og tilby "retry sync".

## Prioritert handlingsplan

## P0 (0-3 dager)

1. Etabler CI-gate for `npm run test` + `npm run build`.
2. Fiks `settingsService` slik at API-feil ikke rapporteres som suksess.
3. Introduser global "degraded/offline"-status i UI.

## P1 (1-2 uker)

1. Del opp panel-mounting i mindre entrypoints med validering.
2. Legg til core smoke-tester (startup, lagring, notes sync).
3. Gjør backend test-runner tilgjengelig i standard utviklermiljø.

## P2 (2-6 uker)

1. Modulær oppdeling av `src/main.ts` og `backend/main.py`.
2. Rydd repo (fjern `.bak`, flytt root-komponenter til `src/`).
3. Definer tydelige modulgrenser for core studio vs øvrige domener.

## KPI-er

- `npm run build` = grønn (0 TS-feil).
- CI-passrate > 95% over 2 uker.
- Synlig andel "degraded/offline sessions" i telemetry.
- Redusert feilrate i lagring/synk-arbeidsflyt.

## Oppsummering

Fjerning av Casting Planner-fokus gjør bildet tydeligere: Core Virtual Studio trenger først og fremst release-stabilitet, ærlig lagringsstatus og mer robust startup/panel-arkitektur.
