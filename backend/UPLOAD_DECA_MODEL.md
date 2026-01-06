# Upload DECA Model to Cloudflare R2

## Forberedelse

1. **Last ned DECA-modellen** fra [DECA GitHub repository](https://github.com/YadiraF/DECA) eller fra offisiell kilde.

2. **Modell-filer som trengs:**
   - `deca_model.tar` (hovedmodell, ~200MB)

## Opplastings-instruksjoner

### Metode 1: Bruk upload-scriptet

```bash
cd backend
python3 upload_to_r2.py /path/to/deca_model.tar models/deca/deca_model.tar
```

### Metode 2: Bruk AWS CLI direkte

```bash
aws s3 cp deca_model.tar s3://ml-models/models/deca/deca_model.tar \
  --endpoint-url=https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com
```

### Metode 3: Bruk Python direkte

```python
import boto3
from botocore.config import Config

R2_ENDPOINT = "https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com"
R2_BUCKET_NAME = "ml-models"

client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=os.environ.get('R2_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('R2_SECRET_ACCESS_KEY'),
    config=Config(signature_version='s3v4'),
    region_name='auto'
)

client.upload_file('deca_model.tar', R2_BUCKET_NAME, 'models/deca/deca_model.tar')
```

## Miljøvariabler

Sørg for at følgende miljøvariabler er satt:
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## Verifisering

Etter opplasting, kan du teste at modellen kan lastes ned ved å:

1. Set `ENABLE_DECA=true` i miljøvariabler
2. Kall avatar generation API-endepunktet
3. Sjekk loggene for "Downloading models/deca/deca_model.tar from R2..."

## R2 Path Struktur

Modeller skal lastes opp til følgende struktur:
```
ml-models/
├── Sam-3D/
│   └── sam-3d-body-dinov3/
│       ├── model.ckpt
│       ├── assets/mhr_model.pt
│       └── model_config.yaml
├── facexformer/
│   └── best_model.pt.part{aa-au}
└── deca/
    └── deca_model.tar  ← Ny modell
```




