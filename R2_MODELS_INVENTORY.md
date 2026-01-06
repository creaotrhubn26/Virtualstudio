# Cloudflare R2 - Modeller Inventar

## Oversikt over Modeller i R2 Bucket `ml-models`

Basert på kodeanalyse, følgende modeller er lastet opp og tilgjengelige i Cloudflare R2:

---

## 1. DECA (Detailed Expression Capture and Animation)

**Formål**: Detaljert ansiktsrekonstruksjon og tekstur-generering

**R2 Path**: `models/deca/deca_model.tar`

**Filstørrelse**: ~414 MB

**Service**: `backend/deca_service.py`

**Funksjonalitet**:
- Ansiktsrekonstruksjon fra bilder
- Detaljert tekstur-generering
- Ansiktsuttrykk og animasjon
- CPU-only inference support

**Aktivering**:
- Environment variable: `ENABLE_DECA=true` (default)
- Lazy loading: Lastes ned automatisk ved første bruk

**Bruk**:
```python
from deca_service import deca_service

# Lazy load model
await deca_service.ensure_model_loaded()

# Extract face region
face_region = deca_service.extract_face_region(image_path)

# Enhance face texture
enhanced_face = await deca_service.enhance_face_texture(image_path, face_region)
```

---

## 2. SAM-3D Body (Meta SAM 3D Body)

**Formål**: 3D kroppsmesh-generering fra bilder

**R2 Paths**:
- `Sam-3D/sam-3d-body-dinov3/model.ckpt` (hovedmodell)
- `Sam-3D/sam-3d-body-dinov3/assets/mhr_model.pt` (MHR modell)
- `Sam-3D/sam-3d-body-dinov3/model_config.yaml` (konfigurasjon)

**Service**: `backend/sam3d_service.py`

**Funksjonalitet**:
- Genererer 3D kroppsmesh fra 2D bilder
- Avatar-generering
- CPU-only inference support
- Placeholder fallback hvis modell ikke tilgjengelig

**Aktivering**:
- Alltid aktivert (ingen environment variable)
- Lazy loading: Lastes ned automatisk ved første bruk

**Bruk**:
```python
from sam3d_service import sam3d_service

# Lazy load model
await sam3d_service.ensure_model_loaded()

# Generate 3D avatar
result = await sam3d_service.generate_avatar(image_path)
# Returns: {"success": True, "glb_url": "...", "metadata": {...}}
```

**API Endpoint**:
- `POST /api/generate-avatar` - Generer 3D avatar fra bilde

---

## 3. FaceXFormer

**Formål**: Ansiktsanalyse og landmark-deteksjon

**R2 Paths**: Split i 21 deler (stor fil delt opp):
- `models/facexformer/best_model.pt.partaa`
- `models/facexformer/best_model.pt.partab`
- `models/facexformer/best_model.pt.partac`
- ... (fortsetter til)
- `models/facexformer/best_model.pt.partau`

**Totalt**: 21 deler som reassembles til `best_model.pt`

**Service**: `backend/facexformer_service.py`

**Funksjonalitet**:
- Ansiktslandmark-deteksjon
- Head pose estimation
- Face box detection
- Facial attribute analysis

**Aktivering**:
- Environment variable: `ENABLE_FACEXFORMER=true` (default)
- Lazy loading: Lastes ned og reassembles automatisk ved første bruk

**Bruk**:
```python
from facexformer_service import facexformer_service

# Lazy load model
await facexformer_service.ensure_model_loaded()

# Analyze face
result = await facexformer_service.analyze_face(image_path)
# Returns: {
#   "success": True,
#   "landmarks": [...],
#   "head_pose": {...},
#   "face_box": [...]
# }
```

**API Endpoint**:
- `POST /api/facexformer/analyze` - Analyser ansikt

---

## 4. Email Logos (Ikke ML-modell, men assets)

**R2 Path**: `logos/{unique_id}.{ext}`

**Formål**: Lagring av logoer for email-templates

**Service**: `backend/main.py` - Email logo endpoints

**API Endpoints**:
- `POST /api/email/logo-upload` - Upload logo
- `GET /api/email/logo/{logo_key}` - Serve logo

---

## Modell Status og Tilgjengelighet

### Sjekk Modell Status

**Via API**:
```bash
# Sjekk alle tjenester
curl http://localhost:8000/api/services/status

# Sjekk R2 connection
curl http://localhost:8000/api/test-r2
```

**Via Python**:
```python
from sam3d_service import sam3d_service
from deca_service import deca_service
from facexformer_service import facexformer_service

# Sjekk status
print("SAM-3D:", sam3d_service.model_loaded)
print("DECA:", deca_service.is_model_loaded())
print("FaceXFormer:", facexformer_service.is_model_loaded())
```

### Lazy Loading

Alle modeller bruker **lazy loading**:
- Modeller lastes ikke ved server startup
- Lastes ned fra R2 automatisk ved første bruk
- Cached lokalt etter første nedlasting
- Hvis nedlasting feiler, brukes placeholder/fallback

---

## Modell Bruk i Storyboard Kontekst

### Potensielle Bruksområder:

#### 1. **DECA** - For Storyboard Frames
- **Bruk**: Forbedre ansiktsdetaljer i storyboard frames
- **Scenario**: Når man capture en scene med ansikter, kan DECA forbedre ansiktsregionen
- **Integrasjon**: Via `StoryboardCaptureService` → `deca_service.enhance_face_texture()`

#### 2. **SAM-3D** - For 3D Scene Snapshot
- **Bruk**: Generer 3D representation av scene for storyboard frame
- **Scenario**: Capture scene → generer 3D mesh → lagre som scene snapshot
- **Integrasjon**: Via `StoryboardCaptureService` → `sam3d_service.generate_avatar()`

#### 3. **FaceXFormer** - For Shot Type Detection
- **Bruk**: Analyser ansiktsposisjon for å detektere shot type automatisk
- **Scenario**: Capture frame → analyser ansikt → detekter "Close-up", "Medium", etc.
- **Integrasjon**: Via `StoryboardCaptureService.detectShotType()` → `facexformer_service.analyze_face()`

---

## Modell Nedlasting og Opplasting

### Nedlasting fra R2

Alle modeller lastes automatisk ned ved første bruk. Hvis du vil teste nedlasting manuelt:

```python
from utils.r2_client import download_from_r2
from pathlib import Path

# Download DECA
await download_from_r2(
    "models/deca/deca_model.tar",
    Path("./models/deca/deca_model.tar")
)

# Download SAM-3D
await download_from_r2(
    "Sam-3D/sam-3d-body-dinov3/model.ckpt",
    Path("./models/sam-3d-body-dinov3/model.ckpt")
)
```

### Opplasting til R2

Bruk `upload_to_r2.py` scriptet:

```bash
# Upload DECA
python3 backend/upload_to_r2.py \
  /path/to/deca_model.tar \
  models/deca/deca_model.tar

# Upload SAM-3D
python3 backend/upload_to_r2.py \
  /path/to/model.ckpt \
  Sam-3D/sam-3d-body-dinov3/model.ckpt

# Upload FaceXFormer parts
for part in partaa partab partac ... partau; do
  python3 backend/upload_to_r2.py \
    /path/to/best_model.pt.part${part} \
    models/facexformer/best_model.pt.part${part}
done
```

---

## Systemkrav

### DECA
- **RAM**: ~2GB for modell
- **Disk**: ~500MB (modell + cache)
- **CPU**: Støtter CPU-only inference

### SAM-3D
- **RAM**: ~4GB for modell
- **Disk**: ~2GB (alle filer)
- **CPU**: Støtter CPU-only inference

### FaceXFormer
- **RAM**: ~2GB for modell
- **Disk**: ~1GB (reassembled modell)
- **CPU**: Støtter CPU-only inference

---

## Modell Versjoner og Kilder

### DECA
- **Kilde**: https://github.com/YadiraF/DECA
- **Lisens**: Check DECA repository
- **Versjon**: Pre-trained model

### SAM-3D Body
- **Kilde**: Meta AI Research
- **Lisens**: Check Meta AI license
- **Versjon**: sam-3d-body-dinov3

### FaceXFormer
- **Kilde**: FaceXFormer repository
- **Lisens**: Check FaceXFormer repository
- **Versjon**: best_model.pt

---

## Potensielle Modeller for Storyboard (Ikke i R2 ennå)

### 1. FLUX (Black Forest Labs) ⭐ ANBEFALT

**Formål**: Avansert tekst-til-bilde generering for storyboard frames

**Modeller**:
- **FLUX.1-dev** (23GB) - Beste kvalitet, state-of-the-art
- **FLUX.1-schnell** (5GB) - Rask generering, høy kvalitet
- **FLUX.1-dev-consistency** - For konsistent karakter/scene

**Nedlasting**:
- Hugging Face: `black-forest-labs/FLUX.1-dev` (krever godkjenning)
- Hugging Face: `black-forest-labs/FLUX.1-schnell` (åpen)
- Format: `.safetensors` checkpoints
- **Nedlastingsguide**: Se nedenfor

**Kjøring**:
- ComfyUI (anbefalt for storyboard)
- Automatic1111
- Diffusers library (Python) - for backend API

**Funksjonalitet for Storyboard**:
- Generer storyboard frames fra tekstbeskrivelser
- Høy kvalitet og realisme
- God prompt-følsomhet
- Støtter ControlNet for konsistens
- Bedre tekst-rendering enn SDXL
- Utmerket for film/cinematographic stiler

**R2 Path Foreslått**:
```
models/flux/
  ├── FLUX.1-dev.safetensors (23GB)
  ├── FLUX.1-schnell.safetensors (5GB)
  └── FLUX.1-dev-consistency.safetensors (23GB)
```

**Systemkrav**:
- GPU: 12GB+ VRAM (for FLUX.1-dev), 6GB+ (for schnell)
- RAM: 16GB+
- Disk: 30GB+ per modell

**Lisens**: Non-commercial research license (sjekk for kommersiell bruk)

---

## FLUX Implementasjonsguide

### Steg 1: Nedlasting

#### Alternativ A: Via Hugging Face (Anbefalt)

```bash
# Installer huggingface-hub
pip install huggingface-hub

# For FLUX.1-schnell (åpen, ingen godkjenning)
huggingface-cli download black-forest-labs/FLUX.1-schnell \
  --local-dir ./models/flux/FLUX.1-schnell \
  --local-dir-use-symlinks False

# For FLUX.1-dev (krever godkjenning)
# 1. Gå til https://huggingface.co/black-forest-labs/FLUX.1-dev
# 2. Godkjenn tilgang
# 3. Logg inn: huggingface-cli login
huggingface-cli download black-forest-labs/FLUX.1-dev \
  --local-dir ./models/flux/FLUX.1-dev \
  --local-dir-use-symlinks False
```

#### Alternativ B: Manuel nedlasting

1. Gå til Hugging Face:
   - FLUX.1-schnell: https://huggingface.co/black-forest-labs/FLUX.1-schnell
   - FLUX.1-dev: https://huggingface.co/black-forest-labs/FLUX.1-dev (krever godkjenning)

2. Last ned `.safetensors` filer:
   - `diffusion_pytorch_model.safetensors` (hovedmodell)
   - `diffusion_pytorch_model.fp16.safetensors` (hvis tilgjengelig, mindre størrelse)

3. Last ned config filer:
   - `model_index.json`
   - `scheduler/scheduler_config.json`
   - `text_encoder/config.json`
   - `text_encoder_2/config.json`
   - `vae/config.json`

### Steg 2: Opplasting til R2

```bash
# Upload FLUX.1-schnell
python3 backend/upload_to_r2.py \
  ./models/flux/FLUX.1-schnell/diffusion_pytorch_model.safetensors \
  models/flux/FLUX.1-schnell/diffusion_pytorch_model.safetensors

# Upload config files
python3 backend/upload_to_r2.py \
  ./models/flux/FLUX.1-schnell/model_index.json \
  models/flux/FLUX.1-schnell/model_index.json

# Upload hele mappen (anbefalt)
cd models/flux/FLUX.1-schnell
for file in *; do
  python3 ../../../backend/upload_to_r2.py \
    "$file" \
    "models/flux/FLUX.1-schnell/$file"
done
```

### Steg 3: Backend Service Implementering

**Fil**: `backend/flux_service.py` (ny fil)

```python
"""
FLUX Image Generation Service
Handles loading FLUX model and generating storyboard frames from text.
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
import torch
from PIL import Image
import io
import base64

# Import R2 utilities
from utils.r2_client import download_from_r2, R2_BUCKET_NAME

R2_MODEL_PATH = "models/flux/FLUX.1-schnell"
LOCAL_MODEL_DIR = Path(__file__).parent / "models" / "flux" / "FLUX.1-schnell"

class FLUXService:
    """
    Service for generating storyboard frames using FLUX model.
    """
    
    def __init__(self):
        self.pipe = None
        self.model_loaded = False
        self.model_loading = False
        self.enabled = os.environ.get('ENABLE_FLUX', 'true').lower() == 'true'
        self.device = None
        self._load_lock = asyncio.Lock()
        self._check_availability()
    
    def _check_availability(self):
        """Check if PyTorch and diffusers are available."""
        if not self.enabled:
            print("FLUX is disabled via ENABLE_FLUX=false")
            return
        
        try:
            import torch
            from diffusers import DiffusionPipeline
            
            # Check for GPU
            if torch.cuda.is_available():
                self.device = torch.device("cuda")
                print(f"FLUX: CUDA available, using GPU")
            else:
                self.device = torch.device("cpu")
                print(f"FLUX: Using CPU (will be slow)")
            
            print("FLUX: Diffusers available, model will be loaded on first request")
        except ImportError as e:
            print(f"FLUX: Diffusers not available: {e}")
            self.enabled = False
    
    async def _download_model_from_r2(self):
        """Download FLUX model from R2 if not present locally."""
        if (LOCAL_MODEL_DIR / "diffusion_pytorch_model.safetensors").exists():
            return True
        
        print("Downloading FLUX model from Cloudflare R2...")
        LOCAL_MODEL_DIR.mkdir(parents=True, exist_ok=True)
        
        # Download main model file
        model_file = "diffusion_pytorch_model.safetensors"
        success = await download_from_r2(
            f"{R2_MODEL_PATH}/{model_file}",
            LOCAL_MODEL_DIR / model_file
        )
        
        if not success:
            print("Failed to download FLUX model from R2")
            return False
        
        # Download config files
        config_files = [
            "model_index.json",
            "scheduler/scheduler_config.json",
            "text_encoder/config.json",
            "text_encoder_2/config.json",
            "vae/config.json"
        ]
        
        for config_file in config_files:
            config_path = LOCAL_MODEL_DIR / config_file
            config_path.parent.mkdir(parents=True, exist_ok=True)
            await download_from_r2(
                f"{R2_MODEL_PATH}/{config_file}",
                config_path
            )
        
        print("FLUX model downloaded successfully from R2")
        return True
    
    async def ensure_model_loaded(self):
        """Lazy load the model on first request."""
        if not self.enabled:
            return False
        
        if self.model_loaded:
            return True
        
        async with self._load_lock:
            if self.model_loaded:
                return True
            
            self.model_loading = True
            print("Loading FLUX model on first request...")
            
            try:
                # Download from R2 if needed
                if not (LOCAL_MODEL_DIR / "diffusion_pytorch_model.safetensors").exists():
                    success = await self._download_model_from_r2()
                    if not success:
                        self.model_loading = False
                        return False
                
                # Load model
                await asyncio.get_event_loop().run_in_executor(
                    None, self._load_model
                )
                
                return self.model_loaded
            except Exception as e:
                print(f"Failed to load FLUX model: {e}")
                import traceback
                traceback.print_exc()
                return False
            finally:
                self.model_loading = False
    
    def _load_model(self):
        """Load the FLUX model."""
        try:
            from diffusers import DiffusionPipeline
            
            print("Loading FLUX model (this may take a minute)...")
            
            # Load from local directory
            self.pipe = DiffusionPipeline.from_pretrained(
                str(LOCAL_MODEL_DIR),
                torch_dtype=torch.float16 if self.device.type == "cuda" else torch.float32,
                device_map="auto" if self.device.type == "cuda" else None
            )
            
            if self.device.type == "cpu":
                self.pipe = self.pipe.to(self.device)
            
            self.model_loaded = True
            print("FLUX model loaded successfully!")
        except Exception as e:
            print(f"Failed to load FLUX model: {e}")
            raise
    
    async def generate_frame(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1920,
        height: int = 1080,
        num_inference_steps: int = 20,
        guidance_scale: float = 7.5,
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate a storyboard frame from text prompt.
        
        Args:
            prompt: Text description of the frame
            negative_prompt: What to avoid in the image
            width: Image width (default 1920 for 16:9)
            height: Image height (default 1080 for 16:9)
            num_inference_steps: Number of denoising steps (20-50)
            guidance_scale: How closely to follow prompt (7.5-15)
            seed: Random seed for reproducibility
        
        Returns:
            Dict with image data and metadata
        """
        if not self.model_loaded:
            loaded = await self.ensure_model_loaded()
            if not loaded:
                return {
                    "success": False,
                    "error": "FLUX model not available"
                }
        
        try:
            # Enhance prompt for storyboard
            enhanced_prompt = f"{prompt}, storyboard frame, cinematic, professional photography"
            
            # Generate image
            print(f"Generating FLUX image: {prompt[:50]}...")
            
            generator = None
            if seed is not None:
                generator = torch.Generator(device=self.device).manual_seed(seed)
            
            image = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.pipe(
                    enhanced_prompt,
                    negative_prompt=negative_prompt,
                    width=width,
                    height=height,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    generator=generator
                ).images[0]
            )
            
            # Convert to base64 for API response
            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=95)
            image_bytes = buffer.getvalue()
            image_base64 = base64.b64encode(image_bytes).decode()
            
            return {
                "success": True,
                "image_base64": image_base64,
                "image_bytes": image_bytes,
                "width": width,
                "height": height,
                "prompt": prompt,
                "model": "FLUX.1-schnell"
            }
        except Exception as e:
            print(f"Error generating FLUX image: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded."""
        return self.model_loaded
    
    def is_enabled(self) -> bool:
        """Check if service is enabled."""
        return self.enabled

# Global service instance
flux_service = FLUXService()
```

### Steg 4: Backend API Endpoint

**Legg til i `backend/main.py`**:

```python
from flux_service import flux_service

@app.post("/api/storyboards/generate-frame")
async def generate_storyboard_frame(request: dict):
    """
    Generate a storyboard frame using FLUX.
    
    Request body:
    {
        "prompt": "A close-up shot of a character looking worried",
        "shot_type": "Close-up",
        "negative_prompt": "blurry, low quality",
        "width": 1920,
        "height": 1080,
        "seed": 42
    }
    """
    if not flux_service.is_enabled():
        raise HTTPException(
            status_code=503,
            detail="FLUX service is disabled. Set ENABLE_FLUX=true to enable."
        )
    
    prompt = request.get("prompt", "")
    shot_type = request.get("shot_type", "")
    negative_prompt = request.get("negative_prompt", "blurry, low quality, distorted")
    
    # Enhance prompt with shot type
    if shot_type:
        prompt = f"{shot_type} shot: {prompt}"
    
    result = await flux_service.generate_frame(
        prompt=prompt,
        negative_prompt=negative_prompt,
        width=request.get("width", 1920),
        height=request.get("height", 1080),
        num_inference_steps=request.get("num_inference_steps", 20),
        guidance_scale=request.get("guidance_scale", 7.5),
        seed=request.get("seed")
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    
    # Upload to R2 and return URL
    from utils.r2_client import upload_to_r2, CASTING_ASSETS_BUCKET
    import uuid
    
    frame_id = request.get("frame_id", str(uuid.uuid4()))
    storyboard_id = request.get("storyboard_id", "temp")
    project_id = request.get("project_id", "temp")
    
    r2_key = f"storyboards/{project_id}/{storyboard_id}/frames/{frame_id}/original.jpg"
    
    public_url = upload_to_r2(
        result["image_bytes"],
        r2_key,
        "image/jpeg",
        bucket=CASTING_ASSETS_BUCKET
    )
    
    return JSONResponse({
        "success": True,
        "imageUrl": public_url,
        "imageKey": r2_key,
        "prompt": prompt,
        "model": "FLUX.1-schnell"
    })
```

### Steg 5: Frontend Integration

**Fil**: `src/core/services/storyboardAIGenerationService.ts`

```typescript
interface GenerateFrameRequest {
  prompt: string;
  shotType?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  frameId?: string;
  storyboardId?: string;
  projectId?: string;
}

interface GenerateFrameResponse {
  success: boolean;
  imageUrl: string;
  imageKey: string;
  prompt: string;
  model: string;
}

export class StoryboardAIGenerationService {
  async generateFrame(request: GenerateFrameRequest): Promise<GenerateFrameResponse> {
    const response = await fetch('/api/storyboards/generate-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate frame: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async generateFrameFromShotDescription(
    description: string,
    shotType: string,
    projectId: string,
    storyboardId: string,
    frameId: string
  ): Promise<GenerateFrameResponse> {
    return this.generateFrame({
      prompt: description,
      shotType,
      negativePrompt: "blurry, low quality, distorted, amateur",
      width: 1920,
      height: 1080,
      projectId,
      storyboardId,
      frameId,
    });
  }
}

export const storyboardAIGenerationService = new StoryboardAIGenerationService();
```

### Steg 6: Bruk i StoryboardPanel

```typescript
import { storyboardAIGenerationService } from '../../core/services/storyboardAIGenerationService';

// I StoryboardPanel komponenten
const handleGenerateFrame = async (shotDescription: string, shotType: string) => {
  try {
    const result = await storyboardAIGenerationService.generateFrameFromShotDescription(
      shotDescription,
      shotType,
      projectId,
      currentStoryboard.id,
      `frame-${Date.now()}`
    );
    
    // Legg til frame i storyboard
    addFrame({
      imageUrl: result.imageUrl,
      thumbnailUrl: result.imageUrl, // Generer thumbnail senere
      title: `AI Generated: ${shotType}`,
      description: shotDescription,
      shotType: shotType as ShotType,
      cameraAngle: 'Eye Level',
      cameraMovement: 'Static',
      duration: 3,
      status: 'draft',
    });
  } catch (error) {
    console.error('Failed to generate frame:', error);
  }
};
```

---

## FLUX vs SDXL for Storyboard

| Feature | FLUX.1-schnell | SDXL Base |
|---------|----------------|-----------|
| Kvalitet | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Hastighet | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Tekst-rendering | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Realisme | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Størrelse | 5GB | 6.6GB |
| VRAM | 6GB+ | 8GB+ |
| Kommersiell | ❌ | ✅ |

**Konklusjon**: FLUX gir bedre resultater, men SDXL er bedre for kommersiell bruk.

---

### 2. Stable Diffusion XL (SDXL)

**Formål**: Tekst-til-bilde generering (alternativ til FLUX)

**Modeller**:
- **SDXL Base 1.0** (6.6GB) - Standard SDXL
- **SDXL Turbo** (6.6GB) - Rask generering (1-4 steg)
- **SDXL Lightning** (6.6GB) - Ekstremt rask (1-2 steg)

**Nedlasting**:
- Hugging Face: `stabilityai/stable-diffusion-xl-base-1.0`
- Hugging Face: `stabilityai/sdxl-turbo`
- Civitai: Fine-tuned varianter

**Funksjonalitet for Storyboard**:
- Generer frames fra shot descriptions
- Mange fine-tuned varianter for ulike stiler
- Bedre enn SD 1.5, men ikke like bra som FLUX

**R2 Path Foreslått**:
```
models/sdxl/
  ├── sdxl-base-1.0.safetensors
  └── sdxl-turbo.safetensors
```

**Systemkrav**:
- GPU: 8GB+ VRAM
- RAM: 12GB+
- Disk: 10GB+ per modell

**Lisens**: CreativeML Open RAIL-M (kommersiell bruk OK)

---

### 3. Stable Diffusion 3 (SD3)

**Formål**: Nyere versjon av Stable Diffusion

**Modeller**:
- **SD3 Medium** (2GB) - Kompakt, god kvalitet
- **SD3 Large** (8GB) - Bedre kvalitet

**Nedlasting**:
- Hugging Face: `stabilityai/stable-diffusion-3-medium`
- Format: `.safetensors`

**Funksjonalitet for Storyboard**:
- Bedre tekst-rendering enn SDXL
- God prompt-følsomhet
- Kompakt størrelse (Medium variant)

**R2 Path Foreslått**:
```
models/sd3/
  └── sd3-medium.safetensors
```

**Systemkrav**:
- GPU: 4GB+ VRAM (Medium), 8GB+ (Large)
- RAM: 8GB+
- Disk: 5GB+ per modell

**Lisens**: CreativeML Open RAIL-M (kommersiell bruk OK)

---

### 4. ControlNet Models

**Formål**: Kontrollere generering for konsistens (brukes med SDXL/FLUX)

**Modeller**:
- **Canny Edge** (1.4GB) - Følg konturer
- **Depth** (1.4GB) - Følg dybde
- **Pose** (1.4GB) - Følg karakter-posisjon
- **OpenPose** (1.4GB) - Detaljert pose
- **IP-Adapter** (1.5GB) - Style transfer

**Nedlasting**:
- Hugging Face: `lllyasviel/control_v11p_sd15_canny`
- Hugging Face: `lllyasviel/control_v11f1p_sd15_depth`
- ComfyUI Models: Automatisk nedlasting

**Funksjonalitet for Storyboard**:
- Holde samme karakter/scene gjennom storyboard
- Følge kameravinkler og posisjoner
- Konsistent styling

**R2 Path Foreslått**:
```
models/controlnet/
  ├── control_v11p_sd15_canny.safetensors
  ├── control_v11f1p_sd15_depth.safetensors
  └── control_v11p_sd15_openpose.safetensors
```

**Systemkrav**:
- GPU: +1-2GB VRAM per ControlNet
- RAM: +1GB per ControlNet
- Disk: 2GB per ControlNet

**Lisens**: Apache 2.0 (kommersiell bruk OK)

---

### 5. LoRA Models (Low-Rank Adaptation)

**Formål**: Fine-tune modeller for spesifikke stiler/karakterer

**Eksempler**:
- Character LoRAs
- Style LoRAs (anime, realistic, etc.)
- Storyboard-specific LoRAs

**Nedlasting**:
- Civitai: Mange community LoRAs
- Hugging Face: `civitai/` namespace

**Funksjonalitet for Storyboard**:
- Tilpasse modell til spesifikk visuell stil
- Konsistent karakter-design
- Scene-stil (film noir, sci-fi, etc.)

**R2 Path Foreslått**:
```
models/lora/
  ├── storyboard-style.safetensors
  └── character-consistency.safetensors
```

**Systemkrav**:
- GPU: Minimal overhead (~100MB per LoRA)
- RAM: Minimal
- Disk: 50-200MB per LoRA

**Lisens**: Varierer (sjekk hver LoRA)

---

## Modell Sammenligning for Storyboard

| Modell | Kvalitet | Hastighet | Størrelse | VRAM | Kommersiell |
|--------|----------|-----------|-----------|------|-------------|
| FLUX.1-dev | ⭐⭐⭐⭐⭐ | ⭐⭐ | 23GB | 12GB+ | ❌ |
| FLUX.1-schnell | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 5GB | 6GB+ | ❌ |
| SDXL Base | ⭐⭐⭐⭐ | ⭐⭐⭐ | 6.6GB | 8GB+ | ✅ |
| SDXL Turbo | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 6.6GB | 8GB+ | ✅ |
| SD3 Medium | ⭐⭐⭐⭐ | ⭐⭐⭐ | 2GB | 4GB+ | ✅ |

**Anbefaling for Storyboard**:
- **Best kvalitet**: FLUX.1-dev (hvis ikke-kommersiell)
- **Best balanse**: SDXL Base + ControlNet
- **Raskest**: SDXL Turbo eller FLUX.1-schnell
- **Kompakt**: SD3 Medium

---

## Neste Steg for Storyboard Integration

### Foreslåtte Integrasjoner:

1. **Shot Type Detection** (FaceXFormer)
   - Bruk FaceXFormer for å analysere ansiktsposisjon
   - Detekter automatisk shot type basert på ansiktsstørrelse og posisjon

2. **Face Enhancement** (DECA)
   - Forbedre ansiktsdetaljer i captured frames
   - Legg til som valgfritt steg i capture pipeline

3. **3D Scene Representation** (SAM-3D)
   - Generer 3D mesh av scene for bedre scene snapshot
   - Lagre 3D representation sammen med 2D frame

4. **AI Frame Generation** (FLUX/SDXL)
   - Generer storyboard frames fra tekstbeskrivelser
   - Bruk ControlNet for konsistens
   - Integrer med shot list descriptions

---

## Konklusjon

**Tilgjengelige Modeller i R2**:
- ✅ DECA (ansiktsrekonstruksjon)
- ✅ SAM-3D Body (3D avatar-generering)
- ✅ FaceXFormer (ansiktsanalyse)
- ✅ Email logos (assets)

**Alle modeller**:
- Lastes automatisk ned ved første bruk
- Støtter CPU-only inference
- Har lazy loading implementert
- Har fallback/placeholder hvis modell ikke tilgjengelig

**For Storyboard**:
- Alle tre modeller kan potensielt brukes
- FaceXFormer er mest relevant for automatisk shot type detection
- DECA kan forbedre ansiktskvalitet i frames
- SAM-3D kan generere 3D scene representations

