import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSettingMock = vi.fn(async () => null);
const setSettingMock = vi.fn(async () => undefined);
const applyPlanToCurrentStudioMock = vi.fn(async () => ({
  plan: { planId: 'marketplace-pizza-trattoria-plan' },
  applied: ['Romskall'],
  skipped: [],
  assembly: null,
  assemblyValidation: null,
  evaluation: null,
  refinement: null,
}));

vi.mock('./settingsService', () => ({
  default: {
    getSetting: getSettingMock,
    setSetting: setSettingMock,
  },
  getCurrentUserId: () => 'test-user',
}));

vi.mock('./environmentPlannerService', () => ({
  environmentPlannerService: {
    applyPlanToCurrentStudio: applyPlanToCurrentStudioMock,
  },
}));

describe('marketplaceEnvironmentService', () => {
  beforeEach(async () => {
    vi.resetModules();
    getSettingMock.mockClear();
    setSettingMock.mockClear();
    applyPlanToCurrentStudioMock.mockClear();
  });

  it('surfaces the bundled marketplace environment packs for pizza, warehouse, noir, luxury retail and film studio', async () => {
    const { marketplaceService } = await import('./marketplaceService');

    const expectedProducts = [
      ['environment-pizza-trattoria-pack', 'food'],
      ['environment-warehouse-industrial-pack', 'warehouse'],
      ['environment-noir-detective-pack', 'noir'],
      ['environment-luxury-retail-pack', 'luxury_retail'],
      ['environment-film-soundstage-pack', 'film_studio'],
    ] as const;

    for (const [productId, familyId] of expectedProducts) {
      const product = marketplaceService.getProduct(productId);
      expect(product?.environmentPackage).toBeTruthy();
      expect(product?.environmentPackage?.familyId).toBe(familyId);
    }
  });

  it('installs marketplace environment packages from products and persists them', async () => {
    const { marketplaceEnvironmentService } = await import('./marketplaceEnvironmentService');
    const { marketplaceService } = await import('./marketplaceService');

    marketplaceEnvironmentService.resetForTests();

    const product = marketplaceService.getProduct('environment-pizza-trattoria-pack');
    expect(product?.environmentPackage).toBeTruthy();

    const installed = marketplaceEnvironmentService.installFromProduct(product!);
    expect(installed).toBe(true);
    expect(setSettingMock).toHaveBeenCalled();

    const packages = marketplaceEnvironmentService.getInstalledPackages();
    expect(packages).toHaveLength(1);
    expect(packages[0]?.productId).toBe('environment-pizza-trattoria-pack');
    expect(packages[0]?.familyId).toBe('food');
    expect(packages[0]?.lineageId).toBe('environment-pizza-trattoria-pack');
    expect(packages[0]?.releaseStatus).toBe('stable');
  });

  it('installs warehouse packages with the expected marketplace family metadata', async () => {
    const { marketplaceEnvironmentService } = await import('./marketplaceEnvironmentService');
    const { marketplaceService } = await import('./marketplaceService');

    marketplaceEnvironmentService.resetForTests();

    const product = marketplaceService.getProduct('environment-warehouse-industrial-pack');
    expect(product?.environmentPackage).toBeTruthy();

    const installed = marketplaceEnvironmentService.installFromProduct(product!);
    expect(installed).toBe(true);

    const packages = marketplaceEnvironmentService.getInstalledPackages();
    expect(packages).toHaveLength(1);
    expect(packages[0]?.packageId).toBe('marketplace-warehouse-industrial');
    expect(packages[0]?.familyId).toBe('warehouse');
    expect(packages[0]?.plan.roomShell?.type).toBe('warehouse');
  });

  it('applies installed marketplace environment packages through the environment planner', async () => {
    const { marketplaceEnvironmentService } = await import('./marketplaceEnvironmentService');
    const { marketplaceService } = await import('./marketplaceService');

    marketplaceEnvironmentService.resetForTests();
    const product = marketplaceService.getProduct('environment-pizza-trattoria-pack');
    marketplaceEnvironmentService.installFromProduct(product!);

    const result = await marketplaceEnvironmentService.applyInstalledPackageByProductId('environment-pizza-trattoria-pack');

    expect(applyPlanToCurrentStudioMock).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect((window as any).__virtualStudioLastMarketplaceEnvironmentPackageId).toBe('marketplace-pizza-trattoria');
  });

  it('applies installed warehouse marketplace environment packages through the environment planner', async () => {
    const { marketplaceEnvironmentService } = await import('./marketplaceEnvironmentService');
    const { marketplaceService } = await import('./marketplaceService');

    marketplaceEnvironmentService.resetForTests();
    const product = marketplaceService.getProduct('environment-warehouse-industrial-pack');
    marketplaceEnvironmentService.installFromProduct(product!);

    const result = await marketplaceEnvironmentService.applyInstalledPackageByProductId('environment-warehouse-industrial-pack');

    expect(applyPlanToCurrentStudioMock).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect((applyPlanToCurrentStudioMock.mock.calls[0]?.[0] as EnvironmentPlanApplyResult['plan'])?.roomShell?.type).toBe('warehouse');
    expect((window as any).__virtualStudioLastMarketplaceEnvironmentPackageId).toBe('marketplace-warehouse-industrial');
  });
});
