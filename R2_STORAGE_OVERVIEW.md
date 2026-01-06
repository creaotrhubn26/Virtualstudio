# Cloudflare R2 Storage - Oversikt

## Nåværende Konfigurasjon

### Buckets

1. **`ml-models`** (Hovedbucket)
   - **Endpoint**: `https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com`
   - **Tilgang**: Private (krever autentisering)
   - **Bruk**: ML-modeller og private assets

2. **`casting-assets`** (Public bucket)
   - **Public URL**: `https://pub-casting.r2.dev`
   - **Tilgang**: Public-read
   - **Bruk**: Public casting assets (logoer, bilder, etc.)

### Credentials

**Environment Variables**:
- `CLOUDFLARE_R2_ACCESS_KEY_ID` (eller `R2_ACCESS_KEY_ID` for backward compatibility)
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` (eller `R2_SECRET_ACCESS_KEY` for backward compatibility)

**Konfigurasjon**:
- S3-compatible API
- Signature version: s3v4
- Region: auto

---

## Eksisterende Struktur i R2

### `ml-models` Bucket

Basert på kode og dokumentasjon, følgende strukturer eksisterer:

#### 1. ML Models
```
ml-models/
  ├── models/
  │   ├── deca/
  │   │   └── deca_model.tar
  │   └── Sam-3D/
  │       └── sam-3d-body-dinov3/
  │           └── model.ckpt
  └── [andre ML-modeller]
```

**Bruksområde**:
- DECA (facial reconstruction)
- SAM-3D (3D body estimation)
- FaceXFormer
- Andre ML-modeller

#### 2. Email Logos
```
ml-models/
  └── logos/
      └── {unique_id}.{ext}
```

**Bruksområde**:
- Email logo uploads
- Endpoint: `/api/email/logo-upload`
- Serve: `/api/email/logo/{logo_key}`

### `casting-assets` Bucket

**Struktur** (antatt):
```
casting-assets/
  └── [public assets for casting planner]
```

**Public URL Format**:
- `https://pub-casting.r2.dev/{r2_key}`

---

## Eksisterende Funksjonalitet

### 1. R2 Client Utility (`backend/utils/r2_client.py`)

**Funksjoner**:
- `get_r2_client()` - Hent S3-compatible client
- `upload_to_r2()` - Upload fil til R2
- `download_from_r2()` - Download fil fra R2
- `check_file_exists_in_r2()` - Sjekk om fil eksisterer
- `list_r2_files()` - List filer med prefix

**Eksempel bruk**:
```python
from utils.r2_client import upload_to_r2, CASTING_ASSETS_BUCKET

# Upload til public bucket
url = upload_to_r2(
    file_bytes=image_bytes,
    r2_key="storyboards/project123/frame1.jpg",
    content_type="image/jpeg",
    bucket=CASTING_ASSETS_BUCKET
)
# Returns: "https://pub-casting.r2.dev/storyboards/project123/frame1.jpg"
```

### 2. Upload Script (`backend/upload_to_r2.py`)

**Bruk**:
```bash
python upload_to_r2.py <local_file> <r2_path>
```

**Eksempel**:
```bash
python upload_to_r2.py deca_model.tar models/deca/deca_model.tar
```

**Funksjoner**:
- Støtter multipart upload for filer >100MB
- Automatisk chunking for store filer
- Progress feedback

### 3. Backend API Endpoints

#### Email Logo Upload
- **POST** `/api/email/logo-upload`
  - Upload logo til `ml-models/logos/`
  - Returnerer URL: `/api/email/logo/{logo_key}`
  
- **GET** `/api/email/logo/{logo_key:path}`
  - Serve logo fra R2 via proxy

#### R2 Test Endpoint
- **GET** `/api/test-r2`
  - Test R2 connection
  - List Sam-3D models

---

## Foreslått Struktur for Storyboards

### Alternativ 1: Bruk `casting-assets` Bucket (Anbefalt)

**Fordeler**:
- Allerede konfigurert som public-read
- Public URL allerede satt opp
- Logisk plassering for casting-relaterte assets

**Struktur**:
```
casting-assets/
  └── storyboards/
      ├── {projectId}/
      │   ├── {storyboardId}/
      │   │   ├── frames/
      │   │   │   ├── {frameId}/
      │   │   │   │   ├── original.{ext}
      │   │   │   │   └── thumbnail.{ext}
      │   │   │   └── ...
      │   │   └── metadata.json (optional)
      │   └── ...
      └── ...
```

**Eksempel paths**:
- `storyboards/proj-123/sb-456/frames/frame-789/original.jpg`
- `storyboards/proj-123/sb-456/frames/frame-789/thumbnail.jpg`

**Public URLs**:
- `https://pub-casting.r2.dev/storyboards/proj-123/sb-456/frames/frame-789/original.jpg`
- `https://pub-casting.r2.dev/storyboards/proj-123/sb-456/frames/frame-789/thumbnail.jpg`

### Alternativ 2: Ny `storyboards` Bucket

**Fordeler**:
- Dedikert bucket for storyboards
- Enklere å administrere
- Separate permissions

**Ulemper**:
- Må sette opp ny bucket
- Må konfigurere public URL

---

## Implementasjonsforslag

### StoryboardImageStorageService

**Fil**: `src/core/services/storyboardImageStorageService.ts`

```typescript
import { upload_to_r2, CASTING_ASSETS_BUCKET } from '../../../backend/utils/r2_client';

interface UploadResult {
  imageUrl: string;
  thumbnailUrl: string;
  imageKey: string;
  thumbnailKey: string;
}

class StoryboardImageStorageService {
  async uploadFrameImage(
    imageBlob: Blob,
    frameId: string,
    storyboardId: string,
    projectId: string
  ): Promise<UploadResult> {
    // Generate R2 keys
    const imageKey = `storyboards/${projectId}/${storyboardId}/frames/${frameId}/original.jpg`;
    const thumbnailKey = `storyboards/${projectId}/${storyboardId}/frames/${frameId}/thumbnail.jpg`;
    
    // Generate thumbnail
    const thumbnailBlob = await this.generateThumbnail(imageBlob, 300, 169);
    
    // Upload to R2 via backend API
    const imageResponse = await fetch('/api/storyboards/upload-image', {
      method: 'POST',
      body: createFormData(imageBlob, imageKey, projectId, storyboardId, frameId)
    });
    
    const thumbnailResponse = await fetch('/api/storyboards/upload-image', {
      method: 'POST',
      body: createFormData(thumbnailBlob, thumbnailKey, projectId, storyboardId, frameId)
    });
    
    return {
      imageUrl: `https://pub-casting.r2.dev/${imageKey}`,
      thumbnailUrl: `https://pub-casting.r2.dev/${thumbnailKey}`,
      imageKey,
      thumbnailKey
    };
  }
  
  async generateThumbnail(
    imageBlob: Blob,
    maxWidth: number,
    maxHeight: number
  ): Promise<Blob> {
    // Create canvas and resize
    const img = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
    canvas.width = img.width * ratio;
    canvas.height = img.height * ratio;
    
    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
    });
  }
}
```

### Backend API Endpoint

**Fil**: `backend/main.py`

```python
@app.post("/api/storyboards/upload-image")
async def upload_storyboard_image(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    storyboard_id: str = Form(...),
    frame_id: str = Form(...),
    is_thumbnail: bool = Form(False)
):
    """Upload storyboard frame image to R2."""
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_TYPES = {'image/png', 'image/jpeg', 'image/jpg', 'image/webp'}
    
    # Validate
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    
    # Generate R2 key
    file_type = "thumbnail" if is_thumbnail else "original"
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    r2_key = f"storyboards/{project_id}/{storyboard_id}/frames/{frame_id}/{file_type}.{file_ext}"
    
    # Upload to R2
    try:
        from utils.r2_client import upload_to_r2, CASTING_ASSETS_BUCKET
        
        public_url = upload_to_r2(
            file_bytes,
            r2_key,
            file.content_type,
            bucket=CASTING_ASSETS_BUCKET
        )
        
        return JSONResponse({
            "success": True,
            "url": public_url,
            "key": r2_key
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/storyboards/images/{image_key:path}")
async def get_storyboard_image(image_key: str):
    """Serve storyboard image from R2 (proxy)."""
    try:
        from utils.r2_client import get_r2_client, CASTING_ASSETS_BUCKET
        
        client = get_r2_client()
        response = client.get_object(Bucket=CASTING_ASSETS_BUCKET, Key=image_key)
        
        return StreamingResponse(
            response['Body'],
            media_type=response['ContentType']
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="Image not found")
```

---

## Nåværende Filer i R2 (Basert på kode)

### Bekreftede Filer:

1. **DECA Model**
   - Path: `models/deca/deca_model.tar`
   - Tjeneste: `deca_service.py`

2. **SAM-3D Model**
   - Path: `Sam-3D/sam-3d-body-dinov3/model.ckpt`
   - Tjeneste: `sam3d_service.py`

3. **Email Logos**
   - Path: `logos/{unique_id}.{ext}`
   - Endpoint: `/api/email/logo-upload`

### Antatte Filer:

- FaceXFormer modeller (referert i `facexformer_service.py`)
- Andre ML-modeller som brukes av tjenestene

---

## Neste Steg for Storyboard Integration

1. ✅ **R2 Client allerede konfigurert** - Kan brukes direkte
2. ⏳ **Opprett backend endpoint** - `/api/storyboards/upload-image`
3. ⏳ **Implementer StoryboardImageStorageService** - Frontend service
4. ⏳ **Test upload/download** - Verifiser funksjonalitet
5. ⏳ **Integrer med storyboardStore** - Auto-upload ved capture

---

## Kostnader og Limits

**Cloudflare R2 Pricing** (per 2024):
- **Storage**: $0.015 per GB/måned
- **Class A Operations** (writes): $4.50 per million
- **Class B Operations** (reads): $0.36 per million
- **Egress**: Gratis (ingen egress fees)

**Estimert kostnad for storyboards**:
- 1000 storyboards med 10 frames hver = 10,000 bilder
- Gjennomsnittlig bilde: 2MB (original) + 50KB (thumbnail)
- Total storage: ~20GB
- **Månedlig kostnad**: ~$0.30

**Limits**:
- Ingen harde limits på bucket size
- Ingen limits på antall objekter
- Rate limiting: 1000 requests/sekund per bucket

---

## Sikkerhet

### Nåværende Setup:

1. **Private Bucket** (`ml-models`):
   - Krever autentisering
   - Brukes for ML-modeller og private assets

2. **Public Bucket** (`casting-assets`):
   - Public-read access
   - Brukes for public assets
   - **Anbefaling**: Bruk signed URLs for storyboards hvis de skal være private

### Anbefalinger for Storyboards:

**Alternativ 1: Public Access** (enklest)
- Alle storyboard bilder er public
- Rask tilgang, ingen autentisering
- **Ulempe**: Alle kan se bildene hvis de har URL

**Alternativ 2: Signed URLs** (sikrere)
- Generer signed URLs med utløpstid
- Krever backend proxy for å generere URLs
- **Fordel**: Kontrollert tilgang

**Anbefaling**: Start med public access, implementer signed URLs senere hvis nødvendig.

---

## Testing

### Test R2 Connection:

```bash
# Test via API
curl http://localhost:8000/api/test-r2

# Test via Python
python -c "
from utils.r2_client import list_r2_files
files = list_r2_files(prefix='models/')
print(files)
"
```

### Test Upload:

```python
from utils.r2_client import upload_to_r2, CASTING_ASSETS_BUCKET

# Test upload
with open('test.jpg', 'rb') as f:
    url = upload_to_r2(
        f.read(),
        'storyboards/test/frame1/original.jpg',
        'image/jpeg',
        bucket=CASTING_ASSETS_BUCKET
    )
    print(f"Uploaded to: {url}")
```

---

## Konklusjon

**Nåværende Status**:
- ✅ R2 er konfigurert og fungerer
- ✅ To buckets tilgjengelig: `ml-models` (private) og `casting-assets` (public)
- ✅ Upload/download funksjonalitet eksisterer
- ✅ Backend API pattern allerede etablert

**For Storyboards**:
- ✅ Kan bruke eksisterende `casting-assets` bucket
- ✅ Kan bruke eksisterende `upload_to_r2()` funksjon
- ⏳ Trenger ny backend endpoint for storyboard images
- ⏳ Trenger frontend service for image upload

**Anbefaling**: Bruk `casting-assets` bucket med strukturen:
```
casting-assets/storyboards/{projectId}/{storyboardId}/frames/{frameId}/
```




