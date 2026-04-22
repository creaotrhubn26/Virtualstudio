# Quick Migration Guide

## Fasteste måte å migrere på:

### 1. Åpne Browser Console (F12) i nettleseren hvor Virtual Studio kjører

### 2. Lim inn og kjør dette scriptet:

```javascript
// Copy-paste this into browser console:
const STORAGE_KEY = 'virtualStudio_castingProjects';
const data = localStorage.getItem(STORAGE_KEY);
if (data) {
  navigator.clipboard.writeText(data);
  console.log('✅ Data copied! Now:');
  console.log('1. Create file: casting_projects_backup.json');
  console.log('2. Paste content and save');
  console.log('3. Run: python3 migrate_casting_to_db.py casting_projects_backup.json');
} else {
  console.log('❌ No data found. Key:', STORAGE_KEY);
}
```

### 3. Lag filen casting_projects_backup.json

Paste innholdet fra clipboard og lagre som `casting_projects_backup.json`

### 4. Kjør migrasjon:

```bash
# Test først (dry-run):
python3 migrate_casting_to_db.py casting_projects_backup.json --dry-run

# Kjør migrasjon:
python3 migrate_casting_to_db.py casting_projects_backup.json
```

