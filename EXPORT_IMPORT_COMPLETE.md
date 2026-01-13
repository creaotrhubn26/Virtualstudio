# 📤 Eksport/Import Manuskript - Implementering Fullført

## ✅ Implementert

### 1. **ManuscriptExport Interface** (casting.ts)
Komplett JSON-struktur med:
```typescript
{
  version: "1.0"
  exportedAt: ISO timestamp
  exportedBy: string
  metadata: { tittel, forfatter, format, osv }
  manuscript: Manuscript
  acts: Act[]
  scenes: SceneBreakdown[]
  characters: string[]
  dialogueLines: DialogueLine[]
  production: { shotDetails, storyboards }
  revisions: ScriptRevision[]
  statistics: { counts, runtime }
}
```

### 2. **Service Funktioner** (manuscriptService.ts)

#### `exportManuscriptAsJSON()`
- Samler alle data fra 7 kilder
- Generer JSON-eksport med full struktur
- Kalkuler statistikk automatisk

#### `downloadExportAsFile()`
- Konverter JSON til Blob
- Trigger browser download
- Auto-generert filename med dato

#### `validateImportData()`
- Validerer JSON-struktur
- Sjekker required fields
- Returnerer error-liste

#### `importManuscriptFromJSON()`
- Leser File API
- Parse JSON med error-handling
- Validerer innhold

#### `restoreFromExport()`
- **Generer nye ID-er** for alle elementer
- **Unngår ID-konflikter** med eksisterende data
- Oppdater alle relasjonene
- Returnerer komplett restaurert datasett

### 3. **UI - Import Dialog** (ImportManuscriptDialog.tsx)
Komplett import-workflow med 4 steg:

#### Steg 1: Upload
```
Drag-and-drop eller klikk for filvelger
```

#### Steg 2: Preview
- Validert ✓ eller Feil ✗
- Viser metadata (tittel, forfatter, format)
- Statistikk-tabell (scener, karakterer, runtime)
- Advarsel om nye ID-er

#### Steg 3: Importing
- Progressbar
- "Importering manuskript..."

#### Steg 4: Confirm
- Suksess-ikon
- "Importering fullført!"

### 4. **UI - Export/Import Buttons** (ManuscriptPanel.tsx)

#### Header Buttons:
```
[Auto Breakdown] [Eksporter ⬇] [Lagre] | [Importer ⬆] [+ Nytt]
```

**Eksporter Button:**
- Klikk → Lagrer JSON-fil
- Filename: `{Title}_export_2026-01-13.json`
- Toast: "Manuskript eksportert som JSON"

**Importer Button:**
- Klikk → Åpner ImportManuscriptDialog
- Mulighet til å velge JSON-fil
- Full preview før import

### 5. **Integrasjon i State**

```typescript
// ManuscriptPanel
const [showImportDialog, setShowImportDialog] = useState(false);

const handleExport = async () => {
  const exportData = await manuscriptService.exportManuscriptAsJSON(
    selectedManuscript, acts, scenes, characters, dialogueLines, revisions
  );
  manuscriptService.downloadExportAsFile(exportData, filename);
}

const handleImportComplete = async (exportData: ManuscriptExport) => {
  const restored = await manuscriptService.restoreFromExport(exportData);
  // Update all state with restored data
  setSelectedManuscript(restored.manuscript);
  setActs(restored.acts);
  setScenes(restored.scenes);
  // ... etc
}
```

---

## 📊 JSON-struktur Eksempel

```json
{
  "version": "1.0",
  "exportedAt": "2026-01-13T10:30:00Z",
  "exportedBy": "Manual Export",
  
  "metadata": {
    "title": "Min Fantastisk Film",
    "subtitle": "En episk reise",
    "author": "Filmskaperen",
    "format": "fountain",
    "projectId": "proj_12345",
    "manuscriptId": "ms_67890",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-13T10:00:00Z"
  },
  
  "manuscript": {
    "id": "ms_67890",
    "title": "Min Fantastisk Film",
    "content": "INT. APARTMENT - DAY\n...",
    "pageCount": 120,
    "wordCount": 25000,
    "estimatedRuntime": 120,
    "status": "draft",
    "format": "fountain",
    "version": "1.0",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-13T10:00:00Z"
  },
  
  "acts": [
    {
      "id": "act_1",
      "manuscriptId": "ms_67890",
      "actNumber": 1,
      "title": "Setup",
      "description": "Introducing the world",
      "estimatedRuntime": 30,
      "status": "completed"
    }
  ],
  
  "scenes": [
    {
      "id": "scene_1",
      "sceneNumber": "1",
      "sceneHeading": "INT. APARTMENT - DAY",
      "intExt": "INT",
      "locationName": "Apartment",
      "timeOfDay": "DAY",
      "characters": ["KARL", "MARIA"],
      "estimatedDuration": 3,
      "status": "not-scheduled"
    }
  ],
  
  "characters": ["KARL", "MARIA", "DETECTIVE"],
  
  "dialogueLines": [
    {
      "id": "dialog_1",
      "sceneId": "scene_1",
      "character": "KARL",
      "dialogue": "Hva skal vi gjøre nå?",
      "parenthetical": "(confused)"
    }
  ],
  
  "production": {
    "shotDetails": {
      "cameras": {
        "shot_1A": {
          "id": "cam_1",
          "shotNumber": "1A",
          "focalLength": 50,
          "cameraType": "ARRI Alexa",
          "movement": "Dolly",
          "framing": "Medium"
        }
      },
      "lighting": {...},
      "audio": {...},
      "notes": {...}
    },
    "storyboards": [...]
  },
  
  "revisions": [...],
  
  "statistics": {
    "sceneCount": 42,
    "characterCount": 8,
    "estimatedRuntime": 120,
    "shotCount": 156
  }
}
```

---

## 🔄 Workflow

### Eksport:
```
Klikk "Eksporter" 
  ↓
eksportManuscriptAsJSON() samler all data
  ↓
downloadExportAsFile() starter download
  ↓
Bruker får: "Min_Fantastisk_Film_export_2026-01-13.json"
```

### Import:
```
Klikk "Importer"
  ↓
ImportManuscriptDialog åpnes
  ↓
Bruker velger JSON-fil
  ↓
importManuscriptFromJSON() validerer
  ↓
Viser preview med statistikk
  ↓
Bruker klikker "Importer"
  ↓
restoreFromExport() generer nye ID-er
  ↓
Hele manuskriptet restaureres i state
  ↓
Toast: "Manuskript importert og klar for bruk"
```

---

## 🛡️ Sikkerhet & Validering

✅ **Validering på import:**
- Sjekk required fields
- Sjekk array-struktur
- Sjekk object-struktur
- Error-liste returneres

✅ **ID-generering:**
- Nye ID-er for alle elementer
- Unngår konflikter med eksisterende
- Bevarer relasjonene

✅ **Error-handling:**
- Try-catch på fil-lesing
- JSON parse error-catching
- Validerings-errors vises til bruker

✅ **Browser sikkerhet:**
- Bare JSON-filer tillatt
- File API brukes (sikkert)
- Ingen remote server-calls

---

## 📦 Hva er Inkludert i Eksport

| Element | Inkludert | Detaljer |
|---------|-----------|----------|
| Manuscript | ✅ | Full tekst, metadata, versjon |
| Acts | ✅ | Alle akter med struktur |
| Scenes | ✅ | Alle scener med produksjondata |
| Characters | ✅ | Karakter-liste |
| Dialogue | ✅ | Alle dialogue-linjer per scene |
| Revisions | ✅ | Kompleet revisjonhistorikk |
| Shot Details | ✅ | Kamera, lys, lyd, notater |
| Storyboards | ✅ | Alle storyboard-frames |
| Statistics | ✅ | Auto-kalkulert (not stored) |

---

## 🚀 Bruk Cases

### Use Case 1: Sikkerhetskopi
```
Eksporter manuskript hver dag
Lagre JSON-filer på backup-disk
Hvis noe skjer → Importer back-up
```

### Use Case 2: Samarbeid
```
Regissør eksporterer manuskript
Sender JSON-fil til produsent
Produsent importerer → får samme data
```

### Use Case 3: Versjon-kontroll
```
Eksporter ved hver milestone
Lagre versjonert: 
  - script_v1_draft.json
  - script_v2_revisions.json
  - script_v3_final.json
```

### Use Case 4: Migrering
```
Eksporter fra gammelt system
Importer i ny Casting Planner
Full data integritet bevares
```

---

## ✨ Features

| Feature | Status |
|---------|--------|
| Eksport som JSON | ✅ KLAR |
| Import fra JSON | ✅ KLAR |
| Validering | ✅ KLAR |
| ID-regenerering | ✅ KLAR |
| Preview dialog | ✅ KLAR |
| Error-handling | ✅ KLAR |
| Statistics-kalkulering | ✅ KLAR |
| Download-filename auto | ✅ KLAR |

---

## 🎯 Fullstendig Implementert & Testbarkeit

Alle komponenter:
- ✅ Kompilerer uten feil
- ✅ TypeScript type-sikker
- ✅ MUI v6 kompatibel
- ✅ Responsiv design
- ✅ Error-handling
- ✅ User feedback (toast)

Kan testet direkte:
1. Åpne ManuscriptPanel
2. Velg manuskript
3. Klikk "Eksporter" → Last ned JSON
4. Klikk "Importer" → Velg JSON-fil
5. Gjennomgå preview
6. Klikk "Importer" → Restaurer komplett

---

## 📝 Filer Endret/Opprettet

**Nye filer:**
- `/workspaces/Virtualstudio/src/components/ImportManuscriptDialog.tsx` (220 linjer)

**Modifiserte filer:**
- `/workspaces/Virtualstudio/src/core/models/casting.ts` - Lagt til 8 interfaces
- `/workspaces/Virtualstudio/src/services/manuscriptService.ts` - Lagt til 5 funktioner
- `/workspaces/Virtualstudio/src/components/ManuscriptPanel.tsx` - Integrasjon av export/import

**Kode-statistikk:**
- Total linjer lagt til: ~600
- Nye komponenter: 1
- Nye service-metoder: 5
- Nye interfaces: 8

---

**Systemet er nå komplett for eksport/import!** 🎉

Brukere kan:
- Eksportere hele manuskriptet med all produksjondata
- Importere fra backup/deling
- Full dataintegritet bevares
- Nye ID-er genreres automatisk
