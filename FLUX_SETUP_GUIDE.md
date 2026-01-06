# FLUX Setup Guide

## Steg 1: Installer Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Dette installerer:
- `diffusers>=0.21.0` - For FLUX model loading
- `transformers>=4.30.0` - For text encoders
- `accelerate>=0.20.0` - For efficient model loading
- `torch>=2.0.0` - PyTorch (allerede installert)
- `huggingface-hub>=0.16.0` - For model download (allerede installert)

## Steg 2: Last ned FLUX Modell

### Alternativ A: Automatisk nedlasting (Anbefalt)

```bash
cd backend
python download_flux_model.py
```

Dette laster ned FLUX.1-schnell (5GB) til `./models/flux/FLUX.1-schnell/`

### Alternativ B: Manuel nedlasting

1. Gå til: https://huggingface.co/black-forest-labs/FLUX.1-schnell
2. Last ned alle filer
3. Plasser dem i `backend/models/flux/FLUX.1-schnell/`

**Viktige filer som må lastes ned:**
- `diffusion_pytorch_model.safetensors` (hovedmodell, ~5GB)
- `model_index.json`
- `scheduler/scheduler_config.json`
- `text_encoder/config.json`
- `text_encoder_2/config.json`
- `vae/config.json`

## Steg 3: Last opp til R2

### Automatisk opplasting (Anbefalt)

```bash
cd backend
python upload_flux_to_r2.py --model-dir ./models/flux/FLUX.1-schnell
```

Dette laster opp alle filer til R2 under `models/flux/FLUX.1-schnell/`

### Manuel opplasting

```bash
# Upload hovedmodell
python upload_to_r2.py \
  ./models/flux/FLUX.1-schnell/diffusion_pytorch_model.safetensors \
  models/flux/FLUX.1-schnell/diffusion_pytorch_model.safetensors

# Upload config filer
python upload_to_r2.py \
  ./models/flux/FLUX.1-schnell/model_index.json \
  models/flux/FLUX.1-schnell/model_index.json

# Upload scheduler config
python upload_to_r2.py \
  ./models/flux/FLUX.1-schnell/scheduler/scheduler_config.json \
  models/flux/FLUX.1-schnell/scheduler/scheduler_config.json

# Upload text encoder configs
python upload_to_r2.py \
  ./models/flux/FLUX.1-schnell/text_encoder/config.json \
  models/flux/FLUX.1-schnell/text_encoder/config.json

python upload_to_r2.py \
  ./models/flux/FLUX.1-schnell/text_encoder_2/config.json \
  models/flux/FLUX.1-schnell/text_encoder_2/config.json

# Upload VAE config
python upload_to_r2.py \
  ./models/flux/FLUX.1-schnell/vae/config.json \
  models/flux/FLUX.1-schnell/vae/config.json
```

## Steg 4: Test Service

### Test via Python

```bash
cd backend
python test_flux_service.py
```

### Test via API

```bash
# Sjekk service status
curl http://localhost:8000/api/health

# Generer et frame
curl -X POST http://localhost:8000/api/storyboards/generate-frame \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A close-up shot of a character looking worried, dramatic lighting",
    "shot_type": "Close-up",
    "project_id": "test-project",
    "storyboard_id": "test-storyboard",
    "frame_id": "test-frame-1"
  }'
```

## Steg 5: Test i UI

1. Start backend server
2. Åpne StoryboardPanel i frontend
3. Klikk "Generate with AI" knapp
4. Skriv inn en beskrivelse
5. Klikk "Generate Frame"
6. Vent 10-30 sekunder (generering tar tid)
7. Frame skal dukke opp i storyboardet

## Troubleshooting

### Problem: "Diffusers not available"

**Løsning:**
```bash
pip install diffusers transformers accelerate
```

### Problem: "Model not found in R2"

**Løsning:**
1. Sjekk at modellen er lastet opp:
   ```bash
   python -c "from utils.r2_client import list_r2_files; print(list_r2_files('models/flux/'))"
   ```
2. Hvis tom, last opp modellen (se Steg 3)

### Problem: "CUDA out of memory"

**Løsning:**
- FLUX.1-schnell krever minst 6GB VRAM
- Hvis du ikke har GPU, vil den bruke CPU (veldig tregt)
- Vurder å bruke SDXL i stedet (krever mindre VRAM)

### Problem: "Model loading takes forever"

**Løsning:**
- Første gang modellen lastes ned fra R2 kan ta tid (5GB)
- Etter første nedlasting caches den lokalt
- Sjekk internettforbindelse og R2 credentials

### Problem: "Generation fails"

**Løsning:**
1. Sjekk at alle config filer er lastet opp til R2
2. Sjekk logs for detaljerte feilmeldinger
3. Test med enklere prompt først

## Verifisering

Etter oppsett, verifiser at alt fungerer:

```bash
# 1. Sjekk service status
curl http://localhost:8000/api/health | jq '.flux'

# 2. Test generering
python backend/test_flux_service.py

# 3. Test via API
curl -X POST http://localhost:8000/api/storyboards/generate-frame \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "project_id": "test", "storyboard_id": "test", "frame_id": "test"}'
```

## Neste Steg

Når FLUX er satt opp og testet:

1. ✅ Modellen er i R2
2. ✅ Service fungerer
3. ✅ API endpoint responderer
4. ✅ UI-integrasjon fungerer

Du kan nå:
- Generere storyboard frames fra tekstbeskrivelser
- Bruke shot descriptions fra casting planner
- Automatisk generere frames basert på shot lists

## Performance Tips

- **GPU**: Generering tar 5-15 sekunder
- **CPU**: Generering tar 30-60 sekunder (ikke anbefalt)
- **Batch**: Generer ikke for mange frames samtidig
- **Caching**: Modellen caches lokalt etter første nedlasting

## Kostnader

- **Storage**: ~5GB i R2 = ~$0.075/måned
- **Generation**: ~$0.0001 per frame (Class A operations)
- **Bandwidth**: Gratis (ingen egress fees)




