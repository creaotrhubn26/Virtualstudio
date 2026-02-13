# 2D Shot Planner - Feature Quick Reference

## New Features at a Glance

### 🎬 Shot Status Workflow
**What**: Track shot production status in real-time  
**Where**: Shot list sidebar (right panel)  
**How**: Click the status icon next to each shot → Select new status from dropdown

**Available States**:
- 🔵 **Planned** - Shot is in script
- 🟡 **Setup** - Crew preparing shot
- 🟠 **Rehearsal** - Actors practicing
- 🟢 **Shot** - Shot successfully captured
- 🟣 **Printed** - Final approved take

---

### 📏 Measurement Tool
**What**: Annotate distances and dimensions on floor plan  
**Shortcut**: `M` key  
**How**:
1. Click Measure button in toolbar (or press M)
2. Click first point on canvas
3. Click second point to create line
4. Repeat for multiple measurements

**Notes**: Measurements auto-save to selected shot

---

### 📐 Framing Guides
**What**: Professional composition overlays  
**Guides Available**:
- **Rule of Thirds** - 3×3 grid for balanced composition
- **Golden Ratio** - Spiral guide for natural composition
- **Center Cross** - Center marks and safe area
- **Diagonals** - 45° lines for dynamic framing

**Opacity**: Adjustable per guide (0-100%)

---

### 🏗️ Floor Plan Upload
**What**: Upload background floor plans for realistic scene planning  
**Where**: Scene settings panel  
**How**:
1. Click "Upload Floor Plan" button
2. Select PNG or JPG (max 10MB)
3. Adjust scale with slider (10%-200%)
4. Floor plan renders as background layer

**Tips**: Use architectural floor plans for accuracy

---

### 💾 Professional Export
**What**: Save shot plans in multiple formats  
**Where**: More menu → Export  
**Formats**:

#### JSON Export
- Complete scene data
- All cameras, actors, props, shots
- Measurement lines and annotations
- Can be re-imported for editing

#### PDF Export  
- Professional print layout
- Shot information and thumbnails
- Production-ready appearance
- Includes scene metadata

#### CSV Callsheet
- Spreadsheet format
- Shot list with key info
- Importable to Excel/Sheets
- Production team friendly

---

### 🎨 Professional Drawing (PencilCanvasPro)
**What**: Professional annotation with Apple Pencil support  
**Shortcut**: Click ✏️ "Annotate (Pro Drawing)" in menu  
**How**:
1. Click annotation button
2. Draw directly on canvas
3. Adjust brush size/color in panel
4. Strokes auto-save

**Features**:
- Pressure sensitivity
- Professional brush engine
- Real-time persistence
- Unlimited undo/redo

---

### 📸 Shot Thumbnails
**What**: Visual preview of each shot  
**Auto-Generated**: When you create a shot  
**Shows**: Camera POV with actors in frame  
**Uses**: Shot list previews and PDF export

---

### 🔗 Manuscript Integration
**What**: Link shots to script scenes  
**How**:
1. Create shot in shot planner
2. In shot details, set "Manuscript Scene ID"
3. Link persists to database
4. Query shots by script location

**Benefits**: 
- Track which scenes are planned
- See script coverage at a glance
- Organize by act/scene

---

## Toolbar Quick Reference

| Tool | Shortcut | Action |
|------|----------|--------|
| Select | V | Select objects |
| Pan | H | Move viewport |
| Camera | C | Add camera |
| Actor | A | Add character |
| Prop | P | Add furniture/objects |
| Measure | M | Create measurement lines |

## Keyboard Shortcuts

### Tools
- **V** = Select tool
- **H** = Pan/Hand tool
- **C** = Add camera
- **A** = Add actor
- **P** = Add prop
- **M** = Measurement tool

### View
- **+/=** = Zoom in
- **-** = Zoom out
- **0** = Reset zoom
- **1** = Fit to content
- **2** = Toggle grid
- **3** = Fullscreen

### Edit
- **Ctrl+Z** = Undo
- **Ctrl+Y** = Redo
- **Ctrl+A** = Select all
- **Ctrl+C** = Copy
- **Ctrl+V** = Paste
- **Delete** = Delete selected

---

## Workflow Examples

### Example 1: Planning a Scene
1. Create new scene: "INT. OFFICE - DAY"
2. Upload floor plan image
3. Add camera at main angle
4. Add actors (Director, Detective)
5. Add props (Desk, Chair)
6. Create shots for each camera position
7. Add measurements between key objects
8. Set shot status to "Planned"
9. Export as PDF for location scout

### Example 2: Production Day
1. Open saved scene
2. Change shot status from "Planned" → "Setup" when crew arrives
3. Update to "Rehearsal" during blocking
4. Set to "Shot" when action captured
5. Mark "Printed" for approved takes
6. Export callsheet as CSV for next day

### Example 3: Manuscript Linking
1. In script editing panel, note scene ID: "ACT-2-SCENE-5"
2. Create matching shots in planner
3. Set shot.manuscriptSceneId = "ACT-2-SCENE-5"
4. Query all shots for scene via API
5. Track script coverage visually

---

## Tips & Tricks

### Performance
- Keep zoom level 50-200% for smooth interaction
- Disable unused visualizations (180° line, DoF) if slow
- Measurement lines auto-clean when shot deleted

### Accuracy
- Use grid snapping for precise placement
- Measure in consistent units (feet/meters)
- Floor plan scale slider adjusts perspective

### Collaboration
- Export JSON for team discussion
- PDF format professional for reviews
- CSV works with production tracking software

### Annotation
- Pressure-sensitive drawing for natural lines
- Use colors to mark safety areas
- Save snapshot before heavy edits

---

## Troubleshooting

**Q: Measurement line not appearing?**  
A: Ensure "Show Measurements" toggle is ON in visualizations panel

**Q: Floor plan too small/large?**  
A: Use scale slider (10%-200%) to adjust fit

**Q: Status not saving?**  
A: Ensure internet connection - auto-saves to cloud

**Q: Export blank PDF?**  
A: Ensure scene has at least one shot with thumbnail generated

**Q: Annotations disappearing?**  
A: Check canvas size matches viewport - refresh if needed

---

## API Integration (Advanced)

### Save Scene to Database
```typescript
const store = useShotPlannerStore();
await store.syncScenes(); // Auto-saves current scene
```

### Query Scenes by Manuscript
```bash
GET /api/shot-planner/scenes/manuscript/ACT-2-SCENE-5
```

### Generate Thumbnail
```typescript
const url = await store.generateShotThumbnail(shotId);
```

### Export Functions
```typescript
// PDF export
await store.exportAsPDF('production-plan.pdf');

// CSV callsheet
const blob = await store.exportShotCallsheet('csv');

// PNG canvas
const png = await store.exportAsPNG(canvas);
```

---

## System Requirements

- **Browser**: Chrome 90+, Safari 14+, Firefox 88+
- **Network**: Internet for cloud saves
- **Storage**: ~50MB per 100 scenes
- **Input**: Mouse/trackpad, optional Apple Pencil
- **Resolution**: 1024×768 minimum (1920×1080 recommended)

---

## Need Help?

- Press **?** key for keyboard shortcuts
- Click **Help** icon in toolbar
- Check scene templates for examples
- Review API documentation

---

**Version**: 1.0 - Production Ready  
**Last Updated**: Today  
**Status**: All 25 features implemented ✅
