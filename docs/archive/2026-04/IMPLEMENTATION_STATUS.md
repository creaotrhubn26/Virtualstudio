# Produksjonskalender-Integrasjon - Implementeringsstatus

## ✅ Ferdig implementert

### 1. Helper-funksjoner i productionPlanningService.ts
- ✅ `getProductionDayForShotList()` - Henter ProductionDay for en ShotList
- ✅ `calculateAvailableTime()` - Kalkulerer tilgjengelig tid i produksjonsdagen (minutter)
- ✅ `calculateEstimatedTime()` - Kalkulerer estimert tid for shots (minutter)
- ✅ `calculateActualTime()` - Kalkulerer faktisk tid brukt på ferdige shots
- ✅ `isTimePressureMode()` - Sjekker om time pressure mode skal aktiveres
- ✅ `calculateDeadline()` - Kalkulerer deadline basert på ProductionDay
- ✅ `getShotsForProductionDay()` - Henter alle shots for en produksjonsdag
- ✅ `calculateDayTimeEstimate()` - Komplett tidsestimering per dag

### 2. CastingShotListPanel oppdateringer
- ✅ Henter ProductionDays sammen med ShotLists
- ✅ Mapper ShotLists til ProductionDays via sceneId
- ✅ State management for production days og mappings

## 🚧 Neste steg (TODO)

### 3. Vis ProductionDay-info i Shot List Cards
- [ ] Legg til ProductionDay-info i shot list card header
- [ ] Vis dato, callTime, wrapTime
- [ ] Vis status (planned, in_progress, completed)
- [ ] Legg til badge/indikator for ProductionDay

### 4. TimeAwareHeader komponent
- [ ] Lage ny TimeAwareHeader komponent
- [ ] Vis tilgjengelig tid (wrapTime - nåværende tid)
- [ ] Vis estimert tid for shots
- [ ] Vis time pressure indicator
- [ ] Vis deadline countdown
- [ ] Integrere i InteractiveShotListView

### 5. Oppdater InteractiveShotListView
- [ ] Hent ProductionDay for shot list
- [ ] Vis ProductionDay-info i header
- [ ] Aktiver time pressure mode basert på ProductionDay
- [ ] Vis deadline countdown
- [ ] Oppdater timer basert på wrapTime

### 6. Tidsestimering per ProductionDay
- [ ] Vis total tidsestimering per dag (ikke bare per shot list)
- [ ] Vis progress per produksjonsdag
- [ ] Fargekode basert på time pressure
- [ ] Warning når estimert tid overstiger tilgjengelig tid

## 📋 Implementeringsnotater

### Datastruktur
- ProductionDay har `scenes: string[]` (scene IDs)
- ShotList har `sceneId: string`
- Kobling: `ProductionDay.scenes.includes(ShotList.sceneId)`

### Tidskalkulasjoner
- Tilgjengelig tid = wrapTime - callTime (kun hvis ProductionDay er i dag)
- Estimert tid = sum av `estimatedTime` for alle ikke-ferdige shots
- Time pressure = `estimatedTime > availableTime`
- Deadline = ProductionDay.date + wrapTime

### State Management
- `shotListProductionDays: Map<string, ProductionDay>` - Mapper shot list ID til ProductionDay
- Oppdateres automatisk når shot lists eller production days endres

## 🔍 Testing

### Test-scenarier
1. Shot list uten ProductionDay (sceneId ikke i noen ProductionDay.scenes)
2. Shot list med ProductionDay (normal case)
3. ProductionDay i dag med tid igjen
4. ProductionDay i dag uten tid igjen
5. ProductionDay i fremtiden
6. ProductionDay i fortiden
7. Time pressure mode (estimatedTime > availableTime)

## 📚 Relaterte filer
- `src/services/productionPlanningService.ts` - Helper-funksjoner
- `src/components/CastingShotListPanel.tsx` - Shot list panel
- `src/components/InteractiveShotListView.tsx` - Interaktiv view
- `PRODUCTION_CALENDAR_INTEGRATION.md` - Dokumentasjon


