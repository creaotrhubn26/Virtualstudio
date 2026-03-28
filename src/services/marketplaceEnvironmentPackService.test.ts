import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateMock = vi.fn(async () => ({
  success: true,
  provider: 'heuristic_environment_validation',
  evaluation: {
    provider: 'heuristic_environment_validation',
    verdict: 'approved',
    overallScore: 0.84,
    categories: {
      promptFidelity: { score: 0.84, notes: [] },
      compositionMatch: { score: 0.82, notes: [] },
      lightingIntentMatch: { score: 0.83, notes: [] },
      technicalIntegrity: { score: 0.81, notes: [] },
      roomRealism: { score: 0.8, notes: [] },
    },
    suggestedAdjustments: [],
    validatedAt: '2026-03-27T00:00:00Z',
  },
}));

const capturePreviewMock = vi.fn(async () => 'data:image/jpeg;base64,preview');
const maybeStoreThumbnailMock = vi.fn(async (_id: string, thumbnail?: string | null) => thumbnail || undefined);
const publishEnvironmentPackMock = vi.fn(async (product: any) => product);
const validateReleaseMock = vi.fn(async () => ({
  ready: true,
  score: 0.84,
  checkedAt: '2026-03-27T00:00:00Z',
  blockingIssues: [],
  warnings: [],
  checks: [],
}));
const getInstalledPackageMock = vi.fn(() => null);
let actorMock = {
  userId: 'test-user',
  name: 'Test User',
  role: 'producer',
  isAdmin: false,
};

vi.mock('./environmentValidationService', () => ({
  environmentValidationService: {
    validate: validateMock,
  },
}));

vi.mock('./environmentPreviewCaptureService', () => ({
  environmentPreviewCaptureService: {
    capturePreview: capturePreviewMock,
  },
}));

vi.mock('./sceneAssetStorageService', () => ({
  sceneAssetStorageService: {
    maybeStoreThumbnail: maybeStoreThumbnailMock,
  },
}));

vi.mock('./marketplaceRegistryService', () => ({
  marketplaceRegistryService: {
    publishEnvironmentPack: publishEnvironmentPackMock,
    validateRelease: validateReleaseMock,
  },
}));

vi.mock('./marketplaceActorService', () => ({
  getMarketplaceActor: () => actorMock,
}));

vi.mock('./settingsService', () => ({
  getCurrentUserId: () => actorMock.userId,
}));

vi.mock('./brandProfileService', () => ({
  getStoredBrandProfile: () => null,
  buildBrandReferenceFromProfile: () => null,
}));

vi.mock('./marketplaceEnvironmentService', () => ({
  marketplaceEnvironmentService: {
    getInstalledPackage: getInstalledPackageMock,
  },
}));

describe('marketplaceEnvironmentPackService', () => {
  beforeEach(() => {
    vi.resetModules();
    validateMock.mockClear();
    capturePreviewMock.mockClear();
    maybeStoreThumbnailMock.mockClear();
    publishEnvironmentPackMock.mockClear();
    validateReleaseMock.mockClear();
    getInstalledPackageMock.mockClear();
    actorMock = {
      userId: 'test-user',
      name: 'Test User',
      role: 'producer',
      isAdmin: false,
    };
    (window as any).__virtualStudioLastAppliedEnvironmentPlan = {
      version: '1.0',
      planId: 'test-pack-plan',
      prompt: 'Warehouse environment',
      source: 'prompt',
      summary: 'Warehouse setup',
      concept: 'Warehouse setup',
      roomShell: {
        type: 'warehouse',
        width: 20,
        depth: 16,
        height: 8,
        openCeiling: true,
        notes: [],
      },
      surfaces: [],
      atmosphere: {
        clearColor: '#111827',
        ambientColor: '#ffffff',
        ambientIntensity: 0.4,
        fogEnabled: true,
      },
      ambientSounds: [],
      props: [],
      characters: [],
      branding: {
        enabled: false,
        palette: ['#111827'],
      },
      lighting: [],
      camera: {
        shotType: 'dramatic',
      },
      compatibility: {
        currentStudioShellSupported: true,
        confidence: 0.8,
        gaps: [],
        nextBuildModules: [],
      },
    };
    (window as any).__virtualStudioLastEnvironmentPlanInsights = {
      familyId: 'warehouse',
      familyLabel: 'Warehouse',
      summary: 'Industrial warehouse',
      roomShellSummary: 'Warehouse shell',
      validationModeLabel: 'Preview',
      lightingHeadline: 'Warehouse lights',
      lightingDetails: [],
      rationale: [],
    };
    (window as any).__virtualStudioLastEnvironmentAssemblyValidation = {
      backendValidated: true,
      differences: [],
      localNodeCount: 2,
      localRelationshipCount: 1,
      localRuntimePropCount: 0,
      localRuntimeAssetIds: [],
    };
    (window as any).__virtualStudioDiagnostics = {
      environment: {
        sceneState: {
          props: [],
          characters: [],
          lights: [{ id: 'key' }],
          roomShell: { type: 'warehouse' },
        },
      },
    };
    delete (window as any).__virtualStudioLastMarketplaceEnvironmentPackageId;
  });

  it('builds a publishable draft from the current environment plan', async () => {
    const { marketplaceEnvironmentPackService } = await import('./marketplaceEnvironmentPackService');
    const draft = await marketplaceEnvironmentPackService.buildDraft();

    expect(draft.product.environmentPackage?.manifestVersion).toBe('2.0');
    expect(draft.product.environmentPackage?.familyId).toBe('warehouse');
    expect(draft.validation.ready).toBe(true);
    expect(draft.qualityReport.ready).toBe(true);
    expect(draft.product.thumbnail).toContain('data:image/jpeg');
    expect(draft.publishMode).toBe('save_copy');
    expect(draft.product.registryMetadata?.visibility).toBe('private');
    expect(draft.publishContext.releaseStatus).toBe('stable');
  });

  it('publishes the current environment pack through the registry service', async () => {
    const { marketplaceEnvironmentPackService } = await import('./marketplaceEnvironmentPackService');
    const result = await marketplaceEnvironmentPackService.publishCurrentEnvironmentPack({
      name: 'Warehouse Publish Test',
    });

    expect(publishEnvironmentPackMock).toHaveBeenCalledTimes(1);
    expect(publishEnvironmentPackMock.mock.calls[0][1]).toBe('save_copy');
    expect(result.product.name).toBe('Warehouse Publish Test');
  });

  it('forces non-admin users to save a copy when the active environment came from a shared marketplace pack', async () => {
    getInstalledPackageMock.mockReturnValue({
      packageId: 'marketplace-shared-pack',
      productId: 'environment-shared-pack',
      name: 'Shared Warehouse Pack',
      description: 'Shared description',
      thumbnail: 'data:image/svg+xml,test',
      version: '2.0.0',
      tags: ['warehouse'],
      environmentCategory: 'warehouse',
      familyId: 'warehouse',
      summary: 'Shared summary',
      installedAt: '2026-03-27T00:00:00Z',
      source: 'registry',
      registryMetadata: {
        visibility: 'shared',
        ownerId: 'admin-1',
        ownerName: 'Admin',
        ownerRole: 'admin',
        adminManaged: true,
      },
      plan: (window as any).__virtualStudioLastAppliedEnvironmentPlan,
    });
    (window as any).__virtualStudioLastMarketplaceEnvironmentPackageId = 'marketplace-shared-pack';

    const { marketplaceEnvironmentPackService } = await import('./marketplaceEnvironmentPackService');
    const draft = await marketplaceEnvironmentPackService.buildDraft();

    expect(draft.publishMode).toBe('save_copy');
    expect(draft.product.registryMetadata?.visibility).toBe('private');
    expect(draft.product.registryMetadata?.sourceProductId).toBe('environment-shared-pack');
    expect(draft.publishContext.notice).toContain('Kun administrator kan oppdatere');
    expect(draft.publishContext.releaseStatus).toBe('stable');
  });

  it('lets admin update a shared marketplace pack instead of forcing a copy', async () => {
    actorMock = {
      userId: 'admin-7',
      name: 'Admin User',
      role: 'admin',
      isAdmin: true,
    };
    getInstalledPackageMock.mockReturnValue({
      packageId: 'marketplace-shared-pack',
      productId: 'environment-shared-pack',
      name: 'Shared Warehouse Pack',
      description: 'Shared description',
      thumbnail: 'data:image/svg+xml,test',
      version: '2.0.0',
      tags: ['warehouse'],
      environmentCategory: 'warehouse',
      familyId: 'warehouse',
      summary: 'Shared summary',
      installedAt: '2026-03-27T00:00:00Z',
      source: 'registry',
      registryMetadata: {
        visibility: 'shared',
        ownerId: 'admin-1',
        ownerName: 'Admin',
        ownerRole: 'admin',
        adminManaged: true,
        createdAt: '2026-03-27T00:00:00Z',
      },
      plan: (window as any).__virtualStudioLastAppliedEnvironmentPlan,
    });
    (window as any).__virtualStudioLastMarketplaceEnvironmentPackageId = 'marketplace-shared-pack';

    const { marketplaceEnvironmentPackService } = await import('./marketplaceEnvironmentPackService');
    const draft = await marketplaceEnvironmentPackService.buildDraft();

    expect(draft.publishMode).toBe('update_shared');
    expect(draft.product.id).toBe('environment-shared-pack');
    expect(draft.product.version).toBe('2.0.1');
    expect(draft.product.registryMetadata?.visibility).toBe('shared');
    expect(draft.publishContext.releaseStatus).toBe('candidate');
  });
});
