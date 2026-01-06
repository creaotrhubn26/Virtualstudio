# CourseCreatorSidebar Forbedringsplan

## Oversikt
Denne planen beskriver hvordan CourseCreatorSidebar kan utvides med funksjonalitet for video-redigering, inkludert lower thirds, logo-overlay, kapittel-struktur, og mer.

## 1. Lower Thirds Management

### Funksjonalitet
- Legge til lower third overlay på videoer
- Redigere tekst, stil, posisjon og timing
- Forhåndsvisning av lower third på video
- Lagre og gjenbruke lower third templates

### UI/UX
- **Ny tab**: "Lower Thirds" (tab id: 5)
- **Seksjon i Video Details tab**: Alternativt kan det være en expandable seksjon
- **Komponenter**:
  - Liste over eksisterende lower thirds
  - "Legg til ny" knapp
  - Editor med:
    - Tekst input (hovedtekst og undertekst)
    - Font size selector
    - Color picker for tekst og bakgrunn
    - Position selector (bottom-left, bottom-center, bottom-right)
    - Timing controls (start time, end time, duration)
    - Animation selector (fade in/out, slide, etc.)
    - Preview area

### Data struktur
```typescript
interface LowerThird {
  id: string;
  title: string;
  mainText: string;
  subText?: string;
  startTime: number; // seconds
  endTime: number; // seconds
  position: 'bottom-left' | 'bottom-center' | 'bottom-right';
  style: {
    fontSize: number;
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    opacity: number;
    animation: 'fade' | 'slide' | 'none';
  };
  videoId: string; // Reference to parent video
}
```

### Implementering
- Legg til `lowerThirds` state i CourseCreatorSidebar
- Opprett `LowerThirdEditor` komponent
- Integrer med HelpVideoPlayer for preview
- Lagre lower thirds i course data

---

## 2. Logo Overlay Management

### Funksjonalitet
- Legge til logo overlay på videoer
- Justere størrelse, posisjon og opacity
- Støtte for PNG med transparent bakgrunn
- Timing controls (når logo skal vises)

### UI/UX
- **Seksjon i Video Details tab**: "Logo Overlay"
- **Komponenter**:
  - Logo upload/URL input
  - Position selector (corners + center)
  - Size slider (10% - 50% of video width)
  - Opacity slider (0-100%)
  - Timing controls (show from X to Y seconds)
  - Preview area

### Data struktur
```typescript
interface LogoOverlay {
  id: string;
  videoId: string;
  logoUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size: number; // percentage of video width
  opacity: number; // 0-100
  startTime?: number; // optional, show from this time
  endTime?: number; // optional, hide after this time
}
```

### Implementering
- Legg til `logoOverlay` state
- Opprett `LogoOverlayEditor` komponent
- Integrer med ElegantVideoPlayer for rendering

---

## 3. Kapittel/Chapters System

### Funksjonalitet
- Dele opp videoer i kapittel
- Navigasjon mellom kapittel
- Automatisk generering basert på video metadata
- Manuell redigering av kapittel-tider

### UI/UX
- **Ny tab**: "Kapittel" (tab id: 6)
- **Komponenter**:
  - Liste over kapittel med thumbnail
  - "Legg til kapittel" knapp
  - Chapter editor:
    - Tittel
    - Start time (automatisk eller manuell)
    - End time (automatisk eller manuell)
    - Beskrivelse
    - Thumbnail (auto-generert eller custom)
  - Drag-and-drop for å reordere kapittel
  - "Generer kapittel automatisk" knapp (basert på scene changes)

### Data struktur
```typescript
interface Chapter {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  startTime: number; // seconds
  endTime: number; // seconds
  thumbnailUrl?: string;
  order: number;
}
```

### Implementering
- Legg til `chapters` state
- Opprett `ChapterEditor` komponent
- Integrer med video player for chapter navigation
- API for scene detection (optional)

---

## 4. Video Metadata & Analytics

### Funksjonalitet
- Vis video statistikk
- Tag system for organisering
- Kategorisering
- Søk og filtrering

### UI/UX
- **Seksjon i Video Details tab**: "Metadata"
- **Komponenter**:
  - Video duration display
  - File size
  - Resolution
  - Format
  - Tags input (multi-select med autocomplete)
  - Category selector
  - Created/Modified dates
  - View count (hvis tilgjengelig)
  - Engagement metrics (hvis tilgjengelig)

### Data struktur
```typescript
interface VideoMetadata {
  duration: number;
  fileSize?: number;
  resolution?: { width: number; height: number };
  format: string;
  tags: string[];
  category: string;
  createdAt: string;
  modifiedAt: string;
  viewCount?: number;
  engagement?: {
    averageWatchTime: number;
    completionRate: number;
  };
}
```

---

## 5. Video Annotations & Notes

### Funksjonalitet
- Legge til notater på spesifikke tidspunkter
- Markere viktige øyeblikk
- Kommentarer for redigering

### UI/UX
- **Seksjon i Video Details tab**: "Notater"
- **Komponenter**:
  - Timeline med markers
  - Klikk på timeline for å legge til notat
  - Liste over notater
  - Notat editor med:
    - Timestamp
    - Tekst
    - Type (note, highlight, todo, etc.)
    - Color coding

### Data struktur
```typescript
interface VideoAnnotation {
  id: string;
  videoId: string;
  timestamp: number; // seconds
  type: 'note' | 'highlight' | 'todo' | 'comment';
  text: string;
  color?: string;
  createdAt: string;
  author?: string;
}
```

---

## 6. Video Transitions & Effects

### Funksjonalitet
- Legge til overganger mellom videoer
- Video effects (fade, blur, etc.)
- Color grading presets

### UI/UX
- **Seksjon i Video Details tab**: "Effekter"
- **Komponenter**:
  - Transition selector (fade, slide, etc.)
  - Effect presets (vintage, cinematic, etc.)
  - Color grading controls (brightness, contrast, saturation)
  - Preview

---

## 7. Video Thumbnails Management

### Funksjonalitet
- Generere thumbnails automatisk
- Velge custom thumbnail fra video
- Upload custom thumbnail
  - Crop og resize tools

### UI/UX
- **Seksjon i Video Details tab**: "Thumbnail"
- **Komponenter**:
  - Current thumbnail preview
  - "Generer fra video" knapp (velg frame)
  - "Last opp" knapp
  - Thumbnail gallery (fra video)
  - Crop tool

---

## 8. Video Subtitles/Captions

### Funksjonalitet
- Legge til undertekster
- Import/export av SRT filer
- Auto-generering (hvis API tilgjengelig)

### UI/UX
- **Ny tab**: "Undertekster" (tab id: 7)
- **Komponenter**:
  - Subtitle editor med timeline
  - Import/Export knapper
  - Language selector
  - Style editor (font, size, position, color)

### Data struktur
```typescript
interface Subtitle {
  id: string;
  videoId: string;
  language: string;
  cues: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
}
```

---

## 9. Video Sharing & Embedding

### Funksjonalitet
- Generere embed kode
- Sharing links
- Privacy settings
- Access control

### UI/UX
- **Seksjon i Course Status**: "Deling"
- **Komponenter**:
  - Embed code generator
  - Share link generator
  - Privacy settings (public, private, unlisted)
  - Password protection
  - Access list

---

## 10. Video Playlist Management

### Funksjonalitet
- Organisere videoer i playlister
- Auto-play settings
- Playlist reordering

### UI/UX
- **Ny tab**: "Playlister" (tab id: 8)
- **Komponenter**:
  - Liste over playlister
  - "Ny playlist" knapp
  - Drag-and-drop videoer inn i playlist
  - Playlist settings (auto-play, shuffle, etc.)

---

## Implementeringsrekkefølge (Prioritet)

### Fase 1 - Kjernefunksjonalitet (Høy prioritet)
1. ✅ Video Details editor (allerede implementert)
2. Lower Thirds Management
3. Logo Overlay Management
4. Video Thumbnails Management

### Fase 2 - Organisering (Medium prioritet)
5. Kapittel/Chapters System
6. Video Annotations & Notes
7. Video Metadata & Analytics

### Fase 3 - Avansert funksjonalitet (Lav prioritet)
8. Video Subtitles/Captions
9. Video Transitions & Effects
10. Video Sharing & Embedding
11. Video Playlist Management

---

## Tekniske Detaljer

### State Management
- Utvid `CourseCreatorSidebarProps` med nye data arrays
- Bruk React state for lokal redigering
- Sync med parent component via callbacks

### Komponentstruktur
```
CourseCreatorSidebar/
  ├── VideoDetailsTab/
  │   ├── BasicInfoEditor
  │   ├── LowerThirdEditor
  │   ├── LogoOverlayEditor
  │   ├── ThumbnailEditor
  │   └── MetadataEditor
  ├── ChaptersTab/
  │   └── ChapterEditor
  ├── SubtitlesTab/
  │   └── SubtitleEditor
  └── ...
```

### Data Persistence
- Lagre i course object
- Sync med backend (hvis tilgjengelig)
- LocalStorage backup

### Integration Points
- HelpVideoPlayer: For preview av lower thirds, logo, etc.
- ElegantVideoPlayer: For rendering av overlays
- Video player services: For chapter navigation

---

## UI/UX Forbedringer

### Navigation
- Tabs for hovedkategorier
- Accordion sections for underkategorier
- Breadcrumbs for deep navigation

### Preview
- Live preview av endringer
- Side-by-side comparison
- Timeline preview for timing

### Responsive Design
- Mobile-friendly layout
- Touch gestures for timeline
- Adaptive UI basert på screen size

---

## Fremtidige Utvidelser

1. **AI Features**
   - Auto-generate chapters
   - Auto-generate subtitles
   - Scene detection
   - Content suggestions

2. **Collaboration**
   - Multi-user editing
   - Comments and reviews
   - Version control
   - Approval workflow

3. **Analytics**
   - View analytics
   - Engagement metrics
   - Heatmaps
   - A/B testing

4. **Integration**
   - YouTube/Vimeo sync
   - Social media sharing
   - CMS integration
   - API for third-party tools

---

## Notater

- Alle nye features bør være bakoverkompatible
- Bruk TypeScript interfaces for type safety
- Implementer validering for alle inputs
- Legg til error handling og loading states
- Dokumenter alle nye komponenter
- Skriv tester for kritiske funksjoner





















