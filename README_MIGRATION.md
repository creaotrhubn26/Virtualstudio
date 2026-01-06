# 🚀 Casting Planner - Database Migration

## Quick Start

### Steg 1: Eksporter localStorage-data

**Enklest metode - HTML-fil:**
1. Åpne `export_localstorage_casting.html` i nettleseren
2. Klikk "Eksporter localStorage Data"
3. Klikk "Last ned som fil"
4. Lagre som `casting_projects_backup.json`

**Alternativ - Browser Console:**
```javascript
copy(localStorage.getItem('virtualStudio_castingProjects'))
```
Paste innholdet i filen `casting_projects_backup.json`

### Steg 2: Kjør migrasjon

```bash
# Test først (anbefalt):
python3 migrate_casting_to_db.py casting_projects_backup.json --dry-run

# Kjør migrasjon:
python3 migrate_casting_to_db.py casting_projects_backup.json
```

### Steg 3: Verifiser

```bash
python3 psql_wrapper.py 'YOUR_CONNECTION_STRING' -c "SELECT COUNT(*) FROM casting_projects;"
```

## Detaljert guide

Se `MIGRATION_GUIDE.md` for full dokumentasjon.












