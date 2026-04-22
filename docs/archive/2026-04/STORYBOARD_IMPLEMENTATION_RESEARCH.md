# Storyboard Implementation Research - Komplett Analyse

## 1. Nåværende Status

### ✅ Hva som allerede eksisterer:

1. **StoryboardStore** (`src/state/storyboardStore.ts`)
   - Zustand store med alle grunnleggende CRUD-operasjoner
   - State management for storyboards og frames
   - Selector hooks (useCurrentStoryboard, useStoryboards, etc.)
   - Helper functions (getShotTypeLabel, getShotTypeColor, etc.)

2. **ShotListToStoryboardConverter** (`src/core/services/shotListToStoryboardConverter.ts`)
   - Konverterer CastingShot → StoryboardFrame
   - Batch-konvertering av flere shots
   - Navngenerering fra scene-informasjon

3. **CastingShotListPanel** (forbedret)
   - Storyboard-integrasjon med preview-bilder
   - Dialog for konvertering
   - Visuell indikasjon når storyboard eksisterer

4. **StoryboardPanel** (`src/panels/StoryboardPanel.tsx`)
   - UI for å vise og redigere storyboards
   - Frame capture funksjonalitet (refererer til services som mangler)

### ❌ Hva som mangler:

1. **storyboardSyncService** - Referert til men finnes ikke
2. **storyboardCaptureService** - Referert til men finnes ikke  
3. **Persistering** - Storyboards lagres ikke permanent
4. **Image Storage** - Ingen lagring av frame-bilder
5. **Scene Snapshot Loading** - Kan ikke laste scene-stater fra frames

---

## 2. Nødvendige Services og Modeller

### A. StoryboardSyncService

**Fil**: `src/core/services/storyboardSyncService.ts`

**Funksjonalitet**:
- Synkronisere storyboards med backend/database
- Auto-save funksjonalitet
- Conflict resolution
- Offline support med queue

**Interface**:
```typescript
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'conflict';

interface SyncState {
  status: SyncStatus;
  lastSynced: string | null;
  pendingChanges: number;
}

class StoryboardSyncService {
  subscribe(callback: (state: SyncState) => void): () => void;
  fetchAll(): Promise<Storyboard[]>;
  saveStoryboard(storyboard: Storyboard): Promise<void>;
  deleteStoryboard(id: string): Promise<void>;
  pushChanges(): Promise<void>;
  pullChanges(): Promise<void>;
}
```

**Backend API Endpoints nødvendig**:
- `GET /api/storyboards` - Hent alle storyboards
- `GET /api/storyboards/:id` - Hent spesifikk storyboard
- `POST /api/storyboards` - Opprett/oppdater storyboard
- `DELETE /api/storyboards/:id` - Slett storyboard
- `POST /api/storyboards/sync` - Synkroniser endringer

**Database Schema nødvendig**:
```sql
CREATE TABLE storyboards (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  aspect_ratio VARCHAR NOT NULL,
  project_id VARCHAR REFERENCES casting_projects(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  metadata JSONB
);

CREATE TABLE storyboard_frames (
  id VARCHAR PRIMARY KEY,
  storyboard_id VARCHAR REFERENCES storyboards(id) ON DELETE CASCADE,
  index INTEGER NOT NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  title VARCHAR,
  description TEXT,
  shot_type VARCHAR,
  camera_angle VARCHAR,
  camera_movement VARCHAR,
  duration DECIMAL,
  status VARCHAR,
  scene_snapshot JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE storyboard_annotations (
  id VARCHAR PRIMARY KEY,
  frame_id VARCHAR REFERENCES storyboard_frames(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  x DECIMAL NOT NULL,
  y DECIMAL NOT NULL,
  rotation DECIMAL,
  label TEXT,
  notes TEXT,
  color VARCHAR,
  created_at TIMESTAMP
);
```

### B. StoryboardCaptureService

**Fil**: `src/core/storyboard/StoryboardCaptureService.ts`

**Funksjonalitet**:
- Capture screenshots fra 3D viewport (Babylon.js)
- Generere thumbnails
- Detektere shot type og camera angle automatisk
- Lagre scene snapshots (camera, lights, actors)

**Interface**:
```typescript
interface CaptureOptions {
  width: number;
  height: number;
  format: 'jpeg' | 'png';
  quality?: number;
}

interface CaptureResult {
  imageUrl: string;
  thumbnailUrl: string;
  sceneSnapshot: {
    camera: {
      position: [number, number, number];
      rotation: [number, number, number];
      focalLength: number;
      aperture: number;
    };
    lights: Array<{
      id: string;
      type: string;
      position: [number, number, number];
      intensity: number;
    }>;
    actors?: Array<{
      id: string;
      position: [number, number, number];
      rotation: [number, number, number];
    }>;
  };
}

class StoryboardCaptureService {
  initialize(renderer: any, scene: any, camera: any): void;
  isReady(): boolean;
  capture(options: CaptureOptions): Promise<CaptureResult>;
  detectShotType(): ShotType;
  detectCameraAngle(): CameraAngle;
  loadSceneSnapshot(snapshot: CaptureResult['sceneSnapshot']): void;
}
```

**Implementasjonsdetaljer**:
- Bruk `BABYLON.Tools.CreateScreenshot()` (allerede brukt i `VirtualStudio.takeScreenshot()`)
- Få tilgang til VirtualStudio via `window.virtualStudio` (global instance)
- Bruk `virtualStudio.getCurrentSceneConfig()` for scene snapshot (allerede implementert)
- For thumbnails: resize image til f.eks. 300x169 ved å lage nytt canvas og tegne bilde
- Shot type detection: basert på camera distance og FOV
- Camera angle detection: basert på camera rotation (alpha, beta)

**Eksisterende kode å gjenbruke**:
- `src/main.ts:13764` - `takeScreenshot()` metode
- `src/main.ts:4339` - `getCurrentSceneConfig()` metode
- `src/main.ts:180-229` - VirtualStudio class struktur

### C. StoryboardImageStorageService

**Fil**: `src/core/services/storyboardImageStorageService.ts`

**Funksjonalitet**:
- Upload frame-bilder til R2 storage (Cloudflare)
- Generere og lagre thumbnails
- Håndtere image URLs
- Cleanup av ubrukte bilder

**Interface**:
```typescript
interface UploadResult {
  imageUrl: string;
  thumbnailUrl: string;
  imageKey: string;
  thumbnailKey: string;
}

class StoryboardImageStorageService {
  uploadFrameImage(
    imageBlob: Blob, 
    frameId: string, 
    storyboardId: string
  ): Promise<UploadResult>;
  
  deleteFrameImage(imageKey: string, thumbnailKey: string): Promise<void>;
  
  generateThumbnail(imageBlob: Blob, maxWidth: number, maxHeight: number): Promise<Blob>;
}
```

**Backend API Endpoints nødvendig**:
- `POST /api/storyboards/upload-image` - Upload frame image
- `DELETE /api/storyboards/images/:key` - Slett image
- `GET /api/storyboards/images/:key` - Hent image (proxy fra R2)

**R2 Storage Structure**:
```
storyboards/
  {storyboardId}/
    frames/
      {frameId}/
        original.{ext}
        thumbnail.{ext}
```

### D. StoryboardPersistenceService

**Fil**: `src/core/services/storyboardPersistenceService.ts`

**Funksjonalitet**:
- LocalStorage fallback når database ikke er tilgjengelig
- Auto-save til localStorage
- Sync mellom localStorage og database
- Migration fra localStorage til database

**Interface**:
```typescript
class StoryboardPersistenceService {
  saveToLocalStorage(storyboard: Storyboard): void;
  loadFromLocalStorage(): Storyboard[];
  migrateToDatabase(): Promise<void>;
  clearLocalStorage(): void;
}
```

**LocalStorage Keys**:
- `virtualStudio_storyboards` - Array av storyboards
- `virtualStudio_storyboards_syncQueue` - Queue for syncing

---

## 3. Data Modeller og Typer

### A. Utvid Storyboard Interface

**Fil**: `src/state/storyboardStore.ts` (oppdater)

```typescript
export interface Storyboard {
  id: string;
  name: string;
  aspectRatio: '16:9' | '4:3' | '2.35:1' | '1:1' | '9:16';
  frames: StoryboardFrame[];
  
  // Nye felter:
  projectId?: string; // Kobling til CastingProject
  shotListId?: string; // Kobling til ShotList (hvis konvertert fra)
  sceneId?: string; // Kobling til Scene Composer scene
  
  // Metadata
  description?: string;
  tags?: string[];
  status?: 'draft' | 'in_progress' | 'completed' | 'archived';
  
  // Collaboration
  sharedWith?: Array<{
    userId: string;
    role: 'viewer' | 'editor' | 'owner';
  }>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
}
```

### B. Utvid StoryboardFrame Interface

**Fil**: `src/state/storyboardStore.ts` (oppdater)

```typescript
export interface StoryboardFrame {
  // Eksisterende felter...
  
  // Nye felter:
  shotListId?: string; // Hvis konvertert fra shot list
  castingShotId?: string; // Original shot ID
  
  // Image storage
  imageKey?: string; // R2 storage key
  thumbnailKey?: string; // R2 storage key for thumbnail
  
  // Scene integration
  sceneId?: string; // Scene Composer scene ID
  canLoadToScene?: boolean; // Om scene snapshot kan lastes
  
  // Audio/Video
  audioUrl?: string;
  videoUrl?: string;
  
  // Versioning
  version?: number;
  previousVersionId?: string;
}
```

---

## 4. Backend API Endpoints

### Nødvendige Endpoints i `backend/main.py`:

```python
# Storyboard CRUD
@app.get("/api/storyboards")
async def get_storyboards(project_id: Optional[str] = None):
    """Hent alle storyboards, evt. filtrert på project_id"""
    
@app.get("/api/storyboards/{storyboard_id}")
async def get_storyboard(storyboard_id: str):
    """Hent spesifikk storyboard med frames"""
    
@app.post("/api/storyboards")
async def create_storyboard(storyboard: StoryboardCreate):
    """Opprett nytt storyboard"""
    
@app.put("/api/storyboards/{storyboard_id}")
async def update_storyboard(storyboard_id: str, storyboard: StoryboardUpdate):
    """Oppdater storyboard"""
    
@app.delete("/api/storyboards/{storyboard_id}")
async def delete_storyboard(storyboard_id: str):
    """Slett storyboard og alle frames"""

# Frame management
@app.post("/api/storyboards/{storyboard_id}/frames")
async def add_frame(storyboard_id: str, frame: FrameCreate):
    """Legg til frame i storyboard"""
    
@app.put("/api/storyboards/{storyboard_id}/frames/{frame_id}")
async def update_frame(storyboard_id: str, frame_id: str, frame: FrameUpdate):
    """Oppdater frame"""
    
@app.delete("/api/storyboards/{storyboard_id}/frames/{frame_id}")
async def delete_frame(storyboard_id: str, frame_id: str):
    """Slett frame"""

# Image upload
@app.post("/api/storyboards/upload-image")
async def upload_frame_image(
    file: UploadFile = File(...),
    frame_id: str = Form(...),
    storyboard_id: str = Form(...)
):
    """Upload frame image til R2 storage"""
    
@app.get("/api/storyboards/images/{image_key:path}")
async def get_storyboard_image(image_key: str):
    """Hent image fra R2 storage (proxy)"""

# Sync
@app.post("/api/storyboards/sync")
async def sync_storyboards(changes: StoryboardSyncRequest):
    """Synkroniser endringer (batch)"""
```

### Database Models (SQLAlchemy)

**Fil**: `backend/models/storyboard.py` (ny fil)

```python
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text, Numeric
from sqlalchemy.orm import relationship
from .base import Base

class StoryboardModel(Base):
    __tablename__ = "storyboards"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    aspect_ratio = Column(String, nullable=False)
    project_id = Column(String, ForeignKey("casting_projects.id"), nullable=True)
    shot_list_id = Column(String, nullable=True)
    scene_id = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    status = Column(String, default="draft")
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    last_synced_at = Column(DateTime, nullable=True)
    
    frames = relationship("StoryboardFrameModel", back_populates="storyboard", cascade="all, delete-orphan")

class StoryboardFrameModel(Base):
    __tablename__ = "storyboard_frames"
    
    id = Column(String, primary_key=True)
    storyboard_id = Column(String, ForeignKey("storyboards.id", ondelete="CASCADE"), nullable=False)
    index = Column(Integer, nullable=False)
    image_url = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    image_key = Column(String, nullable=True)
    thumbnail_key = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    shot_type = Column(String, nullable=False)
    camera_angle = Column(String, nullable=False)
    camera_movement = Column(String, nullable=False)
    duration = Column(Numeric, nullable=False)
    status = Column(String, default="draft")
    scene_snapshot = Column(JSON, nullable=True)
    shot_list_id = Column(String, nullable=True)
    casting_shot_id = Column(String, nullable=True)
    scene_id = Column(String, nullable=True)
    audio_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    previous_version_id = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    
    storyboard = relationship("StoryboardModel", back_populates="frames")
    annotations = relationship("StoryboardAnnotationModel", back_populates="frame", cascade="all, delete-orphan")

class StoryboardAnnotationModel(Base):
    __tablename__ = "storyboard_annotations"
    
    id = Column(String, primary_key=True)
    frame_id = Column(String, ForeignKey("storyboard_frames.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    x = Column(Numeric, nullable=False)
    y = Column(Numeric, nullable=False)
    rotation = Column(Numeric, nullable=True)
    label = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    color = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False)
    
    frame = relationship("StoryboardFrameModel", back_populates="annotations")
```

---

## 5. Integrasjoner

### A. Scene Composer Integration

**Funksjonalitet**:
- Laste scene fra storyboard frame
- Capture scene til storyboard frame
- Synkronisere mellom Scene Composer og Storyboard

**Service**: `src/core/services/storyboardSceneIntegration.ts`

```typescript
class StoryboardSceneIntegration {
  // Laste scene snapshot til Scene Composer
  loadSceneFromFrame(frame: StoryboardFrame): Promise<void>;
  
  // Capture scene til frame
  captureSceneToFrame(sceneId: string): Promise<StoryboardFrame>;
  
  // Sjekke om scene eksisterer
  sceneExists(sceneId: string): boolean;
}
```

### B. Casting Service Integration

**Funksjonalitet**:
- Koble storyboards til casting projects
- Automatisk oppdatere shot lists når storyboard endres
- Synkronisere mellom shot lists og storyboards

**Endringer i `castingService.ts`**:
```typescript
// Legg til i CastingProject interface:
storyboards?: string[]; // Array av storyboard IDs

// Nye metoder:
async getStoryboardsForProject(projectId: string): Promise<Storyboard[]>;
async linkStoryboardToProject(projectId: string, storyboardId: string): Promise<void>;
```

---

## 6. Implementeringsrekkefølge

### Fase 1: Grunnleggende Persistering
1. ✅ StoryboardStore (allerede opprettet)
2. ⏳ StoryboardPersistenceService (localStorage)
3. ⏳ Integrere auto-save i storyboardStore

### Fase 2: Capture og Images
1. ⏳ StoryboardCaptureService
2. ⏳ StoryboardImageStorageService
3. ⏳ Backend image upload endpoints

### Fase 3: Database og Sync
1. ⏳ Database models og migrations
2. ⏳ Backend API endpoints
3. ⏳ StoryboardSyncService
4. ⏳ Integrere sync i storyboardStore

### Fase 4: Scene Integration
1. ⏳ StoryboardSceneIntegration service
2. ⏳ Load scene snapshot funksjonalitet
3. ⏳ Capture scene til frame

### Fase 5: Forbedringer
1. ⏳ Thumbnail generering
2. ⏳ Image optimization
3. ⏳ Offline support
4. ⏳ Conflict resolution

---

## 7. Tekniske Detaljer

### Image Storage Strategy

**Alternativ 1: R2 Storage (Anbefalt)**
- Pros: Skalerbart, billig, CDN
- Cons: Krever backend proxy eller signed URLs
- Implementering: Bruk eksisterende `r2_client.py` pattern

**Alternativ 2: Base64 i Database**
- Pros: Enkelt, ingen ekstra services
- Cons: Stort database, tregt
- Implementering: Kun for små bilder/thumbnails

**Anbefaling**: R2 Storage for original images, base64 for thumbnails i database

### Scene Snapshot Format

**Bruker eksisterende `ScenarioPreset['sceneConfig']` format** (allerede implementert i `getCurrentSceneConfig()`):

```typescript
interface SceneSnapshot {
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    focalLength: number;
  };
  lights: Array<{
    type: string;
    position: [number, number, number];
    rotation: [number, number, number]; // i grader
    intensity: number;
    cct?: number;
    modifier?: string;
  }>;
  backdrop?: {
    type: string;
    color: string;
  };
  // Optional: actors og props kan legges til senere
  actors?: Array<{
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
  }>;
}
```

**Loading av scene snapshot**:
- Bruk `VirtualStudio.applyScenarioPreset()` som referanse (src/main.ts:10226)
- Konverter snapshot til `ScenarioPreset` format
- Bruk `virtualStudio.addLightWithSpecsAndRotation()` for lights
- Sett camera position/target/focalLength direkte

### Shot Type Detection Logic

```typescript
function detectShotType(camera: Camera, actors: Actor[]): ShotType {
  const distance = calculateDistance(camera.position, actors[0]?.position);
  const fov = camera.fov;
  
  if (distance > 10 && fov > 60) return 'Wide';
  if (distance > 5 && fov > 40) return 'Medium';
  if (distance < 2) return 'Extreme Close-up';
  if (distance < 5) return 'Close-up';
  
  return 'Medium';
}
```

---

## 8. Testing og Validering

### Test Cases:

1. **Konvertering Shot List → Storyboard**
   - ✅ Alle shots konverteres korrekt
   - ⏳ Metadata bevares
   - ⏳ Scene snapshots genereres hvis tilgjengelig

2. **Image Upload**
   - ⏳ Bilder uploades til R2
   - ⏳ Thumbnails genereres
   - ⏳ URLs returneres korrekt

3. **Persistering**
   - ⏳ Storyboards lagres til localStorage
   - ⏳ Storyboards synkroniseres til database
   - ⏳ Offline mode fungerer

4. **Scene Loading**
   - ⏳ Scene snapshot lastes korrekt
   - ⏳ Camera og lights restaureres
   - ⏳ Actors og props plasseres riktig

---

## 9. Performance Considerations

### Optimeringer:

1. **Lazy Loading**
   - Last kun thumbnails i liste-visning
   - Last full images kun når frame åpnes

2. **Image Compression**
   - Komprimer bilder før upload
   - Bruk WebP format for bedre komprimering

3. **Caching**
   - Cache storyboards i memory
   - Cache images i browser cache

4. **Batch Operations**
   - Batch upload av flere frames
   - Batch sync av endringer

---

## 10. Security Considerations

1. **Image Upload Validation**
   - Valider filtype (kun images)
   - Valider filstørrelse (max 10MB)
   - Scan for malware (backend)

2. **Access Control**
   - Sjekk permissions før visning/redigering
   - Valider project ownership
   - Rate limiting på uploads

3. **Data Privacy**
   - Encrypt sensitive data
   - Secure image URLs (signed URLs)
   - GDPR compliance (sletting)

---

## 11. Konklusjon

### Minimum Viable Implementation:

For å få storyboard-funksjonaliteten til å fungere fullt ut trengs:

1. ✅ **StoryboardStore** - Allerede opprettet
2. ⏳ **StoryboardPersistenceService** - localStorage fallback
3. ⏳ **StoryboardCaptureService** - Capture fra 3D scene
4. ⏳ **StoryboardImageStorageService** - Image upload til R2
5. ⏳ **Backend API** - Database persistence
6. ⏳ **StoryboardSyncService** - Sync mellom frontend og backend

### Prioritering:

**Høy prioritet** (for basic funksjonalitet):
- StoryboardPersistenceService (localStorage)
- StoryboardCaptureService (med placeholder hvis 3D ikke tilgjengelig)

**Medium prioritet** (for production):
- Backend API og database
- StoryboardSyncService
- Image storage

**Lav prioritet** (nice-to-have):
- Scene snapshot loading
- Advanced features (versioning, collaboration)

---

## 12. AI-Modeller for Storyboard Generering (Nedlastbare)

### A. Image Generation Models (Kan lastes ned lokalt)

#### 1. **Stable Diffusion** (Anbefalt)
- **Modeller**:
  - Stable Diffusion 1.5 (4GB) - Basis modell
  - Stable Diffusion XL (6.6GB) - Bedre kvalitet
  - Stable Diffusion 3 Medium (2GB) - Nyere, kompakt
- **Nedlasting**:
  - Hugging Face: https://huggingface.co/stabilityai
  - Civitai: https://civitai.com (community modeller)
- **Kjøring**:
  - ComfyUI (grafisk interface)
  - Automatic1111 WebUI (web interface)
  - Diffusers library (Python)
- **Filer**: `.safetensors` eller `.ckpt` checkpoints
- **Størrelse**: 2-7GB per modell
- **Lisens**: CreativeML Open RAIL-M

#### 2. **FLUX** (State-of-the-art)
- **Modeller**:
  - FLUX.1-dev (23GB) - Beste kvalitet
  - FLUX.1-schnell (5GB) - Rask generering
- **Nedlasting**: Hugging Face (krever godkjenning)
- **Kjøring**: ComfyUI, Automatic1111
- **Størrelse**: 5-23GB
- **Lisens**: Non-commercial research license

#### 3. **SDXL Turbo / Lightning**
- **Modeller**: Raskere varianter av SDXL
- **Størrelse**: 6-7GB
- **Funksjonalitet**: Rask generering (1-4 steg)

### B. Vision Models (Shot Type Detection)

#### 1. **CLIP** (OpenAI)
- **Bruk**: Klassifisere bilder til shot types
- **Nedlasting**: Hugging Face Transformers
- **Størrelse**: ~500MB
- **Python**: `transformers` library

#### 2. **BLIP-2** (Salesforce)
- **Bruk**: Image captioning og understanding
- **Nedlasting**: Hugging Face
- **Størrelse**: ~1-2GB
- **Funksjonalitet**: Bedre forståelse av scene-inhold

### C. Lokal Kjøring Setup

#### Alternativ 1: ComfyUI (Anbefalt for storyboard)
```bash
# Installer ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# Last ned modell
# Plasser .safetensors fil i models/checkpoints/
```

**API Integration**:
- ComfyUI har REST API
- Kan kalle fra backend: `POST http://localhost:8188/prompt`

#### Alternativ 2: Automatic1111
```bash
# Installer
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui
cd stable-diffusion-webui
./webui.sh

# API tilgjengelig på http://localhost:7860
```

#### Alternativ 3: Python Direct (Diffusers)
```python
from diffusers import StableDiffusionPipeline
import torch

# Last ned modell automatisk
pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16
)
pipe = pipe.to("cuda")  # Eller "cpu"

# Generer bilde
image = pipe("a storyboard frame showing a close-up shot").images[0]
```

### D. Modell Anbefalinger for Storyboard

**For Storyboard Generering**:
1. **Stable Diffusion XL** (6.6GB)
   - Best balanse mellom kvalitet og størrelse
   - God støtte for prompts
   - Mange fine-tuned varianter

2. **Realistic Vision** (4GB) - Fine-tuned SD 1.5
   - Bedre for realistiske bilder
   - Civitai: https://civitai.com/models/4201

3. **DreamShaper** (4GB) - Fine-tuned SD 1.5
   - Allsidig modell
   - God for varierte stiler

**For Shot Type Detection**:
1. **CLIP-ViT-B/32** (150MB)
   - Rask klassifisering
   - Pre-trained på store datasett

2. **Custom Fine-tuned Model**
   - Tren på eget datasett med shot types
   - Bruk CLIP som base

### E. Kontroll for Konsistens (ControlNet)

**ControlNet Models** (for konsistent karakter/scene):
- **Canny Edge** (1.4GB) - Følg konturer
- **Depth** (1.4GB) - Følg dybde
- **Pose** (1.4GB) - Følg karakter-posisjon
- **Nedlasting**: Hugging Face

**Bruk**: For å holde samme karakter/scene gjennom storyboard

### F. Backend Integration

**Python Service Eksempel**:
```python
# storyboard_ai_service.py
from diffusers import StableDiffusionPipeline
import torch

class StoryboardAIService:
    def __init__(self):
        self.pipe = None
        self.load_model()
    
    def load_model(self):
        model_path = "./models/stable-diffusion-xl-base-1.0"
        self.pipe = StableDiffusionPipeline.from_pretrained(
            model_path,
            torch_dtype=torch.float16
        )
        self.pipe = self.pipe.to("cuda")
    
    def generate_frame(self, prompt: str, shot_type: str):
        enhanced_prompt = f"{prompt}, {shot_type} shot, storyboard style"
        image = self.pipe(enhanced_prompt).images[0]
        return image
```

**API Endpoint**:
```python
@app.post("/api/storyboards/generate-frame")
async def generate_frame(request: FrameGenerationRequest):
    image = storyboard_ai_service.generate_frame(
        request.prompt,
        request.shot_type
    )
    # Upload til R2 og returner URL
    return {"imageUrl": uploaded_url}
```

### G. Systemkrav

**Minimum**:
- GPU: 4GB VRAM (for SD 1.5)
- RAM: 8GB
- Disk: 10GB ledig plass

**Anbefalt**:
- GPU: 8GB+ VRAM (for SDXL)
- RAM: 16GB+
- Disk: 50GB+ ledig plass

**CPU-only** (tregt, men mulig):
- RAM: 16GB+
- Disk: 20GB+
- Generering tar 30-60 sekunder per bilde

### H. Nedlastingssteder

1. **Hugging Face** (https://huggingface.co)
   - Offisielle modeller
   - Gratis nedlasting
   - Krever konto for noen modeller

2. **Civitai** (https://civitai.com)
   - Community fine-tuned modeller
   - Mange stiler og varianter
   - Gratis nedlasting

3. **Hugging Face Mirror** (https://hf-mirror.com)
   - Alternativ for raskere nedlasting i noen regioner

### I. Lisens og Bruk

**Stable Diffusion**:
- CreativeML Open RAIL-M
- Tillater kommersiell bruk
- Må kreditere opphavspersoner

**FLUX**:
- Non-commercial research license
- Ikke kommersiell bruk uten tillatelse

**Anbefaling**: Bruk Stable Diffusion for kommersiell bruk

---

## 13. Neste Steg

1. Implementer StoryboardPersistenceService
2. Implementer StoryboardCaptureService (med fallback)
3. Opprett backend API endpoints
4. Implementer StoryboardSyncService
5. Integrer image storage
6. **Valgfritt**: Integrer AI image generation (Stable Diffusion)
7. Test og valider

