# Lagringsplass Opprydding - Anbefalinger

## Oversikt
Totalt lagringsplass: **~255GB**

### Største problemområder:

1. **Git repository (.git) - 158GB (62%)**
   - Sannsynligvis store binærfiler (modeller, bilder, videoer) i git-historikken
   - **Løsning**: 
     - Legg til `.gitignore` for store filer
     - Vurder `git filter-branch` eller `git filter-repo` for å fjerne store filer fra historikken
     - Vurder å bruke Git LFS for store filer som må versjoneres

2. **Backend ML-modeller (backend/models) - 59GB (23%)**
   - ML-modeller bør IKKE være i git
   - **Løsning**:
     - Legg til `backend/models/` i `.gitignore`
     - Flytt modeller til ekstern lagring (S3, R2, etc.)
     - Last ned modeller ved behov i produksjon

3. **Hugging Face cache (.cache/huggingface) - 32GB (13%)**
   - Cache kan ryddes hvis ikke i bruk
   - **Løsning**:
     - Slett ubrukte modeller: `huggingface-cli scan-cache`
     - Legg til i `.gitignore`

## Rask opprydding (kan ryddes trygt):

### 1. Build-artifakter og cache
```bash
# Slett build-mapper
rm -rf dist build .next

# Slett Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete

# Slett pip cache (kan lastes ned igjen)
rm -rf .cache/pip
```

### 2. Node modules (kan installeres på nytt)
```bash
# Slett node_modules (vil bli installert på nytt ved npm install)
rm -rf node_modules
```

### 3. Downloads og temporære filer
```bash
# Sjekk hva som er i downloads først
ls -lh backend/downloads/

# Slett hvis ikke nødvendig
rm -rf backend/downloads/*
```

### 4. Hugging Face cache (ubrukte modeller)
```bash
# Installer huggingface-cli hvis ikke installert
pip install huggingface-hub

# Scan cache for å se hva som brukes
huggingface-cli scan-cache

# Slett ubrukte modeller (vær forsiktig!)
# huggingface-cli delete-cache --disable-tqdm
```

## Viktige filer som IKKE skal slettes:

- ✅ `backend/models/` - ML-modeller (men bør flyttes ut av git)
- ✅ `.cache/huggingface/` - Modell-cache (men kan ryddes)
- ✅ `backend/humaniflow/` - Sjekk om dette er nødvendig
- ✅ `.git/` - Git-historikk (men bør ryddes for store filer)

## Anbefalte .gitignore regler:

```gitignore
# ML Modeller
backend/models/
backend/rodin_models/
backend/humaniflow/
backend/downloads/

# Cache
.cache/
__pycache__/
*.pyc
*.pyo
*.pyd

# Build artifacts
dist/
build/
.next/
node_modules/

# Logs
*.log
logs/

# Database
*.db
*.sqlite
*.sqlite3

# Environment
.env
.venv/
venv/
```

## Neste steg:

1. **Umiddelbart**: Legg til `.gitignore` regler for store filer
2. **Kort sikt**: Rydd opp build-artifakter og cache
3. **Middels sikt**: Flytt ML-modeller ut av git og til ekstern lagring
4. **Lang sikt**: Rydd opp git-historikk for store filer


