# Quick Start: DECA Model Opplasting

## Problem
Filen `deca_model.tar` finnes ikke lokalt og må lastes ned først.

## Løsning 1: Last ned og last opp med Python

```bash
cd backend

# Steg 1: Last ned modellen (hvis tilgjengelig online)
python3 download_deca.py

# Steg 2: Last opp til R2
python3 upload_to_r2.py downloads/deca_model.tar models/deca/deca_model.tar
```

## Løsning 2: Last ned manuelt og last opp

### Nedlasting:
1. Gå til [DECA GitHub](https://github.com/YadiraF/DECA)
2. Følg instruksjoner i README for nedlasting
3. Vanligvis finnes modellen på:
   - Google Drive link (sjekk GitHub README)
   - Eller må bygges fra koden

### Opplasting:
```bash
cd backend
python3 upload_to_r2.py /path/to/your/deca_model.tar models/deca/deca_model.tar
```

## Løsning 3: Bruk Python direkte (hvis du har filen)

```bash
cd backend
python3 upload_to_r2.py /full/path/to/deca_model.tar models/deca/deca_model.tar
```

## Sjekk R2 credentials

Før opplasting, sjekk at miljøvariablene er satt:
```bash
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY
```

## Hvis modellen ikke finnes online

DECA-modellen kan være vanskelig å få tak i automatisk. Du kan:
1. Kontakte DECA-forfattere for direkte link
2. Bygge modellen fra DECA repository
3. Bruke en alternativ face enhancement løsning

## Verifisering

Etter opplasting, test at det fungerer:
```bash
# Sett miljøvariabel
export ENABLE_DECA=true

# Test at modellen lastes ned (via API eller direkte test)
python3 -c "import sys; sys.path.insert(0, 'backend'); from deca_service import deca_service; import asyncio; asyncio.run(deca_service.ensure_model_loaded())"
```




