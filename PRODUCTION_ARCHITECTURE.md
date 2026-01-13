# Produksjonssystem - Arkitektur & Dataflyt

## 🏗️ Komponent-hierarki

```
ManuscriptPanel (Hoved-komponent)
├── Tabs (7 tabs)
│   ├── Editor
│   ├── Acts
│   ├── Scenes
│   │   ├── ScenesTab (mode: list | drag | storyboard)
│   │   │   ├── TableContainer (list-mode)
│   │   │   ├── DraggableSceneList (drag-mode)
│   │   │   └── StoryboardIntegrationView (storyboard-mode)
│   │   │       ├── ScriptView
│   │   │       ├── StoryboardView
│   │   │       │   └── StoryboardFrameCard[]
│   │   │       └── ShotListView (Table)
│   │   └── SceneDialog (edit scene)
│   ├── Characters
│   ├── Dialogue
│   ├── Breakdown
│   ├── Revisions
│   ├── Timeline (NYT!)
│   │   └── TimelineView
│   │       ├── Stats header
│   │       ├── Conflict alerts
│   │       └── TimelineSceneBlock[] (draggable, clickable)
│   └── Production (NYT!)
│       ├── StoryboardIntegrationView (venstre)
│       └── ShotDetailPanel (høyre)
└── Drawer (åpnes fra Timeline)
    └── ProductionControlPanel
        ├── Scene overview
        ├── Tabs: Kamera | Lys | Lyd | Referanser
        └── Dynamisk innhold basert på valgt tab
```

---

## 📊 Dataflow

### 1. Scene-valg fra Timeline
```
bruker klikker scene i TimelineView
    ↓ onClick callback
setSelectedScene(scene)
    ↓
showProductionPanel = true
    ↓
ProductionControlPanel rendres med selectedScene
    ↓
Innhold oppdateres dynamisk
```

### 2. Drag-and-Drop Scene Reordering
```
bruker starter drag fra DraggableSceneList
    ↓ onDragStart
setDraggedIndex(index)
    ↓
bruker dragg over annen scene
    ↓ onDragOver
setDragOverIndex(index) [visual feedback]
    ↓
bruker slipper scene
    ↓ onDrop
reorderedScenes = array.splice() manipulasjon
sceneNumbers oppdateres
onReorder(updatedScenes) callback
    ↓
setScenes(updatedScenes) i ManuscriptPanel
    ↓
UI re-renders med nye scener
```

### 3. Produksjon-tab med dual-visning
```
bruker går til Production-tab
    ↓
sjekk om selectedScene eksisterer
    ↓ if yes
render <Box sx={{ display: 'flex', gap: 2 }}>
├── Venstre: StoryboardIntegrationView
│   ├── ToggleButtonGroup (Script | Storyboard | ShotList)
│   └── View endres basert på valg
└── Høyre: ShotDetailPanel
    ├── Tabs (Kamera | Lys | Lyd | Notater)
    └── Innhold endres basert på valg
    ↓
bruker redigerer (f.eks. kamera brennvidde)
    ↓
onChange callback
onUpdate(updatedScene)
    ↓
setScenes(scenes.map(s => s.id === updatedScene.id ? updatedScene : s))
setSelectedScene(updatedScene)
    ↓
UI re-renders med nye verdier
```

---

## 🎯 State-management

### ManuscriptPanel-states (nye)
```typescript
// Production-spesifikt
const [selectedScene, setSelectedScene] = useState<SceneBreakdown | null>(null);
const [selectedShot, setSelectedShot] = useState<string | null>(null);
const [showProductionPanel, setShowProductionPanel] = useState(false);
const [sceneViewMode, setSceneViewMode] = useState<'list' | 'drag' | 'storyboard'>('list');

// Besteht fra før
const [scenes, setScenes] = useState<SceneBreakdown[]>([]);
const [activeTab, setActiveTab] = useState<ManuscriptTabValue>('editor');
```

### TimelineView-states
```typescript
const [zoom, setZoom] = useState(1);
const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
```

### DraggableSceneList-states
```typescript
const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
```

### ShotDetailPanel-states
```typescript
const [shots, setShots] = useState<string[]>(['Shot 1']);
const [selectedShot, setSelectedShot] = useState('Shot 1');
const [cameraData, setCameraData] = useState<Map<string, ShotCamera>>();
const [lightingData, setLightingData] = useState<Map<string, ShotLighting>>();
const [audioData, setAudioData] = useState<Map<string, ShotAudio>>();
const [notesData, setNotesData] = useState<Map<string, ShotNote[]>>();
```

### StoryboardIntegrationView-states
```typescript
const [viewMode, setViewMode] = useState<ViewMode>('script'); // 'script' | 'storyboard' | 'shotlist'
const [storyboardFrames, setStoryboardFrames] = useState<StoryboardFrame[]>([...]);
```

---

## 🔄 Event-floer

### Scenario 1: Bruker åpner Timeline, ser konflikt, klikker scene
```
1. User navigates to "Timeline" tab
   ↓ activeTab = 'timeline'

2. TimelineView renders
   ↓ useEffect detects conflicts
   ↓ locationCounts.map()
   ↓ intSettings vs extSettings check
   ↓ totalRuntime calculation
   ↓ setConflicts([...warnings])

3. Conflict alerts display
   ↓ <Alert severity={conflict.severity}>

4. Scene blocks render
   ↓ TimelineSceneBlock for each scene
   ↓ onClick={() => onSceneSelect(scene)}

5. User clicks scene block
   ↓ onSceneSelect(scene) callback
   ↓ setSelectedScene(scene) in ManuscriptPanel
   ↓ setShowProductionPanel(true)

6. Drawer animates open
   ↓ <Drawer anchor="right" open={showProductionPanel}>

7. ProductionControlPanel renders
   ↓ <ProductionControlPanel selectedScene={selectedScene} />

8. Scene-information displays
   ↓ Scene overview card with location, characters, duration
```

### Scenario 2: Bruker drar scene for å reorganisere
```
1. User toggles to "Drag" view mode in Scenes tab
   ↓ sceneViewMode = 'drag'
   ↓ ScenesTab renders DraggableSceneList

2. DraggableSceneList renders all scenes as draggable cards
   ↓ draggable={true}
   ↓ onDragStart, onDragOver, onDrop handlers

3. User drags scene 5 below scene 8
   ↓ onDragStart(event, 5) → setDraggedIndex(5)
   ↓ onDragOver(event, 8) → setDragOverIndex(8)
   ↓ Visual feedback: Scene 8 card scales/highlights

4. User releases mouse (drop)
   ↓ onDrop(event, 8)
   ↓ reorderedScenes = [...scenes]
   ↓ const [draggedScene] = reorderedScenes.splice(5, 1)
   ↓ reorderedScenes.splice(8, 0, draggedScene)
   ↓ Recalculate sceneNumbers: 1, 2, 3, 4, 6, 5, 7...
   ↓ const updatedScenes = reorderedScenes.map((s, i) => ({...s, sceneNumber: `${i+1}`}))
   ↓ onReorder(updatedScenes) callback

5. ManuscriptPanel receives reordered scenes
   ↓ onReorderScenes(updatedScenes)
   ↓ setScenes(updatedScenes)

6. UI re-renders
   ↓ All scenes show new numbers
   ↓ Timeline updates automatically
   ↓ Scene list refreshes
```

### Scenario 3: Bruker konfigurerer shot i Production-tab
```
1. User navigates to "Production" tab
   ↓ activeTab = 'production'

2. Production tab content renders
   ↓ Check if selectedScene exists
   ↓ if yes: render <Box sx={{ display: 'flex', gap: 2 }}>

3. Left side: StoryboardIntegrationView(selectedScene)
   ↓ Default viewMode = 'script'
   ↓ Shows scene heading, description, dialogue

4. Right side: ShotDetailPanel(selectedScene)
   ↓ Default shot = 'Shot 1'
   ↓ Tabs: Kamera | Lys | Lyd | Notater

5. User clicks "Lys" tab in ShotDetailPanel
   ↓ activeTab = 1 (index)

6. LightingTab renders
   ↓ Shows Key Light accordion
   ↓ User drags "Intensitet" slider from 60 to 80%

7. Slider onChange fires
   ↓ onChange={(_, v) => onChange({...data, keyLight: {...data.keyLight, intensity: v}})}

8. ShotDetailPanel's onChange callback
   ↓ setLightingData(prev => new Map(prev).set(selectedShot, updated))
   ↓ showSuccess('Lys oppdatert')

9. UI updates immediately
   ↓ Slider shows 80%
   ↓ Toast notification appears
```

---

## 🎬 Komponent-ansvarsfordeling

| Komponent | Ansvar |
|-----------|--------|
| **ManuscriptPanel** | Orkestrerer alle tabs, håndterer glob state, integrerer alle sub-komponenter |
| **TimelineView** | Visuell timeline-rendering, konflikt-deteksjon, zoom-kontroll |
| **TimelineSceneBlock** | Individuell scene-blokk, drag-klikkbar, hover-tooltip |
| **ScenesTab** | Välg visnings-modus, dele ut props til riktig sub-view |
| **DraggableSceneList** | Drag-and-drop logikk, scene-reordering, nummerering |
| **StoryboardIntegrationView** | Manus/Storyboard/ShotList veksling, visuell layout |
| **ShotDetailPanel** | Shot-spesifikke detaljer, 4 tabs, data-håndtering |
| **ProductionControlPanel** | Høyre-kolonne panel, scene-oversikt, dynamisk innhold |

---

## 💾 Persistering

### Lagring (ikke implementert ennå, men struktur klar)
```typescript
// I ManuscriptPanel
const handleSave = async () => {
  try {
    // Lagre alle endringer
    await manuscriptService.updateManuscript(selectedManuscript);
    await manuscriptService.updateScenes(scenes);
    // ShotDetailPanel data lagres individuelt når endret
    // StoryboardIntegrationView data lagres individuelt når endret
    showSuccess('Alt lagret');
  } catch (error) {
    showError('Kunne ikke lagre');
  }
}
```

### Lokal state (browser memory)
- Timeline data: Beregnet fra scenes array
- Shot details: Lokalt i ShotDetailPanel (Map)
- Storyboard frames: Lokalt i StoryboardIntegrationView
- Drag state: Temp states som resetter

### Database (når integrert)
```sql
-- Eksisterende tabeller
casting_scenes          -- Grunnleggende scene-data
casting_shot_camera     -- Kamera-detaljer
casting_shot_lighting   -- Lys-detaljer
casting_shot_audio      -- Lyd-detaljer
casting_shot_notes      -- Produksjon-notater
```

---

## 🧩 Props-interface

### ShotDetailPanel
```typescript
interface ShotDetailPanelProps {
  scene: SceneBreakdown;
  onUpdate: (scene: SceneBreakdown) => void;
}
```

### TimelineView
```typescript
interface TimelineViewProps {
  scenes: SceneBreakdown[];
  onSceneSelect: (scene: SceneBreakdown) => void;
  selectedScene?: SceneBreakdown;
}
```

### DraggableSceneList
```typescript
interface DraggableSceneListProps {
  scenes: SceneBreakdown[];
  onReorder: (scenes: SceneBreakdown[]) => void;
  onSceneSelect: (scene: SceneBreakdown) => void;
  selectedScene?: SceneBreakdown;
}
```

### StoryboardIntegrationView
```typescript
interface StoryboardIntegrationViewProps {
  scene: SceneBreakdown;
  onUpdate: (scene: SceneBreakdown) => void;
}
```

### ProductionControlPanel
```typescript
interface ProductionControlPanelProps {
  selectedScene?: SceneBreakdown;
  selectedShot?: string;
  onClose: () => void;
}
```

---

## 📱 Responsivitet

Alle komponenter bruker MUI's `size` prop for responsive design:
```tsx
<Grid size={{ xs: 12, md: 6, lg: 4 }}>
  // xs: mobil (100%), md: tablet (50%), lg: desktop (33%)
</Grid>
```

---

## 🎨 Styling-konvensjon

- **Spacing**: `sx={{ p: 2, gap: 2 }}` (Theme spacing unit = 8px)
- **Colors**: `color="primary"`, `color="error"`, `color="warning"`, etc.
- **Elevation**: `variant="outlined"` for subtle, `variant="paper"` for cards
- **Transitions**: `transition: 'all 0.2s'` for smooth interactions

---

## ⚠️ Avhengigheter (External)

```json
{
  "@mui/material": "^6.0.0",
  "@mui/icons-material": "^6.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0"
}
```

---

## 🔍 Testing-tips

Hvis du vil teste hver komponent isolert:

```tsx
// Test TimelineView
<TimelineView 
  scenes={mockScenes} 
  onSceneSelect={(s) => console.log(s)} 
/>

// Test DraggableSceneList
<DraggableSceneList 
  scenes={mockScenes} 
  onReorder={(s) => console.log(s)}
  onSceneSelect={(s) => console.log(s)}
/>

// Test ShotDetailPanel
<ShotDetailPanel 
  scene={mockScene} 
  onUpdate={(s) => console.log(s)}
/>

// Test Production Tab (full context)
<ManuscriptPanel projectId="test" />
// Velg manuscript → Gå til Production tab
```

---

Arkitektur er skapt for skalerbarhet! 🚀
