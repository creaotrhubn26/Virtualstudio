# DECA Model Upload med Wrangler - Status

## Problem
- ✅ Wrangler er installert
- ❌ Fil er for stor: 414 MB (Wrangler grense: 300 MB)
- ❌ Wrangler krever autentisering for remote upload (`wrangler login`)

## Wrangler Feilmeldinger

### 1. Lokal upload (uten --remote)
```
Upload complete.
```
Men dette lastet opp til lokal Wrangler, ikke remote R2.

### 2. Remote upload (med --remote)
```
Error: Wrangler only supports uploading files up to 300 MiB in size
models/deca/deca_model.tar is 414 MiB in size
```

### 3. Autentisering
```
You are not authenticated. Please run `wrangler login`.
```

## Løsninger

### Løsning 1: Wrangler Login (hvis fil var <300 MB)
For filer under 300 MB, kan du bruke:
```bash
cd /home/runner/workspace/backend
wrangler login
# Følg instruksjonene for å autentisere
wrangler r2 object put ml-models/models/deca/deca_model.tar --file=downloads/deca_model.tar --remote
```

### Løsning 2: Cloudflare Dashboard (Anbefalt for store filer)
Siden filen er over 300 MB, er Cloudflare Dashboard den beste løsningen:

1. Gå til https://dash.cloudflare.com
2. Naviger til R2 → `ml-models` bucket
3. Naviger til eller opprett `models/deca/` mappen
4. Klikk "Upload" og velg `backend/downloads/deca_model.tar`
5. Filen vil være tilgjengelig på: `ml-models/models/deca/deca_model.tar`

### Løsning 3: Oppdater R2 Token Permissions (for Python/boto3)
Hvis du vil bruke Python-scriptet, må R2 API token ha skriverett:

1. Gå til Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Opprett ny token med:
   - **Permissions**: Object Read & Write
   - **Bucket**: ml-models (eller alle buckets)
3. Oppdater miljøvariabler:
   ```bash
   export R2_ACCESS_KEY_ID="ny_access_key"
   export R2_SECRET_ACCESS_KEY="ny_secret_key"
   ```
4. Deretter:
   ```bash
   cd /home/runner/workspace/backend
   python3 upload_to_r2.py downloads/deca_model.tar models/deca/deca_model.tar
   ```

### Løsning 4: Splitt fil (Avansert)
Hvis du absolutt må bruke Wrangler, kan du splitte filen i mindre deler:
```bash
# Splitt filen (ikke anbefalt, komplekst)
split -b 200M downloads/deca_model.tar deca_model.tar.part
# Last opp hver del
# Kombiner dem på R2 (kompleks)
```

## Anbefaling
**Bruk Cloudflare Dashboard** (Løsning 2) - det er den enkleste og mest pålitelige metoden for filer over 300 MB.




