# DECA Model Opplasting Status

## ✅ Nedlasting fullført
DECA-modellen er lastet ned fra Google Drive:
- **Fil:** `backend/downloads/deca_model.tar`
- **Størrelse:** 415 MB (414.03 MB)
- **Status:** Klar for opplasting

## ⚠️ Opplasting til R2 feilet
Opplasting til Cloudflare R2 feiler med `Unauthorized` error.

**Årsak:** R2 API token mangler tilstrekkelige rettigheter (read/write access).

## 🔧 Løsning: Bruk samme metode som SAM 3D

Siden SAM 3D-modellene allerede er på R2 og opplastingen fungerte der, bruk samme metode for DECA:

### Metode 1: Cloudflare Dashboard (Anbefalt hvis Python feiler)
1. Gå til [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Velg `ml-models` bucket
3. Naviger til eller opprett `models/deca/` mappen
4. Klikk "Upload" og velg `backend/downloads/deca_model.tar`
5. Filen skal være på: `ml-models/models/deca/deca_model.tar`

### Metode 2: Wrangler CLI (Hvis dette ble brukt for SAM 3D)
```bash
# Installer Wrangler CLI hvis nødvendig
npm install -g wrangler

# Login (hvis ikke allerede logget inn)
wrangler login

# Last opp filen
cd /home/runner/workspace/backend
wrangler r2 object put ml-models/models/deca/deca_model.tar --file=downloads/deca_model.tar
```

### Metode 3: Oppdater R2 API Token Permissions
Hvis du skal bruke Python/AWS CLI-metoden, må R2 API token ha:
1. **Object Read & Write** permissions aktivert
2. Tilgang til `ml-models` bucket spesifikt
3. Opprett ny token med skriverett:
   - Gå til Cloudflare Dashboard → R2 → Manage R2 API Tokens
   - Opprett ny token med "Object Read & Write" permissions
   - Oppdater miljøvariablene `R2_ACCESS_KEY_ID` og `R2_SECRET_ACCESS_KEY`

### Metode 4: Python Script (Etter at permissions er fikset)
Når R2 token har riktige permissions:
```bash
cd /home/runner/workspace/backend
python3 upload_to_r2.py downloads/deca_model.tar models/deca/deca_model.tar
```

## R2 Konfigurasjon
- **Endpoint:** `https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com`
- **Bucket:** `ml-models`
- **Målstier:** `models/deca/deca_model.tar`
- **Access Key:** Må være nøyaktig 32 tegn (kortes automatisk i koden)

## Verifisering etter opplasting
```bash
# Sett miljøvariabel
export ENABLE_DECA=true

# Test nedlasting (burde fungere hvis opplasting lyktes)
python3 -c "
import sys
sys.path.insert(0, '/home/runner/workspace/backend')
from deca_service import deca_service
import asyncio
asyncio.run(deca_service.ensure_model_loaded())
print('DECA lastet:', deca_service.is_model_loaded())
"
```

## Alternativ: Lokal testing
For utvikling/testing kan du kopiere modellen lokalt:
```bash
mkdir -p backend/models/deca
cp backend/downloads/deca_model.tar backend/models/deca/deca_model.tar
```
**Merk:** Dette bypasser R2 og vil ikke fungere i produksjon.

## Neste steg
1. Velg en av metodene over (anbefalt: Cloudflare Dashboard eller Wrangler CLI)
2. Last opp `deca_model.tar` til `models/deca/deca_model.tar` i R2
3. Test at nedlasting fungerer med verifisering-kommandoen over
4. Når modellen er på R2, vil systemet automatisk laste den ned når `ENABLE_DECA=true` er satt
