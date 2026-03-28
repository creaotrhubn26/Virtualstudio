import { expect, test, type Page } from '@playwright/test';

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioRuntimeReady?.ready), { timeout: 90_000 });
  await page.waitForFunction(() => (window as any).__virtualStudioPanelEventBridgeReady === true, { timeout: 90_000 });
}

async function openMarketplacePanel(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('vs-open-marketplace-panel'));
  });
  await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);
}

async function setMarketplaceAdmin(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const mod = await import('/src/services/authSessionService.ts');
    await mod.default.setAdminUser({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      display_name: 'Admin',
    });
  });
}

async function installReleaseRegistryMock(page: Page, products: any[], initialHistory: any[] = []): Promise<any[]> {
  const registryProducts = [...products];
  const releaseHistory = [...initialHistory];

  const buildReleaseDashboard = () => {
    const sharedProducts = registryProducts.filter((entry) => entry.registryMetadata?.visibility === 'shared');
    const lineageIds = Array.from(new Set(sharedProducts.map((entry) => entry.registryMetadata?.lineageId || entry.id)));
    const entries = lineageIds.map((lineageId) => {
      const currentStable = sharedProducts.find((entry) => entry.id === lineageId) || null;
      const currentCandidate = sharedProducts.find((entry) => entry.id === `${lineageId}--candidate`) || null;
      const qualityReport = currentCandidate?.environmentPackage?.qualityReport || currentStable?.environmentPackage?.qualityReport || null;
      const history = releaseHistory.filter((entry) => entry.lineageId === lineageId).slice(0, 6);
      const rollbackSnapshot = history
        .map((entry) => entry.restoredSnapshot || entry.previousStableSnapshot)
        .find((snapshot) => snapshot && snapshot.version && snapshot.version !== currentStable?.version) || null;
      const rollbackTargetVersions = Array.from(new Set(history.flatMap((entry) => {
        const versions = [entry.previousVersion, entry.targetVersion];
        return versions.filter((value) => value && value !== currentStable?.version);
      })));
      return {
        lineageId,
        productName: currentCandidate?.name || currentStable?.name || lineageId,
        currentStable,
        currentCandidate,
        qualityReport,
        changelog: currentCandidate?.whatsNew || currentStable?.whatsNew || currentCandidate?.description || currentStable?.description || null,
        history,
        rollbackTarget: rollbackSnapshot ? {
          version: rollbackSnapshot.version,
          thumbnail: rollbackSnapshot.thumbnail || null,
          summary: rollbackSnapshot.whatsNew || rollbackSnapshot.description || null,
        } : null,
        canRollback: Boolean(currentStable && rollbackTargetVersions.length > 0),
        rollbackTargetVersions,
      };
    });

    const candidateEntries = entries.filter((entry) => entry.currentCandidate);
    const readyCandidateCount = candidateEntries.filter((entry) => entry.qualityReport?.ready).length;
    return {
      summary: {
        sharedPackCount: entries.length,
        candidateCount: candidateEntries.length,
        stableCount: entries.length - candidateEntries.length,
        readyCandidateCount,
        blockedCandidateCount: candidateEntries.length - readyCandidateCount,
      },
      entries,
      recentHistory: releaseHistory.slice(0, 12),
    };
  };

  await page.route('**/api/marketplace/environment-packs**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET' && request.url().includes('/release-dashboard')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, dashboard: buildReleaseDashboard() }),
      });
      return;
    }

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, products: registryProducts }),
      });
      return;
    }

    if (request.method() === 'POST' && request.url().endsWith('/validate-release')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          qualityReport: {
            ready: true,
            score: 0.86,
            blockingIssues: [],
            warnings: [],
            checks: [],
          },
        }),
      });
      return;
    }

    if (request.method() === 'POST' && request.url().includes('/promote')) {
      const productId = decodeURIComponent(request.url().split('/').slice(-2)[0] || '');
      const candidateIndex = registryProducts.findIndex((entry) => entry.id === productId);
      const candidate = candidateIndex >= 0 ? registryProducts[candidateIndex] : null;
      if (!candidate) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Candidate not found' }),
        });
        return;
      }

      const previousStable = registryProducts.find((entry) => entry.id === (candidate.registryMetadata?.lineageId || String(candidate.id).replace(/--candidate$/, ''))) || null;
      const stableProduct = {
        ...candidate,
        id: candidate.registryMetadata?.lineageId || String(candidate.id).replace(/--candidate$/, ''),
        version: candidate.version,
        registryMetadata: {
          ...candidate.registryMetadata,
          releaseStatus: 'stable',
          latestStableVersion: candidate.version,
          latestCandidateVersion: null,
        },
        registryPermissions: {
          ...candidate.registryPermissions,
          canPromote: false,
        },
      };
      registryProducts.splice(candidateIndex, 1, stableProduct);
      releaseHistory.unshift({
        id: `history-promote-${stableProduct.id}-${stableProduct.version}`,
        action: 'promote_stable',
        lineageId: stableProduct.registryMetadata?.lineageId || stableProduct.id,
        productId: stableProduct.id,
        productName: stableProduct.name,
        version: stableProduct.version,
        previousVersion: previousStable?.version || null,
        targetVersion: stableProduct.version,
        releaseStatus: 'stable',
        timestamp: stableProduct.lastUpdated,
        actorId: 'admin-1',
        actorName: 'Admin',
        actorRole: 'admin',
        summary: stableProduct.whatsNew || stableProduct.description || null,
        qualityReport: stableProduct.environmentPackage?.qualityReport || null,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, product: stableProduct }),
      });
      return;
    }

    if (request.method() === 'POST' && request.url().includes('/rollback')) {
      const lineageId = decodeURIComponent(request.url().split('/').slice(-2)[0] || '');
      const payload = request.postDataJSON() as { targetVersion?: string };
      const stableIndex = registryProducts.findIndex((entry) => entry.id === lineageId);
      const stable = stableIndex >= 0 ? registryProducts[stableIndex] : null;
      if (!stable) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Stable not found' }),
        });
        return;
      }

      const targetVersion = payload?.targetVersion || releaseHistory.find((entry) => entry.lineageId === lineageId && entry.previousVersion)?.previousVersion || stable.version;
      const rolledBackProduct = {
        ...stable,
        version: targetVersion,
        lastUpdated: '2026-03-30T00:00:00Z',
        registryMetadata: {
          ...stable.registryMetadata,
          releaseStatus: 'stable',
          latestStableVersion: targetVersion,
        },
      };
      registryProducts.splice(stableIndex, 1, rolledBackProduct);
      releaseHistory.unshift({
        id: `history-rollback-${lineageId}-${targetVersion}`,
        action: 'rollback_stable',
        lineageId,
        productId: rolledBackProduct.id,
        productName: rolledBackProduct.name,
        version: rolledBackProduct.version,
        previousVersion: stable.version,
        targetVersion,
        releaseStatus: 'stable',
        timestamp: rolledBackProduct.lastUpdated,
        actorId: 'admin-1',
        actorName: 'Admin',
        actorRole: 'admin',
        summary: rolledBackProduct.whatsNew || rolledBackProduct.description || null,
        qualityReport: rolledBackProduct.environmentPackage?.qualityReport || null,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, product: rolledBackProduct }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/marketplace/environment-packs/*/record-install', async (route) => {
    const productId = route.request().url().split('/').slice(-2)[0];
    const product = registryProducts.find((entry) => entry.id === productId) || null;
    if (product) {
      product.installCount = Number(product.installCount || 0) + 1;
    }
    await route.fulfill({
      status: product ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: Boolean(product),
        product,
      }),
    });
  });

  return registryProducts;
}

test.describe('Marketplace release gate', () => {
  test('promotes a candidate environment pack to stable through the marketplace data flow', async ({ page }) => {
    await installReleaseRegistryMock(page, [
      {
        id: 'environment-noir-release-pack--candidate',
        name: 'Release Candidate Noir',
        description: 'Admin candidate',
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
          lineageId: 'environment-noir-release-pack',
          releaseStatus: 'candidate',
        },
        registryPermissions: {
          canUpdate: true,
          canSaveCopy: true,
          canPublishShared: true,
          canPromote: true,
        },
        environmentPackage: {
          packageId: 'marketplace-noir-release-pack--candidate',
          type: 'environment_plan',
          familyId: 'noir',
          qualityReport: {
            ready: true,
            score: 0.86,
            blockingIssues: [],
            warnings: [],
            checks: [],
          },
          plan: { planId: 'candidate-noir-plan' },
        },
      },
    ]);

    await waitForStudio(page);
    await setMarketplaceAdmin(page);
    await openMarketplacePanel(page);
    await page.getByPlaceholder('Søk produkter...').fill('Release Candidate Noir');
    await expect(page.getByTestId('marketplace-product-card-environment-noir-release-pack--candidate')).toBeVisible();

    await page.evaluate(async () => {
      const mod = await import('/src/services/marketplaceService.ts');
      await mod.marketplaceService.promoteEnvironmentPack('environment-noir-release-pack--candidate');
    });

    await expect(page.getByTestId('marketplace-product-card-environment-noir-release-pack')).toBeVisible();
    await expect(page.getByTestId('marketplace-product-card-environment-noir-release-pack--candidate')).toBeHidden();
  });

  test('shows the admin release queue with ready and blocked candidates and can promote from the queue', async ({ page }) => {
    await installReleaseRegistryMock(page, [
      {
        id: 'environment-noir-release-pack--candidate',
        name: 'Release Candidate Noir',
        description: 'Admin candidate',
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
          lineageId: 'environment-noir-release-pack',
          releaseStatus: 'candidate',
        },
        registryPermissions: {
          canUpdate: true,
          canSaveCopy: true,
          canPublishShared: true,
          canPromote: true,
        },
        environmentPackage: {
          packageId: 'marketplace-noir-release-pack--candidate',
          type: 'environment_plan',
          familyId: 'noir',
          qualityReport: {
            ready: true,
            score: 0.86,
            blockingIssues: [],
            warnings: ['Minor note'],
            checks: [],
          },
          plan: { planId: 'candidate-noir-plan' },
        },
      },
      {
        id: 'environment-warehouse-release-pack--candidate',
        name: 'Blocked Warehouse Candidate',
        description: 'Needs work',
        category: 'template',
        price: 0,
        thumbnail: 'data:image/svg+xml,test',
        screenshots: [],
        version: '1.4.0',
        author: { id: 'admin-1', name: 'Admin' },
        rating: 0,
        reviewCount: 0,
        downloadCount: 0,
        installCount: 0,
        tags: ['warehouse'],
        features: ['Warehouse scene'],
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
          lineageId: 'environment-warehouse-release-pack',
          releaseStatus: 'candidate',
        },
        registryPermissions: {
          canUpdate: true,
          canSaveCopy: true,
          canPublishShared: true,
          canPromote: false,
        },
        environmentPackage: {
          packageId: 'marketplace-warehouse-release-pack--candidate',
          type: 'environment_plan',
          familyId: 'warehouse',
          qualityReport: {
            ready: false,
            score: 0.48,
            blockingIssues: ['Missing preview'],
            warnings: [],
            checks: [],
          },
          plan: { planId: 'candidate-warehouse-plan' },
        },
      },
    ]);

    await waitForStudio(page);
    await setMarketplaceAdmin(page);
    await openMarketplacePanel(page);

    await expect(page.getByTestId('marketplace-release-queue')).toBeVisible();
    await expect(page.getByTestId('marketplace-release-queue')).toContainText(/2 candidate-packs venter/i);
    await expect(page.getByTestId('marketplace-release-row-environment-noir-release-pack--candidate')).toContainText(/Klar/i);
    await expect(page.getByTestId('marketplace-release-row-environment-warehouse-release-pack--candidate')).toContainText(/Krever arbeid/i);
    await expect(page.getByTestId('marketplace-release-promote-environment-warehouse-release-pack--candidate')).toBeDisabled();

    await page.getByTestId('marketplace-release-filter-ready').click();
    await expect(page.getByTestId('marketplace-product-card-environment-noir-release-pack--candidate')).toBeVisible();
    await expect(page.getByTestId('marketplace-product-card-environment-warehouse-release-pack--candidate')).toBeHidden();

    await page.getByTestId('marketplace-release-promote-environment-noir-release-pack--candidate').click();
    await expect(page.getByTestId('marketplace-release-audit-summary')).toContainText(/Publiser candidate 1.1.0 som ny stable-versjon/i);
    await expect(page.getByTestId('marketplace-release-audit-preview-before')).toBeVisible();
    await expect(page.getByTestId('marketplace-release-audit-preview-after')).toBeVisible();
    await page.getByTestId('marketplace-release-audit-mode-diff').click({ force: true });
    await expect(page.getByTestId('marketplace-release-audit-compare-surface')).toBeVisible();
    await page.getByTestId('marketplace-release-audit-mode-blink').click({ force: true });
    const blinkIndicator = page.getByTestId('marketplace-release-audit-blink-indicator');
    await expect(blinkIndicator).toBeVisible();
    await expect(blinkIndicator).toContainText(/Nå viser/i);
    await page.getByTestId('marketplace-release-audit-mode-heatmap').click({ force: true });
    await expect(page.getByTestId('marketplace-release-audit-heatmap-surface')).toBeVisible();
    await expect(page.getByTestId('marketplace-release-audit-confirm')).toContainText(/Promoter til stable/i);
    await page.getByTestId('marketplace-release-audit-confirm').click();

    await expect(page.getByText(/ble promotert til stable/i)).toBeVisible();
    await expect(page.getByTestId('marketplace-release-dashboard-entry-environment-noir-release-pack')).toContainText(/Stable 1.1.0/i);
    await expect(page.getByTestId('marketplace-release-queue')).toContainText(/0 klare, 1 blokkerte/i);
  });

  test('shows release history and can roll a shared pack back from the admin dashboard', async ({ page }) => {
    await installReleaseRegistryMock(
      page,
      [
        {
          id: 'environment-shared-retail-pack',
          name: 'Shared Retail Pack',
          description: 'Stable retail',
          category: 'template',
          price: 0,
          thumbnail: 'data:image/svg+xml,test',
          screenshots: [],
          version: '1.2.0',
          author: { id: 'admin-1', name: 'Admin' },
          rating: 0,
          reviewCount: 0,
          downloadCount: 0,
          installCount: 0,
          tags: ['retail'],
          features: ['Retail scene'],
          releaseDate: '2026-03-27T00:00:00Z',
          lastUpdated: '2026-03-29T00:00:00Z',
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
            lineageId: 'environment-shared-retail-pack',
            releaseStatus: 'stable',
            latestStableVersion: '1.2.0',
          },
          registryPermissions: {
            canUpdate: true,
            canSaveCopy: true,
            canPublishShared: true,
          },
          whatsNew: 'Ny premium dressing og oppdatert storefront.',
          environmentPackage: {
            packageId: 'marketplace-shared-retail-pack',
            type: 'environment_plan',
            familyId: 'luxury_retail',
            qualityReport: {
              ready: true,
              score: 0.9,
              blockingIssues: [],
              warnings: [],
              checks: [
                { id: 'preview_assets', label: 'Preview og screenshots', status: 'passed' },
              ],
            },
            plan: { planId: 'retail-v1-2' },
          },
        },
      ],
      [
        {
          id: 'history-promote-retail',
          action: 'promote_stable',
          lineageId: 'environment-shared-retail-pack',
          productId: 'environment-shared-retail-pack',
          productName: 'Shared Retail Pack',
          version: '1.2.0',
          previousVersion: '1.0.0',
          targetVersion: '1.2.0',
          releaseStatus: 'stable',
          timestamp: '2026-03-29T00:00:00Z',
          actorId: 'admin-1',
          actorName: 'Admin',
          actorRole: 'admin',
          summary: 'Promoted to stable',
          qualityReport: {
            ready: true,
            score: 0.9,
            blockingIssues: [],
            warnings: [],
            checks: [],
          },
          previousStableSnapshot: {
            id: 'environment-shared-retail-pack',
            version: '1.0.0',
            thumbnail: 'data:image/svg+xml,retail-rollback-preview',
            description: 'Tidligere stable retail preview',
          },
        },
      ],
    );

    await waitForStudio(page);
    await setMarketplaceAdmin(page);
    await openMarketplacePanel(page);

    await expect(page.getByTestId('marketplace-release-dashboard')).toBeVisible();
    await expect(page.getByTestId('marketplace-release-dashboard-entry-environment-shared-retail-pack')).toContainText(/Stable 1.2.0/i);
    await expect(page.getByTestId('marketplace-release-dashboard-entry-environment-shared-retail-pack')).toContainText(/Ny premium dressing/i);
    await expect(page.getByTestId('marketplace-release-dashboard-entry-environment-shared-retail-pack')).toContainText(/promote_stable/i);

    await page.getByTestId('marketplace-release-dashboard-rollback-environment-shared-retail-pack').click();
    await expect(page.getByTestId('marketplace-release-audit-summary')).toContainText(/Ruller tilbake Shared Retail Pack fra stable 1.2.0 til 1.0.0/i);
    await expect(page.getByTestId('marketplace-release-audit-changelog')).toContainText(/Ny premium dressing/i);
    await expect(page.getByTestId('marketplace-release-audit-preview-before')).toBeVisible();
    await expect(page.getByTestId('marketplace-release-audit-preview-after')).toBeVisible();
    await page.getByTestId('marketplace-release-audit-mode-diff').click({ force: true });
    await expect(page.getByTestId('marketplace-release-audit-compare-surface')).toBeVisible();
    await page.getByTestId('marketplace-release-audit-mode-heatmap').click({ force: true });
    await expect(page.getByTestId('marketplace-release-audit-heatmap-surface')).toBeVisible();
    await page.getByTestId('marketplace-release-audit-confirm').click();

    await expect(page.getByText(/ble rullet tilbake til 1.0.0/i)).toBeVisible();
    await expect(page.getByTestId('marketplace-release-dashboard-entry-environment-shared-retail-pack')).toContainText(/Stable 1.0.0/i);
    await expect(page.getByTestId('marketplace-release-dashboard-entry-environment-shared-retail-pack')).toContainText(/rollback_stable/i);
  });

  test('shows update notification when a newer stable environment version is available', async ({ page }) => {
    const registryProducts = await installReleaseRegistryMock(page, [
      {
        id: 'environment-shared-noir-pack',
        name: 'Shared Noir Pack',
        description: 'Stable noir',
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
          lineageId: 'environment-shared-noir-pack',
          releaseStatus: 'stable',
          latestStableVersion: '1.0.0',
        },
        registryPermissions: {
          canUpdate: false,
          canSaveCopy: true,
          canPublishShared: false,
        },
        environmentPackage: {
          packageId: 'marketplace-shared-noir-pack',
          type: 'environment_plan',
          familyId: 'noir',
          plan: { planId: 'stable-noir-plan-v1' },
        },
      },
    ]);

    await waitForStudio(page);
    await openMarketplacePanel(page);
    await page.getByPlaceholder('Søk produkter...').fill('Shared Noir Pack');
    const actionButton = page.getByTestId('marketplace-product-action-environment-shared-noir-pack');
    await actionButton.click();
    await expect(actionButton).toContainText(/Avinstaller/i);

    registryProducts[0].version = '1.1.0';
    registryProducts[0].lastUpdated = '2026-03-28T00:00:00Z';
    registryProducts[0].registryMetadata.latestStableVersion = '1.1.0';
    registryProducts[0].environmentPackage.plan = { planId: 'stable-noir-plan-v2' };

    await page.evaluate(async () => {
      const mod = await import('/src/services/marketplaceService.ts');
      await mod.marketplaceService.refreshRemoteProducts();
    });

    await expect(page.getByTestId('marketplace-product-action-environment-shared-noir-pack')).toContainText(/Oppdater/i);
  });

  test('surfaces a stable update banner and can download the latest version for installed packs', async ({ page }) => {
    const registryProducts = await installReleaseRegistryMock(page, [
      {
        id: 'environment-shared-noir-pack',
        name: 'Shared Noir Pack',
        description: 'Stable noir',
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
          lineageId: 'environment-shared-noir-pack',
          releaseStatus: 'stable',
          latestStableVersion: '1.0.0',
        },
        registryPermissions: {
          canUpdate: false,
          canSaveCopy: true,
          canPublishShared: false,
        },
        environmentPackage: {
          packageId: 'marketplace-shared-noir-pack',
          type: 'environment_plan',
          familyId: 'noir',
          plan: { planId: 'stable-noir-plan-v1' },
        },
      },
    ]);

    await waitForStudio(page);
    await openMarketplacePanel(page);
    await page.getByPlaceholder('Søk produkter...').fill('Shared Noir Pack');

    const actionButton = page.getByTestId('marketplace-product-action-environment-shared-noir-pack');
    await actionButton.click();
    await expect(actionButton).toContainText(/Avinstaller/i);

    registryProducts[0].version = '1.2.0';
    registryProducts[0].lastUpdated = '2026-03-29T00:00:00Z';
    registryProducts[0].registryMetadata.latestStableVersion = '1.2.0';
    registryProducts[0].environmentPackage.plan = { planId: 'stable-noir-plan-v2' };

    await page.evaluate(async () => {
      const mod = await import('/src/services/marketplaceService.ts');
      await mod.marketplaceService.refreshRemoteProducts();
    });

    await expect(page.getByText(/stable-oppdatering tilgjengelig i Marketplace/i)).toBeVisible();
    await expect(page.getByTestId('marketplace-update-banner')).toBeVisible();
    await expect(page.getByTestId('marketplace-update-banner')).toContainText(/1 installerte packs? har en nyere stable-versjon/i);
    await expect(page.locator('#menuMarketplaceUpdateBadge')).toBeVisible();
    await expect(page.locator('#userMenuMarketplaceUpdateBadge')).toBeVisible();
    await expect(page.locator('#menuMarketplaceUpdateBadge')).toContainText('1');
    await expect(page.locator('#marketplaceTriggerUpdateBadge')).toContainText('1');
    await expect(page.locator('#userMenuMarketplaceUpdateBadge')).toContainText('1');
    await page.getByRole('button', { name: /Brukermeny/i }).click();
    await expect(page.locator('#userMenuMarketplaceItemBadge')).toBeVisible();
    await expect(page.locator('#userMenuMarketplaceItemBadge')).toContainText('1');
    await page.keyboard.press('Escape');
    await page.getByTestId('marketplace-update-all').click();

    await expect(page.getByTestId('marketplace-update-banner')).toBeHidden();
    await expect(page.getByTestId('marketplace-product-action-environment-shared-noir-pack')).toContainText(/Avinstaller/i);
    await expect(page.locator('#menuMarketplaceUpdateBadge')).toBeHidden();
    await expect(page.locator('#userMenuMarketplaceUpdateBadge')).toBeHidden();
    await expect(page.locator('#marketplaceTriggerUpdateBadge')).toContainText('0');
    await page.getByRole('button', { name: /Brukermeny/i }).click();
    await expect(page.locator('#userMenuMarketplaceItemBadge')).toBeHidden();
    await page.keyboard.press('Escape');
  });
});
