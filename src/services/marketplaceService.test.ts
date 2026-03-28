import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceProduct } from '../core/models/marketplace';

const getSettingMock = vi.fn(async () => null);
const setSettingMock = vi.fn(async () => undefined);
const listEnvironmentPacksMock = vi.fn(async () => []);
const recordInstallMock = vi.fn(async () => null);
const promoteEnvironmentPackMock = vi.fn(async (product: MarketplaceProduct) => product);
const installFromProductMock = vi.fn(() => true);
const uninstallByProductIdMock = vi.fn(() => true);

let installedPackages: Array<{
  packageId: string;
  productId: string;
  name: string;
  description: string;
  thumbnail: string;
  version: string;
  tags: string[];
  installedAt: string;
  source: 'registry';
  lineageId: string;
  releaseStatus: 'stable';
  plan: Record<string, unknown>;
}> = [];

vi.mock('./settingsService', () => ({
  default: {
    getSetting: getSettingMock,
    setSetting: setSettingMock,
  },
  getCurrentUserId: () => 'test-user',
}));

vi.mock('./marketplaceRegistryService', () => ({
  marketplaceRegistryService: {
    listEnvironmentPacks: listEnvironmentPacksMock,
    recordInstall: recordInstallMock,
    promoteEnvironmentPack: promoteEnvironmentPackMock,
  },
}));

vi.mock('./marketplaceEnvironmentPackService', () => ({
  marketplaceEnvironmentPackService: {
    publishCurrentEnvironmentPack: vi.fn(async () => ({
      product: {
        id: 'environment-shared-noir-pack--candidate',
        name: 'Shared Noir Pack',
        description: 'Noir candidate',
        category: 'template',
        price: 0,
        thumbnail: 'data:image/svg+xml,test',
        screenshots: [],
        version: '1.1.0',
        author: { id: 'admin-1', name: 'Admin' },
        rating: 0,
        reviewCount: 0,
        downloadCount: 0,
        installCount: 0,
        tags: ['noir'],
        features: ['Noir scene'],
        releaseDate: '2026-03-27T00:00:00Z',
        lastUpdated: '2026-03-27T00:00:00Z',
        license: 'Marketplace Shared Pack',
        isInstalled: false,
        hasUpdate: false,
        isFavorite: false,
        source: 'registry',
        registryMetadata: {
          visibility: 'shared',
          ownerId: 'admin-1',
          ownerName: 'Admin',
          ownerRole: 'admin',
          adminManaged: true,
          lineageId: 'environment-shared-noir-pack',
          releaseStatus: 'candidate',
        },
        environmentPackage: {
          packageId: 'marketplace-shared-noir-pack--candidate',
          type: 'environment_plan',
          plan: { planId: 'candidate-plan' },
        },
      },
      validation: {
        ready: true,
        blockingIssues: [],
        warnings: [],
        backendValidated: true,
      },
      qualityReport: {
        ready: true,
        blockingIssues: [],
        warnings: [],
        checks: [],
      },
      previewImage: null,
      publishMode: 'update_shared',
      publishContext: {
        sourceProductId: 'environment-shared-noir-pack',
        sourceProductName: 'Shared Noir Pack',
        sourceVisibility: 'shared',
        canUpdateSource: true,
        canPublishShared: true,
        releaseStatus: 'candidate',
        notice: 'Candidate publish',
      },
    })),
  },
}));

vi.mock('./marketplaceEnvironmentService', () => ({
  marketplaceEnvironmentService: {
    getInstalledPackages: () => installedPackages,
    installFromProduct: installFromProductMock,
    uninstallByProductId: uninstallByProductIdMock,
  },
}));

function buildRegistryStableProduct(version: string): MarketplaceProduct {
  return {
    id: 'environment-shared-noir-pack',
    name: 'Shared Noir Pack',
    description: 'Stable noir release',
    category: 'template',
    price: 0,
    thumbnail: 'data:image/svg+xml,test',
    screenshots: [],
    version,
    author: { id: 'admin-1', name: 'Admin' },
    rating: 0,
    reviewCount: 0,
    downloadCount: 0,
    installCount: 0,
    tags: ['noir'],
    features: ['Noir scene'],
    releaseDate: '2026-03-27T00:00:00Z',
    lastUpdated: '2026-03-27T00:00:00Z',
    license: 'Marketplace Shared Pack',
    isInstalled: false,
    hasUpdate: false,
    isFavorite: false,
    source: 'registry',
    registryMetadata: {
      visibility: 'shared',
      ownerId: 'admin-1',
      ownerName: 'Admin',
      ownerRole: 'admin',
      adminManaged: true,
      lineageId: 'environment-shared-noir-pack',
      releaseStatus: 'stable',
      latestStableVersion: version,
    },
    environmentPackage: {
      packageId: 'marketplace-shared-noir-pack',
      type: 'environment_plan',
      familyId: 'noir',
      plan: { planId: `noir-${version}` } as any,
    },
  };
}

function buildRegistryCandidateProduct(id: string, input: {
  name: string;
  version: string;
  ready: boolean;
  score: number;
  warnings?: string[];
  blockingIssues?: string[];
}): MarketplaceProduct {
  return {
    id,
    name: input.name,
    description: 'Candidate release',
    category: 'template',
    price: 0,
    thumbnail: 'data:image/svg+xml,test',
    screenshots: [],
    version: input.version,
    author: { id: 'admin-1', name: 'Admin' },
    rating: 0,
    reviewCount: 0,
    downloadCount: 0,
    installCount: 0,
    tags: ['candidate'],
    features: ['Release candidate'],
    releaseDate: '2026-03-27T00:00:00Z',
    lastUpdated: '2026-03-27T00:00:00Z',
    license: 'Marketplace Shared Pack',
    isInstalled: false,
    hasUpdate: false,
    isFavorite: false,
    source: 'registry',
    registryMetadata: {
      visibility: 'shared',
      ownerId: 'admin-1',
      ownerName: 'Admin',
      ownerRole: 'admin',
      adminManaged: true,
      lineageId: id.replace(/--candidate$/, ''),
      releaseStatus: 'candidate',
      updatedAt: '2026-03-28T00:00:00Z',
    },
    registryPermissions: {
      canUpdate: true,
      canSaveCopy: true,
      canPublishShared: true,
      canPromote: input.ready,
    },
    environmentPackage: {
      packageId: `package-${id}`,
      type: 'environment_plan',
      familyId: 'noir',
      qualityReport: {
        ready: input.ready,
        score: input.score,
        blockingIssues: input.blockingIssues || [],
        warnings: input.warnings || [],
        checks: [],
      },
      plan: { planId: `plan-${id}` } as any,
    },
  };
}

describe('marketplaceService release flow', () => {
  beforeEach(() => {
    vi.resetModules();
    getSettingMock.mockClear();
    setSettingMock.mockClear();
    listEnvironmentPacksMock.mockClear();
    recordInstallMock.mockClear();
    promoteEnvironmentPackMock.mockClear();
    installFromProductMock.mockClear();
    uninstallByProductIdMock.mockClear();
    installedPackages = [];
  });

  it('marks installed shared registry environments as having updates when a newer stable release appears', async () => {
    let remoteProducts = [buildRegistryStableProduct('1.0.0')];
    listEnvironmentPacksMock.mockImplementation(async () => remoteProducts);

    const { marketplaceService } = await import('./marketplaceService');

    await marketplaceService.refreshRemoteProducts();
    await marketplaceService.installProduct('environment-shared-noir-pack');

    installedPackages = [{
      packageId: 'marketplace-shared-noir-pack',
      productId: 'environment-shared-noir-pack',
      name: 'Shared Noir Pack',
      description: 'Stable noir release',
      thumbnail: 'data:image/svg+xml,test',
      version: '1.0.0',
      tags: ['noir'],
      installedAt: '2026-03-27T00:00:00Z',
      source: 'registry',
      lineageId: 'environment-shared-noir-pack',
      releaseStatus: 'stable',
      plan: { planId: 'noir-1.0.0' },
    }];

    remoteProducts = [buildRegistryStableProduct('1.1.0')];
    await marketplaceService.refreshRemoteProducts();

    const refreshed = marketplaceService.getProduct('environment-shared-noir-pack');
    expect(refreshed?.installedVersion).toBe('1.0.0');
    expect(refreshed?.hasUpdate).toBe(true);
  });

  it('updates all pending stable releases in one pass', async () => {
    let remoteProducts = [buildRegistryStableProduct('1.0.0')];
    listEnvironmentPacksMock.mockImplementation(async () => remoteProducts);

    const { marketplaceService } = await import('./marketplaceService');

    await marketplaceService.refreshRemoteProducts();
    await marketplaceService.installProduct('environment-shared-noir-pack');

    installedPackages = [{
      packageId: 'marketplace-shared-noir-pack',
      productId: 'environment-shared-noir-pack',
      name: 'Shared Noir Pack',
      description: 'Stable noir release',
      thumbnail: 'data:image/svg+xml,test',
      version: '1.0.0',
      tags: ['noir'],
      installedAt: '2026-03-27T00:00:00Z',
      source: 'registry',
      lineageId: 'environment-shared-noir-pack',
      releaseStatus: 'stable',
      plan: { planId: 'noir-1.0.0' },
    }];

    remoteProducts = [buildRegistryStableProduct('1.1.0')];
    await marketplaceService.refreshRemoteProducts();

    const result = await marketplaceService.updateAllProducts();
    const refreshed = marketplaceService.getProduct('environment-shared-noir-pack');

    expect(result).toEqual({ updated: 1, failed: [] });
    expect(refreshed?.installedVersion).toBe('1.1.0');
    expect(refreshed?.hasUpdate).toBe(false);
    expect(installFromProductMock).toHaveBeenCalled();
  });

  it('does not auto-install shared candidate publishes', async () => {
    const { marketplaceService } = await import('./marketplaceService');

    const published = await marketplaceService.publishCurrentEnvironmentPack({
      name: 'Shared Noir Candidate',
    });

    expect(published.registryMetadata?.releaseStatus).toBe('candidate');
    expect(published.isInstalled).toBe(false);
    expect(installFromProductMock).not.toHaveBeenCalled();
    expect(recordInstallMock).not.toHaveBeenCalled();
  });

  it('builds an admin release queue summary for shared candidates', async () => {
    listEnvironmentPacksMock.mockResolvedValue([
      buildRegistryStableProduct('1.0.0'),
      buildRegistryCandidateProduct('environment-noir-ready--candidate', {
        name: 'Noir Ready Candidate',
        version: '1.1.0',
        ready: true,
        score: 0.88,
        warnings: ['Minor note'],
      }),
      buildRegistryCandidateProduct('environment-noir-blocked--candidate', {
        name: 'Noir Blocked Candidate',
        version: '1.2.0',
        ready: false,
        score: 0.49,
        blockingIssues: ['Missing preview'],
      }),
    ]);

    const { marketplaceService } = await import('./marketplaceService');

    await marketplaceService.refreshRemoteProducts();

    expect(marketplaceService.getReleaseQueueSummary()).toEqual({
      totalSharedPacks: 3,
      candidateCount: 2,
      stableCount: 1,
      readyCandidateCount: 1,
      blockedCandidateCount: 1,
      warningCandidateCount: 1,
    });

    const readyCandidates = marketplaceService.getReleaseCandidateProducts({ readyOnly: true });
    const blockedCandidates = marketplaceService.getReleaseCandidateProducts({ blockedOnly: true });

    expect(readyCandidates.map((product) => product.id)).toEqual(['environment-noir-ready--candidate']);
    expect(blockedCandidates.map((product) => product.id)).toEqual(['environment-noir-blocked--candidate']);
  });
});
