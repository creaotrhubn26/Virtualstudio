# Shot List UX/UI Forbedringsanalyse

## ⚠️ Viktig: Produksjonskalender-Integrasjon

**Kritisk kobling:** Shot lists må være tett integrert med Produksjonskalender for tidsestimering og deadline-håndtering.

### Produksjonskalender-Struktur
- **ProductionDay**: `date`, `callTime`, `wrapTime`, `scenes[]`, `status`
- **ShotList**: `sceneId` (kobler til ProductionDay.scenes[])
- **CastingShot**: `estimatedTime` (minutter), `actualDuration`, `deadline`

### Tidskalkulasjoner fra Produksjonskalender
1. **Total tilgjengelig tid per dag**: `wrapTime - callTime`
2. **Shot deadline**: Basert på ProductionDay.date + wrapTime
3. **Time pressure mode**: Aktiveres når `remainingTime < sum(estimatedTime for remaining shots)`
4. **Dagsfremdrift**: Vis shots per ProductionDay, ikke bare per shot list
5. **Kumulativ tidsestimering**: Sum av alle shots i dagens scenes må passe inn i callTime-wrapTime

### Implementasjonskrav
- Shot list UI må vise hvilken ProductionDay den tilhører
- Tidsestimater må baseres på ProductionDay.callTime/wrapTime
- Deadline-kalkulasjoner må ta hensyn til ProductionDay
- Time pressure mode må aktiveres basert på gjenværende tid i produksjonsdagen
- Progress tracking per ProductionDay, ikke bare per ShotList

## Nåværende Status

### Eksisterende Funksjonalitet
- ✅ Card-basert UI (delvis implementert)
- ✅ InteractiveShotListView eksisterer
- ✅ ShootModeView eksisterer
- ✅ Status tracking (ShotStatus)
- ✅ Media type support i modell (MediaType)
- ✅ Priority tracking (ShotPriority)
- ✅ Timer og fremdrift tracking
- ✅ Anbefalinger (lens, lighting, background) i modell
- ✅ ProductionDay struktur eksisterer
- ✅ SceneId-kobling mellom ShotList og ProductionDay

### Mangler/Gaps
- ❌ **Kritisk:** Tidsestimering koblet til ProductionDay (callTime/wrapTime)
- ❌ **Kritisk:** Deadline-kalkulasjon basert på ProductionDay
- ❌ **Kritisk:** Shot list visning per ProductionDay
- ❌ **Kritisk:** Time pressure mode basert på gjenværende tid i produksjonsdagen
- ❌ Tidsbevisst UI med nedtellinger ("10 min left", "shots remaining")
- ❌ Field-ready design (én-hånds-bruk, store trykkflater)
- ❌ Tydelig Foto/Video/Hybrid markering i UI
- ❌ Team-samspill og synkronisering
- ❌ Context-aware UI (tilpasser seg tid/press)
- ❌ Progressive disclosure (før/under/etter opptak)
- ❌ Fullskjerm shooting mode med minimale UI-elementer
- ❌ Anbefalinger synliggjort i UI (ikke bare i modell)

## Anbefalte Forbedringer

### 1. Tidsbevisst UI Dashboard

**Problem:** Ingen visuell indikasjon på tidspress eller fremdrift

**Løsning:**
- Legg til "Time Remaining" indicator i header
- "Shots Remaining" counter (kritiske + totale)
- Visual progress bar (completed/total shots)
- Deadline countdown for individuelle shots
- Estimated time vs actual time tracking

**Implementering:**
```typescript
interface TimeAwareHeader {
  totalShots: number;
  completedShots: number;
  criticalShotsRemaining: number;
  estimatedTimeRemaining: number; // minutes
  deadline?: Date;
}
```

### 2. Field-Ready Quick Creator Mode

**Problem:** Shot dialog er for kompleks for feltbruk

**Løsning:**
- "Quick Creator Mode" med store trykkflater
- Minimal tekst, maksimal visuell feedback
- Én-hånds-bruk design
- Swipe gestures: Swipe = neste shot, Tap = ferdig, Hold = notat
- Voice input for notater
- Camera integration (ta bilde direkte)

**Implementering:**
```typescript
interface QuickCreatorMode {
  isActive: boolean;
  currentShot: CastingShot | null;
  gestures: {
    swipeNext: () => void;
    tapComplete: () => void;
    holdNote: () => void;
  };
}
```

### 3. Tydelig Foto/Video/Hybrid Markering

**Problem:** MediaType er i modell, men ikke synlig i UI

**Løsning:**
- Tydelige ikoner: 📷 Foto, 🎥 Video, 🎬 Hybrid
- Fargekoding i kort
- Badge på hvert shot kort
- Filter: Vis kun foto/video/hybrid
- Separate leveranselister per media type

**Implementering:**
- Legg til `MediaTypeBadge` komponent
- Oppdater `ShotCard` til å vise media type
- Fargekode kort basert på media type

### 4. Team-Samspill og Synkronisering

**Problem:** Ingen real-time samspill mellom teammedlemmer

**Løsning:**
- Real-time status oppdateringer
- "Who's working on this?" indikator
- Kommentarer og notater per shot
- Assigned to functionality (hvem skal ta dette shotet)
- Live synkronisering via WebSocket eller polling
- Activity feed per shot list

**Implementering:**
```typescript
interface TeamCollaboration {
  assignedTo?: string; // CrewMember ID
  comments: Array<{
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    timestamp: string;
  }>;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}
```

### 5. Context-Aware UI (Tilpasser seg tid/press)

**Problem:** UI er statisk, ikke tilpasser seg situasjon

**Løsning:**
- "Time Pressure Mode" som automatisk aktiveres ved deadline
- Forenklet UI når tid er knapp (kun kritiske shots)
- Fokus mode (kun neste shot + 2-3 neste)
- Dynamisk rekkefølge basert på prioritet + tid
- Automatisk filtre ut "nice-to-have" når tid er knapp

**Implementering:**
```typescript
interface ContextAwareUI {
  timePressureLevel: 'normal' | 'moderate' | 'high' | 'critical';
  autoHideNiceToHave: boolean;
  focusMode: boolean; // Viser kun kritiske shots
  dynamicReordering: boolean;
}
```

### 6. Progressive Disclosure (Før/Under/Etter)

**Problem:** For mye informasjon på en gang

**Løsning:**
- **Før opptak:** Full oversikt, planlegging, redigering
- **Under opptak:** Minimal UI, kun nødvendig info
- **Etter opptak:** Status, leveranse, quality check

**Implementering:**
```typescript
type ProductionPhase = 'planning' | 'execution' | 'review' | 'delivery';

interface PhaseBasedUI {
  phase: ProductionPhase;
  showAdvancedOptions: boolean;
  showRecommendations: boolean;
  showNotes: boolean;
  showEquipment: boolean;
}
```

### 7. Fullskjerm Shooting Mode

**Problem:** Distraksjoner fra UI-elementer

**Løsning:**
- Full skjerm mode
- Kun én primær handling synlig
- Ingen navigasjon
- Minimal tekst
- Store touch targets (min 44px)
- Tap = ferdig, Swipe = neste, Hold = notat

**Implementering:**
```typescript
interface FullscreenShootingMode {
  isActive: boolean;
  currentShot: CastingShot;
  primaryAction: 'complete' | 'skip' | 'retake';
  gestures: {
    tap: () => void;
    swipeLeft: () => void;
    swipeRight: () => void;
    hold: () => void;
  };
}
```

### 8. Anbefalinger Synliggjort i UI

**Problem:** Anbefalinger er i modell, men ikke synlig

**Løsning:**
- "Smart Recommendations" panel i shot card
- Vis lens, lighting, background anbefalinger
- Quick apply buttons
- "Why?" tooltip med forklaring
- Auto-generer anbefalinger basert på shot type + camera angle

**Implementering:**
```typescript
interface RecommendationsPanel {
  lensRecommendation?: string;
  lightingSetup?: string;
  backgroundRecommendation?: string;
  equipmentRecommendations?: string[];
  showWhy?: boolean;
  onApply?: (recommendation: string) => void;
}
```

### 9. Forbedret Card-Basert UI

**Problem:** Kort mangler visuell hierarki og tydelighet

**Løsning:**
- Større kort med bedre spacing
- Tydeligere status indikatorer (farge + ikon)
- Bedre typografi (store overskrifter, små labels)
- Taktil design (shadows, borders)
- Drag-to-reorder
- Quick actions (swipe for actions)

**Implementering:**
- Oppdater `InteractiveShotCard` komponent
- Legg til animasjoner (framer-motion)
- Forbedre visuelt hierarki

### 10. Dashboard View vs Execution View

**Problem:** Samme view for planlegging og utførelse

**Løsning:**
- **Dashboard View:** Oversikt, statistikker, filter, redigering
- **Execution View:** Fokus på nåværende shot, minimale distraksjoner
- Toggle mellom views
- Auto-switch til Execution View når timer starter

**Implementering:**
```typescript
type ViewMode = 'dashboard' | 'execution' | 'review';

interface ViewModeSwitch {
  currentMode: ViewMode;
  autoSwitchOnTimer: boolean;
  showTransition: boolean;
}
```

## Prioriterte Forbedringer

### 🔴 Kritisk Prioritett (Må ha)
1. ✅ **Produksjonskalender-integrasjon** (tidsestimering, deadline, ProductionDay-kobling)
2. ✅ **Time pressure mode** basert på ProductionDay.wrapTime
3. ✅ **Shot list visning per ProductionDay** (ikke bare per scene)
4. ✅ **Deadline-kalkulasjon** basert på ProductionDay.date + wrapTime

### 🟠 Høy Prioritett (MVP)
5. ✅ Tydelig Foto/Video/Hybrid markering
6. ✅ Tidsbevisst UI (shots remaining, progress) **koblet til ProductionDay**
7. ✅ Forbedret card-basert UI med bedre visuelt hierarki
8. ✅ Context-aware UI (time pressure mode) **basert på produksjonskalender**

### 🟡 Medium Prioritett
9. ✅ Team-samspill (assign, comments)
10. ✅ Anbefalinger synliggjort
11. ✅ Progressive disclosure (phase-based UI)
12. ✅ Dashboard vs Execution view toggle

### 🟢 Lav Prioritett (Nice-to-have)
13. ✅ Field-ready Quick Creator Mode
14. ✅ Fullskjerm Shooting Mode med gestures
15. ✅ Real-time synkronisering
16. ✅ Voice input for notater

## Konkrete Implementeringsforslag

### Fase 1: Visual Improvements (Rask win)
- Legg til MediaType badges
- Forbedre shot card design
- Legg til progress indicators
- Fargekode basert på prioritet/status

### Fase 2: Time-Aware Features
- Timer og countdown
- Shots remaining counter
- Estimated time tracking
- Time pressure mode

### Fase 3: Collaboration Features
- Assign to functionality
- Comments per shot
- Activity feed
- Last updated tracking

### Fase 4: Advanced UX
- Progressive disclosure
- Context-aware UI
- Quick Creator Mode
- Fullscreen Shooting Mode

