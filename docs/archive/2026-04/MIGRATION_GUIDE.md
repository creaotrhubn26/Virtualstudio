# Virtual Studio Data Migration Guide

## Oversikt

Dette dokumentet beskriver hvordan du migrerer eksisterende casting project data fra JSONB-feltet til de normaliserte database-tabellene.

## Hva migreres?

Data migreres fra `casting_projects.data` JSONB til følgende normaliserte tabeller:
- `casting_roles` - Roller
- `casting_candidates` - Kandidater
- `casting_crew` - Crew-medlemmer
- `casting_locations` - Lokasjoner
- `casting_shot_lists` - Shot lists

## Hvordan kjøre migrasjonen

### 1. Dry Run (anbefalt først)

Kjør først en "dry run" for å se hva som vil bli migrert uten å faktisk endre databasen:

```bash
cd backend
python migrate_casting_data.py
```

Dette vil vise:
- Hvor mange prosjekter som vil bli migrert
- Hvor mange roles, candidates, crew, locations, og shot lists som finnes
- Eventuelle feil som kan oppstå

### 2. Migrer alle prosjekter

Når du er klar, kjør migrasjonen med `--execute` flagget:

```bash
cd backend
python migrate_casting_data.py --execute
```

### 3. Migrer et enkelt prosjekt

For å migrere bare ett spesifikt prosjekt:

```bash
cd backend
python migrate_casting_data.py --project <project_id> --execute
```

## Eksempel output

```
============================================================
DRY RUN: Migrating 5 projects
============================================================

[DRY RUN] Migrating project: Test Prosjekt (project-123)
  Found 3 roles to migrate
  Found 5 candidates to migrate
  Found 2 crew members to migrate
  Found 1 locations to migrate
  Found 0 shot lists to migrate
  [DRY RUN] Would migrate project project-123

============================================================
Migration Summary:
  Projects processed: 5
  Projects migrated: 5
  Total roles: 15
  Total candidates: 25
  Total crew: 10
  Total locations: 5
  Total shot lists: 0
============================================================
```

## Viktige notater

1. **Backup først**: Sørg for å ta backup av databasen før du kjører migrasjonen
2. **Dry run anbefalt**: Kjør alltid dry run først for å se hva som vil skje
3. **Ingen data slettes**: Migrasjonen kopierer data, den sletter ikke fra JSONB-feltet
4. **Idempotent**: Du kan kjøre migrasjonen flere ganger - den vil oppdatere eksisterende data

## Etter migrasjonen

Etter at migrasjonen er fullført:
1. Verifiser at data er korrekt migrert ved å sjekke tabellene
2. Test at Virtual Studio fungerer korrekt med den nye strukturen
3. Du kan eventuelt fjerne data fra JSONB-feltet senere (men ikke nødvendig)

## Feilsøking

Hvis du opplever problemer:
1. Sjekk at database-tilkoblingen fungerer
2. Sjekk at alle tabeller eksisterer (kjør `database_schema_casting.sql` hvis nødvendig)
3. Sjekk loggene for spesifikke feilmeldinger
