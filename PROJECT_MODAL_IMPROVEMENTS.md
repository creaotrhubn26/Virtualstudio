# Forbedringer for ProjectCreationModal.tsx

## Overordnet analyse
- **Fil størrelse**: 2776 linjer - for stor for en enkelt komponent
- **useEffect hooks**: 14 stk - kan optimaliseres
- **Console statements**: 11 stk - bør bruke logger utility
- **Komponent kompleksitet**: Høy - bør deles opp

## Prioriterte forbedringer

### 1. Komponent oppdeling (Høy prioritet)

Del opp i mindre, gjenbrukbare komponenter:

```
ProjectCreationModal/
  ├── ProjectCreationModal.tsx (hovedkomponent)
  ├── components/
  │   ├── ContactPicker.tsx
  │   ├── ProjectTypeSelector.tsx
  │   ├── ContactProjectInfoSummary.tsx
  │   ├── WeddingTimelineSection.tsx
  │   ├── EventTimelineSection.tsx
  │   ├── VideoEditorIntegration.tsx
  │   ├── VirtualStudioIntegration.tsx
  │   └── SplitSheetSetup.tsx
  ├── hooks/
  │   ├── useProjectCreation.ts
  │   ├── useMeetingPreferences.ts
  │   └── useProjectTypeTracking.ts
  └── utils/
      ├── projectTypeHelpers.ts
      └── validation.ts
```

**Fordeler:**
- Lettere å teste
- Bedre gjenbrukbarhet
- Enklere vedlikehold
- Bedre performance (memoization)

### 2. Performance optimalisering (Medium prioritet)

**Problemer:**
- Mange unødvendige re-renders
- Manglende memoization

**Løsning:**
```typescript
// Bruk useMemo for filtrerte lister
const availableProjectTypes = useMemo(() => {
  return Object.entries(PROJECT_TYPES)
    .filter(([key]) => !isCastingPlanner || key !== 'wedding');
}, [isCastingPlanner]);

// Bruk useCallback for event handlers
const handleProjectTypeChange = useCallback((e: SelectChangeEvent<string>) => {
  const selectedTypeId = e.target.value;
  setProjectData((prev) => ({
    ...prev,
    projectType: selectedTypeId,
    weddingCulture: !isCastingPlanner && selectedTypeId === 'wedding' 
      ? prev.weddingCulture 
      : 'norsk',
  }));
  // Track usage...
}, [isCastingPlanner, trackUsage, dynamicProjectTypes]);
```

### 3. Logging og feilhåndtering (Medium prioritet)

**Problem:**
- 11 console.log/warn/error statements
- Inconsistent feilhåndtering

**Løsning:**
```typescript
// Bruk logger utility i stedet
import { logger } from '../../core/services/logger';

const log = logger.module('ProjectCreationModal');

// Erstatt alle console statements
log.warn('Failed to load meeting preferences', error);
log.info('User authenticated:', user.email);
```

### 4. Type safety forbedringer (Medium prioritet)

**Problemer:**
- Mange `any` types
- Manglende interfaces for komplekse objekter

**Løsning:**
```typescript
// Definer typer for projectData
interface ProjectData {
  projectName: string;
  clientName: string;
  clientEmail: string;
  projectType: ProjectType;
  weddingCulture?: string;
  // ... alle felter
}

type ProjectType = 
  | 'wedding' 
  | 'portrait' 
  | 'event' 
  | 'commercial'
  // ... alle typer

// Bruk generiske typer for hooks
const [projectData, setProjectData] = useState<ProjectData>({...});
```

### 5. State management (Low-Medium prioritet)

**Problem:**
- Mye lokalt state
- Kompleks state interdependencies

**Løsning:**
```typescript
// Vurder å bruke useReducer for kompleks state
const [projectData, dispatch] = useReducer(projectDataReducer, initialState);

// Eller bruk custom hook
const {
  projectData,
  updateProjectData,
  resetProjectData,
  validateProjectData
} = useProjectForm(initialData, isCastingPlanner);
```

### 6. Validering (Low-Medium prioritet)

**Problem:**
- Ingen synlig validering i UI
- Validering skjer kun ved submit

**Løsning:**
```typescript
// Legg til validering utility
const validateProjectData = (data: ProjectData): ValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!data.projectName?.trim()) {
    errors.projectName = 'Prosjektnavn er påkrevd';
  }
  
  if (!data.clientName?.trim()) {
    errors.clientName = 'Klientnavn er påkrevd';
  }
  
  // ... flere valideringer
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Bruk i komponent
const validation = useMemo(
  () => validateProjectData(projectData),
  [projectData]
);
```

### 7. Constants ekstraksjon (Low prioritet)

**Problem:**
- Hardkodede verdier i komponenten

**Løsning:**
```typescript
// Flytt til constants fil
export const PROJECT_CREATION_DEFAULTS = {
  MEETING_TIME: '10:00',
  MEETING_DURATION: 60,
  MEMORY_CARD_BUDGET: 'mid' as const,
  // ...
} as const;
```

### 8. Casting Planner spesifikk forbedring (Høy prioritet)

**Problem:**
- Mye conditional rendering med `!isCastingPlanner`
- Logikk spredt utover komponenten

**Løsning:**
```typescript
// Lag separat Casting Planner versjon eller bedre abstraksjon
const ProjectCreationForm = ({ mode, ...props }) => {
  if (mode === 'casting') {
    return <CastingProjectCreationForm {...props} />;
  }
  return <FullProjectCreationForm {...props} />;
};

// Eller bruk render props pattern
<ProjectCreationForm
  renderSection={(section) => {
    if (section === 'wedding-timeline' && isCastingPlanner) return null;
    return <SectionRenderer section={section} />;
  }}
/>
```

## Konkrete refactoring steg

### Fase 1: Ekstraksjon av sub-komponenter
1. Flytt `ContactPicker` til egen komponent
2. Flytt `ProjectTypeSelector` til egen komponent  
3. Flytt `ContactProjectInfoSummary` til egen komponent

### Fase 2: Custom hooks
1. Lag `useProjectForm` hook for state management
2. Lag `useMeetingPreferences` hook
3. Lag `useProjectTypeTracking` hook

### Fase 3: Utilities og types
1. Flytt helpers til utils filer
2. Definer typer og interfaces
3. Lag validering utility

### Fase 4: Performance
1. Legg til memoization hvor nødvendig
2. Optimaliser useEffect dependencies
3. Vurder code splitting

### Fase 5: Testing og dokumentasjon
1. Legg til unit tests for komponenter
2. Legg til integration tests
3. Oppdater dokumentasjon

## Eksempel: Refactored ProjectTypeSelector

```typescript
// components/ProjectTypeSelector.tsx
import React, { useMemo } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import { PROJECT_TYPES } from '../constants/projectTypes';

interface ProjectTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  isCastingPlanner?: boolean;
  customTypes?: Array<{ id: number; name: string; usageCount?: number }>;
  onTrackUsage?: (id: number) => void;
}

export const ProjectTypeSelector: React.FC<ProjectTypeSelectorProps> = ({
  value,
  onChange,
  isCastingPlanner = false,
  customTypes = [],
  onTrackUsage
}) => {
  const availableTypes = useMemo(() => {
    return Object.entries(PROJECT_TYPES)
      .filter(([key]) => !isCastingPlanner || key !== 'wedding');
  }, [isCastingPlanner]);

  const handleChange = (e: SelectChangeEvent<string>) => {
    const selectedTypeId = e.target.value;
    onChange(selectedTypeId);
    
    // Track usage if custom type
    const customType = customTypes.find(
      t => t.name.toLowerCase() === selectedTypeId
    );
    if (customType && onTrackUsage) {
      onTrackUsage(customType.id);
    }
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="project-type-label">Velg prosjekttype</InputLabel>
      <Select
        labelId="project-type-label"
        value={value || ''}
        onChange={handleChange}
      >
        {availableTypes.map(([key, type]) => {
          const IconComponent = type.icon;
          return (
            <MenuItem key={key} value={key}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconComponent sx={{ fontSize: 20, color: 'primary.main' }} />
                {type.name}
              </Box>
            </MenuItem>
          );
        })}
        
        {!isCastingPlanner && customTypes.length > 0 && (
          <>
            <MenuItem disabled sx={{ opacity: 0.6, fontWeight: 600 }}>
              — Custom Types —
            </MenuItem>
            {customTypes.map((type) => (
              <MenuItem key={type.id} value={type.name.toLowerCase()}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Folder sx={{ fontSize: 20, color: 'secondary.main' }} />
                  {type.name}
                  {type.usageCount > 0 && (
                    <Chip 
                      label={`${type.usageCount}x`} 
                      size="small" 
                      sx={{ ml: 'auto', height: 18 }} 
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </>
        )}
      </Select>
    </FormControl>
  );
};
```

## Anbefalt rekkefølge for implementering

1. **Start med komponent oppdeling** - Høyest ROI
2. **Forbedre type safety** - Reduserer bugs
3. **Legg til validering** - Bedre UX
4. **Performance optimalisering** - Skalerbarhet
5. **Logging og feilhåndtering** - Production readiness

## Metrikker for suksess

- **Fil størrelse**: Redusert fra 2776 til ~500-800 linjer per fil
- **Komponent kompleksitet**: Max 200-300 linjer per komponent
- **Test coverage**: Minst 70% for nye komponenter
- **Performance**: Ingen merkbare re-renders
- **Type safety**: 0 `any` types i nye kode












