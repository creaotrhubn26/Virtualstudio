# Persistence Audit

## Scope
Static scan of the frontend (src/**/*.ts, src/**/*.tsx) and backend (backend/**/*.py) for:
- localStorage/sessionStorage/indexedDB usage
- API calls (fetch/HTTP)

This is a code-level audit, not a runtime verification.

## Summary
The app is not fully database-persistent. It currently mixes:
- Local-only persistence (localStorage)
- Hybrid persistence (API with localStorage fallback)
- API-only persistence
- In-memory UI state

## Local-only persistence (not DB-backed)
These features persist to localStorage without a guaranteed database write:
- Branding settings defaults in [src/config/branding.ts](src/config/branding.ts)
- Legacy casting planner session/admin/profession state (panel removed)
- Draft project creation data in [src/components/Planning/NewProjectCreationModal.tsx](src/components/Planning/NewProjectCreationModal.tsx)
- Overlay UI collapsed state in [src/main.ts](src/main.ts)
- Grammar/ML preferences and models in [src/services/grammarMLService.ts](src/services/grammarMLService.ts)
- Script word bank (localStorage service) in [src/services/scriptWordBank.ts](src/services/scriptWordBank.ts)
- Shot list favorites in [src/components/CastingShotListPanel.tsx](src/components/CastingShotListPanel.tsx)
- Character autocomplete recents/counts in [src/components/CharacterAutocomplete.tsx](src/components/CharacterAutocomplete.tsx)
- User equipment inventory in [src/hooks/useUserEquipmentInventory.ts](src/hooks/useUserEquipmentInventory.ts)
- Studio preferences and snapshots in [src/core/api/virtualStudioApi.ts](src/core/api/virtualStudioApi.ts)
- Marketplace products/installed/reviews/favorites in [src/services/marketplaceService.ts](src/services/marketplaceService.ts)
- Scene collaboration logs/comments/reviews/notifications in [src/services/sceneCollaborationService.ts](src/services/sceneCollaborationService.ts)
- Manuscript templates/recents in [src/services/manuscriptTemplateService.ts](src/services/manuscriptTemplateService.ts)
- Scene sync/offline flag in [src/services/sceneSyncService.ts](src/services/sceneSyncService.ts)
- Scene variations in [src/services/sceneVariationService.ts](src/services/sceneVariationService.ts)
- Scene scheduler tasks in [src/services/sceneSchedulerService.ts](src/services/sceneSchedulerService.ts)
- Webhooks list in [src/services/webhookService.ts](src/services/webhookService.ts)

## Hybrid persistence (API + localStorage fallback)
These services try the API but fall back to localStorage when the DB is unavailable:
- Casting projects and shot lists in [src/services/castingService.ts](src/services/castingService.ts)
- Manuscripts and related entities in [src/services/manuscriptService.ts](src/services/manuscriptService.ts)
- Story logic in [src/services/storyLogicService.ts](src/services/storyLogicService.ts)
- Scene composer data in [src/services/sceneComposerService.ts](src/services/sceneComposerService.ts)
- Scene needs in [src/services/sceneNeedsService.ts](src/services/sceneNeedsService.ts)
- Character profiles in [src/services/characterProfileService.ts](src/services/characterProfileService.ts)
- Lower third templates in [src/services/lowerThirdTemplatesService.ts](src/services/lowerThirdTemplatesService.ts)
- Equipment categories in [src/services/equipmentCategoriesService.ts](src/services/equipmentCategoriesService.ts)
- Word bank DB service with fallback in [src/services/scriptWordBankDb.ts](src/services/scriptWordBankDb.ts)

## API-only persistence (DB-backed)
These services write directly to backend endpoints without localStorage fallback:
- Casting DB service in [src/services/castingDbService.ts](src/services/castingDbService.ts)
- Consent flows in [src/services/consentService.ts](src/services/consentService.ts)
- Casting pools in [src/services/auditionPoolService.ts](src/services/auditionPoolService.ts), [src/services/candidatePoolService.ts](src/services/candidatePoolService.ts), and [src/services/rolePoolService.ts](src/services/rolePoolService.ts)
- Production workflow in [src/services/productionWorkflowService.ts](src/services/productionWorkflowService.ts)
- Split sheets in [src/services/splitSheetApiService.ts](src/services/splitSheetApiService.ts)
- Brush presets in [src/services/brushLibraryService.ts](src/services/brushLibraryService.ts)
- Studio API service in [src/services/virtualStudioApiService.ts](src/services/virtualStudioApiService.ts)

## In-memory only (no persistence unless wired elsewhere)
- UI state such as tabs, filters, dialog open flags, and temporary selections (legacy casting planner panel removed)

## Backend notes
- Backend includes a localStorage export page for casting in [backend/main.py](backend/main.py)

## Gaps blocking "everything DB-persistent"
- Local-only features lack API endpoints and server-side storage models.
- Hybrid services still allow local-only persistence when API fails; they are not DB-guaranteed.
- Many UI preferences and cached data are intentionally stored only in localStorage.

## Recommended migration plan (full app)
1) **Define persistence policy**
   - Decide which data must be DB-persistent vs cache-only (some local caches should remain local for performance and offline use).
2) **Create backend endpoints + storage**
   - Add tables/models and CRUD APIs for each local-only feature.
3) **Migrate clients**
   - Replace localStorage writes with API writes and cache optionally.
4) **Backfill and migration**
   - Add one-time migration from localStorage to DB on first run.
5) **Remove or reduce fallbacks**
   - Keep local caching, but ensure DB is the source of truth.

## Next steps
If you want me to implement full DB persistence, I will proceed in phases and start by:
- Branding settings
- Virtual studio session/profession data
- Draft project creation data

Then expand to remaining local-only and hybrid services.
