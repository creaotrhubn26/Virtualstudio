# DECA Model Upload - Løsning

## Status
- ✅ Fil nedlastet: `backend/downloads/deca_model.tar` (414 MB)
- ✅ R2 Endpoint konfigurert: `https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com`
- ✅ Bucket: `ml-models`
- ❌ Upload feiler: "Unauthorized" - R2 token mangler skriverett

## Løsning: Oppdater R2 API Token

### Steg 1: Opprett ny R2 API Token med skriverett

1. Gå til [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Naviger til **R2** → **Manage R2 API Tokens**
3. Klikk **"Create API Token"**
4. Konfigurer token:
   - **Permissions**: `Object Read & Write`
   - **TTL**: (Velg varighet, f.eks. "Never expire")
   - **Buckets**: Velg `ml-models` bucket (eller "All buckets")
5. Klikk **"Create API Token"**
6. **VIKTIG**: Kopier både:
   - **Access Key ID** (ser ut som: `ad28e515...`)
   - **Secret Access Key** (ser ut som: `abc123...`)

### Steg 2: Oppdater miljøvariabler

Oppdater `R2_ACCESS_KEY_ID` og `R2_SECRET_ACCESS_KEY` med de nye verdiene:

```bash
export R2_ACCESS_KEY_ID="ny_access_key_id_her"
export R2_SECRET_ACCESS_KEY="ny_secret_access_key_her"
```

Eller i Replit Secrets (.env eller Secrets):
- `R2_ACCESS_KEY_ID` = (ny access key)
- `R2_SECRET_ACCESS_KEY` = (ny secret key)

### Steg 3: Last opp filen

Etter at credentials er oppdatert:

```bash
cd /home/runner/workspace/backend
python3 upload_to_r2.py downloads/deca_model.tar models/deca/deca_model.tar
```

## Alternativ: Cloudflare Dashboard (Ingen kode)

Hvis du ikke vil oppdatere API token, kan du laste opp via Dashboard:

1. Gå til [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Velg `ml-models` bucket
3. Naviger til eller opprett `models/deca/` mappen
4. Klikk **"Upload"**
5. Velg `backend/downloads/deca_model.tar`
6. Vent til opplasting er ferdig (~5-10 minutter for 414 MB)

## Verifisering

Etter opplasting, test at det fungerer:

```bash
cd /home/runner/workspace/backend
export ENABLE_DECA=true
python3 -c "
import sys
sys.path.insert(0, '/home/runner/workspace/backend')
from deca_service import deca_service
import asyncio
asyncio.run(deca_service.ensure_model_loaded())
print('DECA loaded:', deca_service.is_model_loaded())
"
```

Du skal se: `DECA loaded: True`

## R2 Konfigurasjon (Bekreftet)
- **Endpoint**: `https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com`
- **Bucket**: `ml-models`
- **Målsti**: `models/deca/deca_model.tar`
- **Fil**: `backend/downloads/deca_model.tar` (414.03 MB)



