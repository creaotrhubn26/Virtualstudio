# DECA Model Nedlasting og Opplasting

## Problem
Automatisk nedlasting fra GitHub releases fungerer ikke (404 error). Modellen må lastes ned manuelt.

## Løsning 1: Last ned fra Google Drive (Anbefalt)

DECA-modellen er vanligvis tilgjengelig på Google Drive. Sjekk [DECA GitHub README](https://github.com/YadiraF/DECA) for oppdaterte lenker.

1. Gå til DECA GitHub repository: https://github.com/YadiraF/DECA
2. Sjekk README.md for "Download pre-trained model" eller "Google Drive" link
3. Last ned `deca_model.tar` til din lokale maskin
4. Last opp til R2:

```bash
cd backend
python3 upload_to_r2.py /path/to/downloaded/deca_model.tar models/deca/deca_model.tar
```

## Løsning 2: Bygg fra kildekode

Hvis modellen ikke er tilgjengelig for nedlasting:

1. Klon DECA repository:
```bash
git clone https://github.com/YadiraF/DECA.git
cd DECA
```

2. Følg instruksjoner i DECA README for å generere/hente modellen

3. Når `deca_model.tar` er klar, last opp:
```bash
cd ../workspace/backend
python3 upload_to_r2.py /path/to/DECA/deca_model.tar models/deca/deca_model.tar
```

## Løsning 3: Bruk alternativ kilde

Hvis du allerede har DECA-modellen et annet sted:

```bash
cd backend
python3 upload_to_r2.py /full/path/to/your/deca_model.tar models/deca/deca_model.tar
```

## Verifisering etter opplasting

Etter at modellen er lastet opp til R2:

1. Test at den kan lastes ned:
```bash
export ENABLE_DECA=true
python3 -c "
import sys
sys.path.insert(0, 'backend')
from deca_service import deca_service
import asyncio
asyncio.run(deca_service.ensure_model_loaded())
print('DECA service loaded:', deca_service.is_model_loaded())
"
```

2. Test via API:
```bash
# Kall avatar generation API med ENABLE_DECA=true
# Sjekk loggene for "Downloading models/deca/deca_model.tar from R2..."
```

## R2 Path
Modellen skal lastes opp til: `models/deca/deca_model.tar` i R2 bucket `ml-models`

## R2 Credentials
Sørg for at miljøvariablene er satt:
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## Hvis modellen fortsatt ikke finnes

DECA-modellen er ikke kritisk for grunnfunksjonaliteten. Systemet fungerer uten den:
- Texture extraction fungerer fortsatt (Fase 1)
- DECA er kun for ekstra ansiktsforbedring (Fase 3)
- Systemet faller automatisk tilbake hvis DECA ikke er tilgjengelig




