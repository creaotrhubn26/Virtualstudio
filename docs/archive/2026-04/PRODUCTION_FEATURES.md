# Nye Produksjonsfunksjoner for Manuscript System

## 📋 Oversikt

Manuskript systemet har blitt utvidet med kraftige produksjonsverktøy for å gjøre filmen produksjonsklar, ikke bare kreativ. Systemet kombinerer Manus-editing, Timeline-planlegging, Shot Details og Storyboard-integrering.

---

## 🎬 1. Timeline-visning (Timeline Tab)

**Hva det gjør:**
Inspirert av NLE-programmer som Premiere og Resolve, viser Timeline en visuell oversikt over hele filmen.

**Funksjoner:**
- **Scene-blokker**: Hver scene vises som en blokk med farge basert på INT/EXT
- **Zoom-kontroll**: Zoom inn/ut for å se detaljer eller hele filmen
- **Estimert spilletid**: Automatisk beregning basert på scene-varighet
- **Konflikt-varsler**:
  - ⚠️ For mange scener samme lokasjon
  - ⚠️ Bare EXT-scener (værabhengig)
  - ⚠️ Spilletid over 2 timer
- **Scene-statistikk**: Antall karakterer, varighet, status

**Bruk:**
```
Klikk på en scene i Timeline → Velg fra Produksjon-panelet på høyre side
```

---

## 🎥 2. Shot Detail Panel (Høyre kolonne - Produksjonskontroll)

**Hva det gjør:**
Dynamisk panel som endrer seg basert på hva du velger. For hver shot kan du detaljstyre:

### A. Kamera-tab
- **Brennvidde**: 8mm til 200mm (slider)
- **Kameratype**: ARRI Alexa, RED Komodo, Sony Venice, osv.
- **Bevegelse**: Static, Pan, Tilt, Dolly, Steadicam, Drone, osv.
- **Framing**: Wide, Medium, Close-up, ECU
- **Vinkel**: Eye-level, High, Low, Dutch, osv.

### B. Lys-tab
Detaljert lysoppsett med tre kategorier:
- **Key Light (Hovedlys)**: Retning + Intensitet (0-100%)
- **Fill Light (Fyllys)**: Retning + Intensitet (0-100%)
- **Rim Light (Baklys)**: Retning + Intensitet (0-100%)
- **Fargetemperatur**: I Kelvin (standard 5600K)
- **Lysstil**: Natural, Dramatic, High-key, Low-key, Film Noir

### C. Lyd-tab
- **Dialog Type**: Sync Sound, ADR (Dubbing), Voice-over
- **Atmosfære**: Liste med lyder (traffic, birds, wind, etc.)
- **Foley**: Spesial-effekter (footsteps, door, glass, etc.)
- **Musikk Cue**: Tilknyttet musikk
- **Mikrofon Setup**: Boom, Lav, Plant, Wireless

### D. Notater-tab
- **Kategori**: Regi, VFX, Continuity, Performance, Teknisk
- **Prioritet**: Lav, Medium, Høy
- **Status**: Markér som løst når ferdig
- **Tildeling**: Kan tildeles teammedlemmer

---

## 📐 3. Drag-and-Drop Scene Reordering

**Aktiveres fra Scener-tabben:**
Klikk på drag-ikon for å bytte til drag-mode.

**Funksjoner:**
- **Dra og slipp**: Drag scenes oppover/nedover for å reorganisere
- **Auto-nummerering**: Scene-numrene oppdateres automatisk
- **Visuell feedback**: Blå highlight når du holder over drop-zone
- **Quick-info**: Klikk på scene for å se detaljer

**Eksempel:**
```
Scener: 1 → 2 → 3
↓ (Drag scene 2 under scene 3)
Scener: 1 → 3 → 2 (nummereres automatisk)
```

---

## 🎞 4. Storyboard + Manus Integration

**Aktiveres fra Produksjon-tabben (eller Scener-tabben):**
Klikk på "Storyboard"-knappen øverst.

**Tre visnings-moduser:**

### A. 📄 Manus-visning
- Viser scene-heading (INT/EXT, LOKASJON - TID)
- Scene-beskrivelse
- Karakterer og eksempel-dialog i Fountain-format
- Klassisk screenplay-layout

### B. 🖼 Storyboard-visning
- Thumbnails av hver shot
- Plassering for sketser eller referansebilder
- Shot-nummer overlay
- Kamera- og lys-indikatorer (ikoner)
- Rask notes-opsjon

### C. 🎬 Shot-liste
- Tabell-format med alle shots
- Kolonner: Shot #, Beskrivelse, Kamera, Bevegelse, Varighet
- Inline editing av notater
- Print-friendly format

**Bruk:**
```
Scene 5 velgt → Klikk "Storyboard" → Bytt mellom visninger
```

---

## ⚙️ 5. Produksjonskontroll Panel (Høyre Drawer)

**Automatisk åpner når du:**
- Klikker på en scene i Timeline
- Velger en scene fra liste
- Jobber i Produksjon-tabben

**Innhold:**
- Scene-oversikt (lokasjon, karakterer, varighet)
- Shot-spesifikke detaljer basert på tab-valg
- Foreslåtte kamera-innstillinger (F-stop, shutter, ISO)
- Referansebilder og mood-tags
- Visuell notater

---

## 🔧 Tekniske Detaljer

### Database-tabeller brukt:
```sql
casting_scenes          -- Scene-informasjon
casting_shot_camera     -- Kamera-detaljer per shot
casting_shot_lighting   -- Lys-setup per shot
casting_shot_audio      -- Lyd-setup per shot
casting_shot_notes      -- Notater per shot
```

### Nye Props og State:
```typescript
selectedScene: SceneBreakdown | null
selectedShot: string | null
sceneViewMode: 'list' | 'drag' | 'storyboard'
showProductionPanel: boolean
```

### Nye Tabs i ManuscriptPanel:
```
'timeline'    -- Timeline-visning
'production'  -- Storyboard + Shot Details
```

---

## 💡 Brukseksempel: Scenes Shot

### Scenario: Du skal planlegge Scene 5 - Møtet på kaféen

**Steg 1**: Gå til **Scener-tabben**
- Dra og slipp for å sortere hvis nødvendig

**Steg 2**: Gå til **Timeline-tabben**
- Se hele filmens struktur
- Få en oversikt over varighet og konflikter

**Steg 3**: Klikk på Scene 5 i Timeline
- Produksjon-panelet (høyre) åpnes automatisk
- Du ser scene-informasjon

**Steg 4**: Gå til **Produksjon-tabben**
- Velg Scene 5 hvis ikke valgt
- Klikk "Storyboard" for visuel planlegging
- Bytt mellom Manus / Storyboard / Shot-liste

**Steg 5**: Konfigurer Shot Details
- Høyre kolonne: Kamerainnstillinger
- Høyre kolonne: Lysoppsett
- Høyre kolonne: Lydoppsett
- Høyre kolonne: Notater

**Steg 6**: Lagre
- Klikk "Lagre" øverst når ferdig

---

## 📊 Konflikt-varsler og Optimisering

### Automatisk oppdagede problemer:
1. **Lokasjon-overuse**: Samme plass brukt for ofte
2. **Væravhengighet**: For mange EXT-scener i kort tid
3. **Tidsoverskridelser**: Total varighet over normal filmtid

### Løsninger:
- Reorganiser scener med drag-drop
- Legg til INT-alternativer
- Del lange scener i flere deler

---

## 🚀 Neste Steg (Valgfritt)

- **PDF-eksport**: Konverter Fountain → screenplayPDF
- **Call Sheet-generator**: Auto-generer produksjonsdokumenter
- **AI-analyse**: Pacing og struktur-forslag
- **Team-samarbeid**: Multi-user editing med comments

---

## 📝 Notater

- Alle endringer lagres i `manuscriptRevisions`
- Diff-viewer viser hva som har endret seg
- Historikk beholdes for revisjon

Lykke til med produksjonen! 🎬
