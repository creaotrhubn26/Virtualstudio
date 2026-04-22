# Production Manuscript View

En komplett produksjonsorientert visning av manuskript med integrert scene-navigering, shot planning og real-time timeline synkronisering.

## Komponenter

### ProductionManuscriptView
Hovedkomponenten som kombinerer alle eksisterende produksjonsverktøy i ett unified interface inspirert av profesjonelle filmproduks jonsverktøy.

**Plassering:** `src/components/ProductionManuscriptView.tsx`

**Layout:**
```
┌─────────────┬───────────────────────────────┬─────────────┐
│   Scene     │                               │    Shot     │
│  Navigator  │      Manuscript View          │   Details   │
│  (Venstre)  │        (Sentrum)              │   (Høyre)   │
│             │                               │             │
│ - Akter     │ - Scene Headings              │ - Kamera    │
│ - Scener    │ - Metadata (Kam/Lys/Lyd)      │ - Lys       │
│ - Status    │ - Dialog                      │ - Lyd       │
│             │ - Noter                       │ - Referanse │
│             │ - Storyboard Shots            │             │
├─────────────┴───────────────────────────────┴─────────────┤
│                   Enhanced Timeline                       │
│             (Shot blocks med fargekoding)                 │
└───────────────────────────────────────────────────────────┘
```

### EnhancedTimelineView
Forbedret timeline med shot-blocks, fargekoding og real-time synkronisering.

**Plassering:** `src/components/EnhancedTimelineView.tsx`

**Funksjoner:**
- Shot blocks visualisering med fargekoding basert på shot type
- Scene markers
- Audio/video tracks
- Time ruler med minutt-markører
- Zoom funksjonalitet
- Click-to-navigate

## Funksjoner

### Real-time Scroll Synkronisering
Manuskript-viewet oppdaterer automatisk valgt scene basert på scroll-posisjon:

```typescript
const handleManuscriptScroll = () => {
  // Finn hvilken scene som er i sentrum av viewporten
  const centerY = scrollTop + viewportHeight / 2;
  
  // Finn nærmeste scene
  sceneRefs.current.forEach((element, sceneId) => {
    const elementCenter = element.offsetTop + element.height / 2;
    // Oppdater selectedScene
  });
};
```

### Scene Navigation
Klikk på en scene i:
- **Venstre sidebar** → Scroll til scene i manuskript
- **Timeline** → Scroll til scene i manuskript
- **Manuskript** → Oppdater timeline

### Shot Integration
- Shots vises som thumbnail gallery under hver scene
- Shot details panel til høyre viser metadata
- Timeline viser shot blocks med fargekoding:
  - 🟢 Wide = Grønn
  - 🟠 Medium = Oransje
  - 🔵 Close-up = Blå
  - 🟣 Extreme Close-up = Lilla

## Integrasjon

### I ManuscriptPanel
Legg til ny tab "Production View":

```typescript
<Tab label="Production View" value="productionview" icon={<MovieIcon />} />

{activeTab === 'productionview' && (
  <ProductionManuscriptView
    manuscript={selectedManuscript}
    scenes={scenes}
    dialogueLines={dialogueLines}
    acts={acts}
    projectId={projectId}
    onSceneUpdate={(updatedScene) => {
      setScenes(scenes.map(s => s.id === updatedScene.id ? updatedScene : s));
    }}
  />
)}
```

### Data Flow
```
Legacy planner container (removed)
  ├── ManuscriptPanel
  │     └── ProductionManuscriptView
  │           ├── Scene Navigator (DraggableSceneList concepts)
  │           ├── Manuscript Editor (RichTextEditor)
  │           ├── ShotDetailPanel
  │           └── EnhancedTimelineView
  │
  ├── CastingShotListPanel (shot lists)
  └── StoryboardIntegrationView (storyboards)
```

## Tekniske Detaljer

### State Management
```typescript
const [selectedScene, setSelectedScene] = useState<SceneBreakdown | null>(null);
const [selectedShot, setSelectedShot] = useState<CastingShot | null>(null);
const [shotLists, setShotLists] = useState<ShotList[]>([]);
const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
```

### Refs for Scroll Tracking
```typescript
const manuscriptRef = useRef<HTMLDivElement>(null); // Main scroll container
const sceneRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // Scene elements
```

### Performance Optimisering
- `useMemo` for scene grouping and calculations
- Debounced scroll handler (100ms)
- Lazy rendering av storyboard thumbnails

## Styling

### Theme
```typescript
const theme = {
  background: {
    main: '#1a1a2e',
    sidebar: '#16213e',
    panel: '#0f3460',
  },
  accent: {
    primary: '#e91e63',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
  }
};
```

### Responsive Design
- Venstre sidebar: 300px fixed
- Høyre sidebar: 350px fixed
- Sentrum: Flex 1 (resizable)
- Timeline: 150px høyde, fixed bottom

## Tastatursnarveger (Fremtidig)
- `↑/↓` - Neste/forrige scene
- `Space` - Play/pause timeline preview
- `Cmd/Ctrl + F` - Søk i manuskript
- `Cmd/Ctrl + S` - Lagre

## Videre Utvikling

### Phase 1 ✅
- [x] Layout structure
- [x] Scene navigation
- [x] Scroll synkronisering
- [x] Timeline shot blocks
- [x] Shot detail integration

### Phase 2 (Planlagt)
- [ ] Real-time collaboration
- [ ] Inline shot editing
- [ ] AI shot suggestions
- [ ] Export shooting script PDF
- [ ] Print production breakdown

### Phase 3 (Fremtidig)
- [ ] 3D preview integration
- [ ] Live camera feed overlay
- [ ] AR location scouting
- [ ] Multi-camera setups
- [ ] Weather/sun position overlay

## API Integration

### Load Shot Lists
```typescript
const lists = await castingService.getShotLists(projectId);
setShotLists(Array.isArray(lists) ? lists : []);
```

### Update Scene
```typescript
if (onSceneUpdate) {
  onSceneUpdate(updatedScene);
}
```

## Feilsøking

### Timeline ikke synlig
Sjekk at `shotLists` er lastet og at shots har `duration` verdier.

### Scroll synkronisering virker ikke
Sjekk at `sceneRefs` blir populert korrekt i render loop.

### Shot colors feil
Sjekk `SHOT_COLORS` mapping i `EnhancedTimelineView.tsx`.

## Eksempel Bruk

```typescript
<ProductionManuscriptView
  manuscript={{
    id: 'ms-1',
    title: 'Min Film',
    content: '...',
    // ...
  }}
  scenes={[
    {
      id: 'scene-1',
      sceneNumber: '1',
      intExt: 'INT',
      locationName: 'STUE',
      timeOfDay: 'DAY',
      // ...
    }
  ]}
  dialogueLines={[
    {
      id: 'dl-1',
      characterName: 'ANNA',
      dialogueText: 'Jeg trodde du kom til å bli.',
      // ...
    }
  ]}
  acts={[
    {
      id: 'act-1',
      title: 'AKT 1',
      // ...
    }
  ]}
  projectId="project-1"
  onSceneUpdate={(scene) => console.log('Scene updated:', scene)}
/>
```

## Kompatibilitet

- React 18+
- MUI v6
- TypeScript 5+
- Eksisterende Virtual Studio infrastruktur

## Lisens
Del av VirtualStudio Virtual Studio systemet.
