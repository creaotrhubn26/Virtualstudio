# Hvorfor lagres det så mye i git-historikken?

## Problem

Git-repositoryet inneholder store filer (ML-modeller, bilder, binærfiler) som tar opp mye plass. Dette skjer fordi:

### 1. **Manglende .gitignore regler**

`.gitignore` manglet regler for store filer som:
- ML-modeller (`backend/models/`, `backend/humaniflow/model_files/`)
- Genererte bilder (`attached_assets/`)
- Output-filer (`backend/outputs/`)
- Downloads (`backend/downloads/`)

**Før (gammel .gitignore):**
```
node_modules/
dist/
.vite/
*.log
.DS_Store
```

**Etter (ny .gitignore):**
```
# ML Modeller og store binærfiler
backend/models/
backend/rodin_models/
backend/humaniflow/model_files/
backend/downloads/
backend/test_images/
backend/outputs/
attached_assets/
*.pth
*.tar
...
```

### 2. **Store filer ble committet direkte**

Fra git-loggen ser vi at store filer ble lagt til i commits:

**Eksempler:**
- `backend/humaniflow/model_files/pose_hrnet_w48_384x288.pth` (244MB) - lagt til i en commit
- `backend/humaniflow/model_files/humaniflow_weights.tar` (192MB) - lagt til i en commit
- Mange bilder i `attached_assets/` (1-3MB hver) - lagt til i flere commits
- `backend/outputs/*.glb` filer - lagt til i commits

### 3. **Git lagrer ALL historikk**

Når en fil er committet, blir den lagret i git-historikken **for alltid**, selv om:
- Filen senere slettes
- Filen legges til i `.gitignore`
- Filen endres eller overskrives

Dette er fordi git er et **versjonskontrollsystem** - det lagrer hele historikken for å kunne:
- Se gamle versjoner
- Gjøre `git checkout` til tidligere commits
- Se endringer over tid

### 4. **Største filer i historikken**

Fra analysen:
1. `backend/humaniflow/model_files/pose_hrnet_w48_384x288.pth` - **244MB**
2. `backend/humaniflow/model_files/humaniflow_weights.tar` - **192MB**
3. `backend/humaniflow/assets/teaser.gif` - **12MB**
4. Mange bilder i `attached_assets/` - **1-3MB hver**
5. `backend/outputs/*.glb` filer - varierende størrelse

## Løsning

### Umiddelbart (gjort):
1. ✅ Oppdatert `.gitignore` med regler for store filer
2. ✅ Ryddet opp i garbage (tmp_pack filer) - frigjorde 156GB
3. ✅ Kjørt `git gc` for å komprimere repository

### Fremover:
1. **Ikke commit store filer** - bruk ekstern lagring (S3, R2, etc.)
2. **Sjekk filstørrelse før commit** - bruk `git add` med forsiktighet
3. **Bruk Git LFS** for store filer som må versjoneres
4. **Fjern store filer fra historikken** - bruk `optimize_git.sh` scriptet (OBS: Dette omskriver historikk!)

### Hvis du vil fjerne store filer fra historikken:

**ADVARSEL:** Dette omskriver git-historikken og kan påvirke andre utviklere!

```bash
# 1. Lag backup først
git branch backup-before-cleanup

# 2. Kjør optimaliseringsscriptet
./optimize_git.sh

# 3. Force push (kun hvis du er sikker!)
git push --force --all
```

## Best Practices

### ✅ Gjør:
- Legg store filer i `.gitignore` **før** de committes
- Bruk ekstern lagring for ML-modeller, bilder, videoer
- Bruk Git LFS for store filer som må versjoneres
- Sjekk størrelse på filer før `git add`

### ❌ Ikke gjør:
- Committ ML-modeller direkte (bruk ekstern lagring)
- Committ genererte bilder/videoer
- Committ build-artifakter
- Committ database-filer
- Committ cache-filer

## Hvorfor er dette viktig?

1. **Repository-størrelse**: Store filer gjør repository tregt
2. **Clone-tid**: Det tar lang tid å clone et repository med store filer
3. **Backup-kostnader**: Store repositories koster mer å lagre
4. **Ytelse**: Git-operasjoner blir tregere med store filer

## Nåværende status

- **Før optimalisering**: 158GB (med 156GB garbage)
- **Etter optimalisering**: 578MB
- **Frigjort**: ~157GB

Store filer er fortsatt i historikken, men garbage er ryddet. For å fjerne store filer fra historikken, må du kjøre `optimize_git.sh` (men dette omskriver historikken!).


