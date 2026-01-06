---
name: Split Sheet Portal Integration
overview: Integrere alle split sheet-komponenter i SplitSheetPortalView med en fullstendig kontrakt-editorkomponent som fungerer sammen med juridiske forslag og referanser. Alt skal synkroniseres med NewProjectCreationModal og SplitSheetEditor, og følge Casting Planner-design.
todos:
  - id: create-contract-interface
    content: Opprett ContractEditingInterface komponent med rich text editor, auto-fylling fra split sheet, og integrasjon med legal suggestions/references
    status: completed
  - id: refactor-split-sheet-viewer
    content: Refaktorere SplitSheetViewer med tabs for Comments, Legal, Contracts, Export og oppdatere til Casting Planner design
    status: completed
  - id: refactor-related-contracts
    content: Refaktorere RelatedContractsSection med Casting Planner design og knapp for å åpne ContractEditingInterface
    status: completed
    dependencies:
      - create-contract-interface
  - id: refactor-comments
    content: Refaktorere SplitSheetComments med Casting Planner design og responsive styling
    status: completed
  - id: refactor-export
    content: Refaktorere SplitSheetExport med Casting Planner design og responsive styling
    status: completed
  - id: enhance-legal-suggestions
    content: Legg til funksjonalitet i SplitSheetLegalSuggestions for å anvende forslag i kontrakt (auto-apply + manuell)
    status: completed
    dependencies:
      - create-contract-interface
  - id: enhance-legal-references
    content: "Legg til funksjonalitet i SplitSheetLegalReferences for å legge til referanser i kontrakt. VIKTIG: Sørg for at det bruker Lovdata API (ikke AI-generert)"
    status: completed
    dependencies:
      - create-contract-interface
  - id: integrate-portal-view
    content: Integrere alle komponenter i SplitSheetPortalView med tabs/accordion og responsive design
    status: completed
    dependencies:
      - refactor-split-sheet-viewer
      - refactor-related-contracts
      - refactor-comments
      - refactor-export
      - enhance-legal-suggestions
      - enhance-legal-references
  - id: sync-draft-functionality
    content: Sørge for at kontrakt-data synkroniseres med draft-funksjonaliteten i NewProjectCreationModal. Legg til knapp i NewProjectCreationModal for å vise kontrakter, og sørg for at RelatedContractsSection vises når man åpner prosjektet
    status: completed
    dependencies:
      - create-contract-interface
      - refactor-related-contracts
  - id: create-types
    content: Opprett/utvid TypeScript interfaces for Contract i types.ts
    status: completed
  - id: test-integration
    content: Test at alle komponenter fungerer sammen, synkronisering fungerer, og responsive design på alle breakpoints
    status: pending
    dependencies:
      - integrate-portal-view
      - sync-draft-functionality
---

#Split Sheet Portal Integration og Kontrakt System

## Oversikt

Integrere alle split sheet-komponenter i `SplitSheetPortalView` og opprette et fullstendig kontrakt-system hvor alle komponenter jobber sammen. Systemet skal synkronisere med `NewProjectCreationModal` og `SplitSheetEditor`, og følge Casting Planner-design.

## Arkitektur

```javascript
SplitSheetPortalView (Hovedkomponent)
├── SplitSheetViewer (Read-only visning)
├── RelatedContractsSection (Liste over kontrakter)
├── SplitSheetComments (Kommentarer)
├── SplitSheetExport (Eksport-funksjonalitet)
├── SplitSheetLegalSuggestions (AI-genererte forslag)
├── SplitSheetLegalReferences (Juridiske referanser)
└── ContractEditingInterface (Ny komponent - kontrakt editor)
    ├── Integrerer med LegalSuggestions (auto-apply + manuell)
    ├── Integrerer med LegalReferences (vis relevante lover)
    └── Synkroniserer med SplitSheet data
```



## Implementasjonsplan

### 1. Opprette ContractEditingInterface komponent

**Fil**: `src/components/split-sheets/ContractEditingInterface.tsx`

- **Props**:
- `splitSheetId: string`
- `projectId?: string`
- `splitSheetData?: SplitSheet`
- `onSave: (contract: Contract) => void`
- `onCancel: () => void`
- `profession?: string`
- **Funksjonalitet**:
- Rich text editor for kontrakt-innhold (bruk @tiptap/react som allerede er installert)
- Seksjoner: Partene, Forpliktelser, Betingelser, Betalinger, Juridiske referanser
- Auto-fylling fra split sheet data (contributors, percentages, etc.)
- Integrasjon med LegalSuggestions (vis aksepterte forslag, tillat manuell valg)
- Integrasjon med LegalReferences (vis relevante lover, legg til i kontrakt)
- Draft-funksjonalitet (synkronisert med NewProjectCreationModal)
- Responsive design (xs, sm, md, lg, xl)
- **State Management**:
- Local state for kontrakt-innhold
- Query for å laste eksisterende kontrakt
- Mutation for å lagre kontrakt
- Synkronisering med split sheet data

### 2. Refaktorere SplitSheetViewer

**Fil**: `src/components/split-sheets/SplitSheetViewer.tsx`

- Legg til tabs/seksjoner for:
- Overview (eksisterende)
- Comments (SplitSheetComments)
- Legal (SplitSheetLegalSuggestions + SplitSheetLegalReferences)
- Contracts (RelatedContractsSection + ContractEditingInterface)
- Export (SplitSheetExport)
- Oppdater styling til Casting Planner design:
- Responsive breakpoints (xs, sm, md, lg, xl)
- Casting Planner farger og ikoner
- Konsistent spacing og typography

### 3. Refaktorere RelatedContractsSection

**Fil**: `src/components/split-sheets/RelatedContractsSection.tsx`

- Oppdater til Casting Planner design (erstatt useTheming med Casting Planner styling)
- Legg til knapp for å åpne ContractEditingInterface
- Vis kontrakter med status, signatur-status, etc.
- **Sørg for at komponenten vises når man åpner prosjektet i NewProjectCreationModal**
- Responsive design (xs, sm, md, lg, xl)
- Fikse queryKey (fjern komma-feil: `['/api/contracts,', 'project', projectId]` → `['contracts', 'project', projectId]`)

### 4. Refaktorere SplitSheetComments

**Fil**: `src/components/split-sheets/SplitSheetComments.tsx`

- Oppdater styling til Casting Planner design
- Responsive design
- Forbedre UI/UX

### 5. Refaktorere SplitSheetExport

**Fil**: `src/components/split-sheets/SplitSheetExport.tsx`

- Oppdater styling til Casting Planner design
- Responsive design
- Forbedre eksport-options

### 6. Refaktorere SplitSheetLegalSuggestions

**Fil**: `src/components/split-sheets/SplitSheetLegalSuggestions.tsx`

- Legg til funksjonalitet for å anvende forslag i kontrakt:
- "Anvend i kontrakt" knapp
- Auto-apply for aksepterte forslag
- Callback til ContractEditingInterface
- Oppdater styling til Casting Planner design
- Responsive design

### 7. Refaktorere SplitSheetLegalReferences

**Fil**: `src/components/split-sheets/SplitSheetLegalReferences.tsx`

- **VIKTIG**: LegalReferences skal være integrert med Lovdata API (ikke AI-generert)
- Sørg for at komponenten bruker `/api/norwegian-laws` endpoint for å hente lover fra Lovdata
- Legg til funksjonalitet for å legge til referanser i kontrakt:
- "Legg til i kontrakt" knapp
- Vis relevante referanser når man skriver kontrakt
- Oppdater styling til Casting Planner design
- Responsive design

### 8. Integrere i SplitSheetPortalView

**Fil**: `src/components/split-sheets/SplitSheetPortalView.tsx`

- Legg til state for å vise/redigere kontrakt
- Integrer alle komponenter:
- SplitSheetViewer (når split sheet er valgt)
- RelatedContractsSection
- ContractEditingInterface (i dialog)
- SplitSheetComments
- SplitSheetExport
- SplitSheetLegalSuggestions
- SplitSheetLegalReferences
- Legg til tabs eller accordion for å organisere komponenter
- Responsive design

### 9. Synkronisering med NewProjectCreationModal og SplitSheetEditor

**Filer**:

- `src/components/Planning/NewProjectCreationModal.tsx`
- `src/components/split-sheets/SplitSheetEditor.tsx`
- **Legg til knapp i NewProjectCreationModal for å vise kontrakter**:
- Når man åpner/redigerer et prosjekt, legg til en knapp (f.eks. "Vis kontrakter" eller ikon)
- Knappen skal åpne en dialog eller ekspandere en seksjon som viser RelatedContractsSection
- RelatedContractsSection skal vise alle kontrakter knyttet til prosjektet (via projectId)
- Sørg for at kontrakt-data synkroniseres med draft-funksjonaliteten
- Oppdater autosave til å inkludere kontrakt-data
- Sørg for at projectId brukes konsistent
- Når man velger et prosjekt fra project selector, skal tilhørende kontrakter vises i RelatedContractsSection

### 10. Opprette TypeScript interfaces

**Fil**: `src/components/split-sheets/types.ts` (utvid eksisterende)

- Legg til `Contract` interface:
  ```typescript
        interface Contract {
          id?: string;
          project_id?: string;
          split_sheet_id?: string;
          title: string;
          content: string;
          parties: ContractParty[];
          obligations: ContractObligation[];
          payment_terms: PaymentTerm[];
          legal_references: string[]; // IDs fra LegalReferences
          applied_suggestions: string[]; // IDs fra LegalSuggestions
          status: 'draft' | 'pending_signatures' | 'signed' | 'archived';
          created_at?: string;
          updated_at?: string;
        }
  ```




### 11. Backend API endpoints (hvis nødvendig)

- `/api/contracts` - CRUD for kontrakter
- `/api/contracts/{contractId}/apply-suggestion` - Anvend juridisk forslag
- `/api/contracts/{contractId}/add-reference` - Legg til juridisk referanse

### 12. Dependencies

Sjekk og installer eventuelle manglende dependencies:

- @tiptap/react (allerede installert)
- Eventuelle andre som trengs for kontrakt-editor

## Data Flow

```javascript
NewProjectCreationModal
  └─> SplitSheetEditor
       └─> SplitSheetPortalView
            ├─> SplitSheetViewer
            │    ├─> SplitSheetComments
            │    ├─> SplitSheetExport
            │    ├─> SplitSheetLegalSuggestions
            │    │    └─> ContractEditingInterface (anvend forslag)
            │    └─> SplitSheetLegalReferences
            │         └─> ContractEditingInterface (legg til referanse)
            └─> RelatedContractsSection
                 └─> ContractEditingInterface (rediger/opprett kontrakt)
```



## Responsive Design

Alle komponenter skal støtte:

- `xs` (mobile)
- `sm` (tablet)
- `md` (720p HD)
- `lg` (1080p Full HD)
- `xl` (2K/4K UHD)

## Testing

- Test at alle komponenter fungerer sammen
- Test synkronisering med draft-funksjonalitet
- Test responsive design på alle breakpoints
- Test at juridiske forslag og referanser fungerer med kontrakt-editor

## Notater

- ContractEditingInterface skal være en standalone komponent som kan åpnes i en dialog
- Juridiske forslag skal både auto-applies og tillate manuell valg
- Alt skal følge Casting Planner design og ikoner
- **VIKTIG**: LegalReferences skal være integrert med Lovdata API (ikke AI-generert) - bruk `/api/norwegian-laws` endpoint