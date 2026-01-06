# ProjectCreationModal UX/UI Forbedringer

## Overordnet mål
Transformere ProjectCreationModal til en moderne, intuitiv og visuelt tiltalende komponent med bedre brukeropplevelse.

## Hovedområder for forbedring

### 1. Visuell hierarki og layout

**Problem**: Komponenten mangler klar visuell hierarki. Alt er flatt i en lang liste.

**Løsning**:
- Implementer en stepper/wizard-struktur for å dele opp prosessen i logiske steg
- Bruk konsistent spacing-system (4px grid)
- Grupper relaterte felter visuelt med Cards eller Accordions
- Legg til subtile skillelinjer (Dividers) mellom seksjoner
- Forbedre typografi-hierarki med bedre font-weights og størrelser

**Endringer i `src/components/Planning/ProjectCreationModal.tsx`**:
- Legg til `Stepper` med steg: "Grunndata" → "Prosjekttype" → "Integrasjoner" (valgfritt)
- Bruk `Card` med elevation for hver seksjon
- Legg til `Divider` mellom hovedseksjoner
- Standardiser spacing med `sx={{ mt: 3, mb: 3 }}` pattern

### 2. Progressiv disclosure og brukerflyt

**Problem**: For mye informasjon vises samtidig, noe som kan overvelde brukeren.

**Løsning**:
- Implementer `Accordion`-komponenter for valgfrie/seksjoner
- Flytt Virtual Studio-integrasjon til et eget steg eller accordion
- Skjul avanserte alternativer som default (f.eks. Split Sheet, Event Management linking)
- Vis "Hva trenger jeg?"-hjelpetekster med `Tooltip` eller `Info`-ikoner

**Endringer**:
- Wrap Virtual Studio-integrasjon i `Accordion` med `defaultExpanded={false}`
- Legg til "Vis avanserte innstillinger"-toggle
- Flytt Virtual Studio-integrasjon til siste steg eller egen "Integrasjoner"-accordion
- **FJERN Video Editor-integrasjon** (inkludert alle relaterte kode, handlers, og UI-elementer)

### 3. Modern estetikk og visuell design

**Problem**: Komponenten ser utdatert ut og mangler moderne designprinsipper.

**Løsning**:
- Oppdater fargepalett med moderne gradients og subtile skygger
- Forbedre Card-design med bedre border-radius og shadows
- Legg til iconer for bedre visuell scanning
- Bruk konsistente farger basert på profession/config
- Forbedre Virtual Studio-integrasjonskort med bedre gradients og hover-effekter

**Endringer**:
- Oppdater Card `sx` props med moderne styling:
  ```typescript
  sx={{
    borderRadius: 3,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }
  }}
  ```
- Oppdater Virtual Studio-integrasjonskort med bedre gradients og spacing
- Legg til ikoner ved siden av seksjonstitteler
- Bruk profession-spesifikke farger konsistent

### 4. Responsiv design

**Problem**: Komponenten er ikke optimalisert for mobile/tablet.

**Løsning**:
- Implementer responsive spacing og typography
- Bruk `Stack` med `direction={{ xs: 'column', md: 'row' }}` pattern
- Optimaliser dialog størrelse med `fullScreen={isMobile}`
- Juster button størrelser for touch targets (min 44px)

**Endringer**:
- Legg til responsive breakpoints på alle Cards og Containers
- Bruk `useMediaQuery` for å detektere mobile
- Implementer fullScreen dialog på mobile
- Optimaliser button spacing og størrelser

### 5. Visuell feedback og validering

**Problem**: Manglende visuell feedback under utfylling, ingen synlig validering.

**Løsning**:
- Legg til inline validering med feilmeldinger under felter
- Vis loading states for async operasjoner
- Legg til success-indikatorer (checkmarks) for fullførte seksjoner
- Implementer progress indicator i stepper
- Legg til tooltips med hjelpetekster

**Endringer**:
- Legg til `TextField` med `error` og `helperText` props
- Implementer validering utility og vis feil i UI
- Legg til `CircularProgress` eller `LinearProgress` for loading states
- Legg til `CheckCircle` ikoner ved fullførte steg i stepper
- Legg til `Tooltip` ved `InfoIcon` for hjelpetekster

### 6. Accessibility forbedringer

**Problem**: Manglende ARIA labels og keyboard navigation.

**Løsning**:
- Legg til `aria-label` på alle interaktive elementer
- Implementer keyboard navigation for stepper
- Legg til `aria-describedby` for form fields
- Sørg for kontrast-ratios (WCAG AA)

**Endringer**:
- Legg til `aria-label` på alle `IconButton` og `Button`
- Implementer `aria-describedby` på form controls
- Legg til `role` og `aria-live` for dynamisk innhold
- Test med keyboard navigation

## Konkrete implementeringsdetaljer

### Stepper Implementation

```typescript
const steps = [
  { label: 'Grunndata', description: 'Kontakt og prosjektinfo' },
  { label: 'Prosjekttype', description: 'Velg type og innstillinger' },
  { label: 'Integrasjoner', description: 'Koble til Virtual Studio' },
];

// I render:
<Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
  {steps.map((step, index) => (
    <Step key={step.label}>
      <StepLabel
        StepIconComponent={({ active, completed }) => (
          <StepIcon active={active} completed={completed} />
        )}
      >
        {step.label}
      </StepLabel>
      <StepContent>
        <Typography variant="caption" color="text.secondary">
          {step.description}
        </Typography>
      </StepContent>
    </Step>
  ))}
</Stepper>
```

### Accordion for Virtual Studio Integration

```typescript
<Accordion defaultExpanded={false} sx={{ mt: 2 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">Integrasjoner</Typography>
    <Chip 
      label="Valgfritt" 
      size="small" 
      sx={{ ml: 2 }} 
      variant="outlined" 
    />
  </AccordionSummary>
  <AccordionDetails>
    {/* Virtual Studio Integration */}
    {/* Event Management (hvis relevant) */}
  </AccordionDetails>
</Accordion>
```

### Validation Feedback

```typescript
const [errors, setErrors] = useState<Record<string, string>>({});

<TextField
  label="Prosjektnavn"
  value={projectData.projectName}
  onChange={(e) => handleFieldChange('projectName', e.target.value)}
  error={!!errors.projectName}
  helperText={errors.projectName}
  required
  fullWidth
/>
```

### Responsive Card Layout

```typescript
<Card
  sx={{
    mt: { xs: 2, md: 3 },
    mb: { xs: 2, md: 3 },
    p: { xs: 2, md: 3 },
    borderRadius: { xs: 2, md: 3 },
    boxShadow: { xs: 0, md: 2 },
  }}
>
  {/* Content */}
</Card>
```

## Kode som skal fjernes

**Video Editor Integration** - Fjern følgende:
- `handleOpenVideoEditor` callback
- `handleVideoEditorComplete` callback
- `canOpenVideoEditor` useMemo
- Video Editor Integration Card (linjer ~2290-2359)
- Video Editor Info Card (linjer ~2361-2371)
- Imports relatert til Video Editor (MovieCreation icon, EditorToProjectResult type)

## Filstruktur

Ingen nye filer trengs, men vi bør vurdere:
- `src/components/Planning/ProjectCreationStepper.tsx` - Stepper komponent
- `src/components/Planning/ProjectCreationSection.tsx` - Wrapper for seksjoner
- `src/utils/validation/projectValidation.ts` - Validering utility

## Prioritert rekkefølge

1. **Fjern Video Editor-integrasjon** - Rydding først
2. **Stepper/Wizard struktur** - Høyest UX impact
3. **Visuell hierarki (Cards, spacing, typography)** - Umiddelbar visuell forbedring
4. **Accordion for Virtual Studio integrasjon** - Reduserer visuell overbelastning
5. **Responsiv design** - Viktig for mobile brukere
6. **Validering og feedback** - Bedre brukeropplevelse
7. **Accessibility** - Viktig for alle brukere

## Metrikker for suksess

- Redusert scroll-avstand (mindre informasjon synlig samtidig)
- Bedre completion rate (brukere fullfører prosjektet)
- Bedre mobile brukeropplevelse (testet på ulike enheter)
- Redusert support-spørsmål relatert til prosjektopprettelse
- WCAG AA compliance for accessibility
