import { expect, test, type Page } from '@playwright/test';

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioRuntimeReady?.ready), { timeout: 90_000 });
  await page.waitForFunction(() => (window as any).__virtualStudioPanelEventBridgeReady === true, { timeout: 90_000 });
}

async function openMarketplacePanel(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('vs-open-marketplace-panel'));
  });
  await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);
}

async function installRegistryAuthoringMock(page: Page, products: any[]): Promise<void> {
  const registryProducts = [...products];

  await page.route('**/api/marketplace/environment-packs**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, products: registryProducts }),
      });
      return;
    }

    if (request.method() === 'POST' && request.url().endsWith('/publish')) {
      const payload = request.postDataJSON() as { product?: any };
      if (payload?.product) {
        registryProducts.unshift(payload.product);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, product: payload?.product || null }),
      });
      return;
    }

    await route.fallback();
  });
}

test.describe('Marketplace Environment Authoring Controls', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudio(page);
  });

  test('filters registry products down to mine packs', async ({ page }) => {
    await installRegistryAuthoringMock(page, [
      {
        id: 'environment-shared-noir-pack',
        name: 'Shared Noir Pack',
        description: 'Shared noir pack',
        category: 'template',
        price: 0,
        thumbnail: 'data:image/svg+xml,test',
        screenshots: [],
        version: '1.0.0',
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
        },
        registryPermissions: {
          canUpdate: false,
          canSaveCopy: true,
          canPublishShared: false,
        },
        environmentPackage: {
          packageId: 'marketplace-shared-noir-pack',
          type: 'environment_plan',
          plan: { planId: 'shared-noir-plan' },
        },
      },
      {
        id: 'environment-private-noir-pack',
        name: 'My Noir Copy',
        description: 'Private noir copy',
        category: 'template',
        price: 0,
        thumbnail: 'data:image/svg+xml,test',
        screenshots: [],
        version: '1.0.0',
        author: { id: 'default-user', name: 'You' },
        rating: 0,
        reviewCount: 0,
        downloadCount: 0,
        installCount: 0,
        tags: ['noir'],
        features: ['Noir scene'],
        releaseDate: '2026-03-27T00:00:00Z',
        lastUpdated: '2026-03-27T00:00:00Z',
        license: 'User Copy',
        isInstalled: false,
        hasUpdate: false,
        isFavorite: false,
        source: 'registry',
        registryMetadata: {
          visibility: 'private',
          ownerId: 'default-user',
          ownerName: 'You',
          ownerRole: 'viewer',
          adminManaged: false,
        },
        registryPermissions: {
          canUpdate: false,
          canSaveCopy: true,
          canPublishShared: false,
        },
        environmentPackage: {
          packageId: 'marketplace-private-noir-pack',
          type: 'environment_plan',
          plan: { planId: 'private-noir-plan' },
        },
      },
    ]);
    await waitForStudio(page);

    await openMarketplacePanel(page);
    await page.getByText('Mine packs').last().click();

    await expect(page.getByTestId('marketplace-product-card-environment-private-noir-pack')).toBeVisible();
    await expect(page.getByTestId('marketplace-product-card-environment-shared-noir-pack')).toBeHidden();
  });
});
