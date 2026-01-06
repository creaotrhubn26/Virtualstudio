---
name: CourseCreatorSidebar Complete Enhancement
overview: Komplett forbedring av CourseCreatorSidebar med implementering av alle manglende tabs, video-funksjoner, UI-forbedringer og forbedret brukeropplevelse.
todos: []
---

# CourseCreatorSidebar Ko

mplett Forbedringsplan

## Oversikt

Denne planen implementerer alle manglende funksjoner i `CourseCreatorSidebar.tsx`, inkludert de tomme tabene, video-relaterte funksjoner, og betydelige UI/UX-forbedringer.

## 1. Implementere manglende tabs

### 1.1 Course Details Tab (Tab 1)

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- **Funksjonalitet**:
- Course metadata (tittel, beskrivelse, kategori, nivå)
- Course settings (språk, varighet, pris, tilgjengelighet)
- Course image/thumbnail upload
- Tags/keywords management
- Instructor assignment
- Course prerequisites
- **UI komponenter**:
- Form med TextField, Select, Switch komponenter
- Image upload med preview
- Tag input med chip display
- Instructor selector dropdown

### 1.2 Modules Tab (Tab 2)

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- **Funksjonalitet**:
- Liste over moduler med drag-and-drop rekkefølge
- Legge til/slette/redigere moduler
- Module metadata (tittel, beskrivelse, rekkefølge)
- Module completion requirements
- **UI komponenter**:
- Sortable list med react-beautiful-dnd eller dnd-kit
- Module card komponenter
- Add/Edit module dialog
- Module rekkefølge indikator

### 1.3 Lessons Tab (Tab 3)

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- **Funksjonalitet**:
- Liste over leksjoner gruppert per modul
- Legge til/slette/redigere leksjoner
- Lesson metadata (tittel, beskrivelse, video, varighet)
- Lesson rekkefølge innenfor modul
- Lesson type (video, quiz, tekst, etc.)
- **UI komponenter**:
- Expandable module groups
- Lesson list med drag-and-drop
- Lesson editor dialog
- Lesson type selector

### 1.4 Resources Tab (Tab 4)

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- **Funksjonalitet**:
- Liste over ressurser (filer, lenker, dokumenter)
- Legge til/slette/redigere ressurser
- Resource metadata (navn, type, størrelse, beskrivelse)
- Resource kategorisering
- File upload støtte
- **UI komponenter**:
- Resource list med ikoner per type
- File upload area
- Resource editor dialog
- Resource preview

## 2. Video Details Tab Forbedringer

### 2.1 Video Preview

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Integrere video player for forhåndsvisning
- Støtte for YouTube, Vimeo og direkte video URLs
- Video controls (play, pause, seek)
- Thumbnail preview med bildevisning

### 2.2 Video Validering

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- URL validering (YouTube, Vimeo, direkte video)
- Automatisk ekstraksjon av video ID fra URLs
- Thumbnail URL validering
- Duration format validering (MM:SS eller HH:MM:SS)
- Real-time validering med feilmeldinger

### 2.3 Video Metadata

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Automatisk henting av video metadata (hvis mulig)
- Video oppløsning display
- Video filstørrelse
- Video format/type
- Upload dato

### 2.4 Lower Thirds Management

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Ny seksjon i Video Details tab: "Lower Thirds"
- Liste over lower thirds med timing
- Legge til/redigere/slette lower thirds
- Lower third editor med:
- Tekst input (hovedtekst og undertekst)
- Timing controls (start/end time)
- Position selector
- Style options (font, colors, opacity)
- Preview

### 2.5 Video Chapters/Kapitel

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Ny seksjon: "Video Chapters"
- Chapter timeline visning
- Legge til/redigere/slette chapters
- Chapter metadata (tittel, timestamp, beskrivelse)
- Chapter rekkefølge management

## 3. UI/UX Forbedringer

### 3.1 Drag and Drop

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Installere `@dnd-kit/core` og `@dnd-kit/sortable`
- Implementere sortable lists for:
- Modules rekkefølge
- Lessons rekkefølge
- Resources rekkefølge
- Lower thirds rekkefølge

### 3.2 Søk og Filtrering

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Søkefelt i hver tab for å filtrere innhold
- Filtrering basert på type, status, etc.
- Søk i real-time med debouncing

### 3.3 Form Validering

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Implementere form validering med react-hook-form eller lignende
- Validering for alle input-felter
- Feilmeldinger ved validering
- Disable save-knapp hvis form er ugyldig

### 3.4 Loading States

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Loading indicators for async operasjoner
- Skeleton loaders for lister
- Progress indicators for file uploads

### 3.5 Confirmation Dialogs

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Bekreftelsesdialoger for destructive actions (slett, publiser, etc.)
- Undo funksjonalitet hvor mulig
- Toast notifications for suksess/feil

### 3.6 Keyboard Shortcuts

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Ctrl+S for å lagre
- Escape for å lukke dialogs
- Delete for å slette valgte elementer
- Arrow keys for navigering i lister

## 4. Data Management

### 4.1 State Management

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Forbedre state management med useReducer for kompleks state
- Separate state for hver tab
- Optimistic updates for bedre UX

### 4.2 Data Persistence

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Integrere med auto-save for alle endringer
- Debounced auto-save per tab
- Conflict resolution ved samtidige endringer

### 4.3 Data Validering

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- TypeScript interfaces for alle data strukturer
- Runtime validering med Zod eller Yup
- Type-safe data transformations

## 5. Ytelse og Optimalisering

### 5.1 Memoization

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Bruke React.memo for komponenter
- useMemo for dyre beregninger
- useCallback for event handlers

### 5.2 Lazy Loading

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Lazy load tab innhold
- Code splitting per tab
- Dynamic imports for tunge komponenter

### 5.3 Virtualization

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Virtual scrolling for lange lister
- Window virtualization med react-window eller react-virtuoso

## 6. Tilgjengelighet (A11y)

### 6.1 Keyboard Navigation

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Full keyboard support
- Focus management
- ARIA labels og roles

### 6.2 Screen Reader Support

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- ARIA labels for alle interaktive elementer
- Live regions for dynamisk innhold
- Descriptive alt text for ikoner

## 7. Testing og Kvalitet

### 7.1 Error Handling

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Error boundaries
- Graceful error handling
- User-friendly error messages

### 7.2 Type Safety

**Fil**: `src/components/CourseCreatorSidebar.tsx`

- Strengere TypeScript types
- Remove `any` types
- Proper interface definitions

## Implementeringsrekkefølge

1. **Fase 1**: Implementere manglende tabs (Course Details, Modules, Lessons, Resources)
2. **Fase 2**: Video Details forbedringer (preview, validering, metadata)
3. **Fase 3**: Video-relaterte funksjoner (lower thirds, chapters)
4. **Fase 4**: UI/UX forbedringer (drag-and-drop, søk, validering)
5. **Fase 5**: Ytelse og optimalisering
6. **Fase 6**: Tilgjengelighet og testing

## Nye Dependencies

```json
{
  "@dnd-kit/core": "^6.0.0",
  "@dnd-kit/sortable": "^7.0.0",
  "@dnd-kit/utilities": "^3.2.0",
  "react-hook-form": "^7.0.0",
  "zod": "^3.22.0",
  "react-window": "^1.8.10"
}
```



## Nye Komponenter

- `ModuleEditor.tsx` - Editor for moduler
- `LessonEditor.tsx` - Editor for leksjoner
- `ResourceEditor.tsx` - Editor for ressurser
- `LowerThirdEditor.tsx` - Editor for lower thirds
- `ChapterEditor.tsx` - Editor for video chapters