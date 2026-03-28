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

async function installMarketplaceEnvironmentProduct(page: Page, searchText: string, productId: string): Promise<void> {
  await openMarketplacePanel(page);

  const search = page.getByPlaceholder('Søk produkter...');
  await search.fill(searchText);

  const card = page.getByTestId(`marketplace-product-card-${productId}`);
  const actionButton = page.getByTestId(`marketplace-product-action-${productId}`);
  await expect(card).toBeVisible();

  const initialActionText = (await actionButton.textContent())?.trim() || '';
  if (/Avinstaller/i.test(initialActionText)) {
    await actionButton.click();
    await expect(actionButton).toContainText(/Installer|Kjøp/i);
  }

  await actionButton.click();
  await expect(actionButton).toContainText(/Avinstaller/i);
}

async function openEnvironmentBrowserFromSceneComposer(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.sessionStorage.setItem('virtualstudio-ai-planner-welcome-seen', 'true');
    window.dispatchEvent(new CustomEvent('create-new-scene'));
  });

  await expect(page.locator('#sceneComposerPanel')).toBeVisible();
  await page.getByRole('tab', { name: 'Miljø' }).click();
  await expect(page.getByTestId('environment-browser-panel')).toBeVisible();
}

async function applyMarketplaceEnvironmentPackage(page: Page, packageId: string): Promise<void> {
  const packageCard = page.getByTestId(`marketplace-environment-package-${packageId}`);
  await expect(packageCard).toBeVisible();
  await page.getByTestId(`apply-marketplace-environment-package-${packageId}`).click();
}

async function installMarketplaceRegistryMock(page: Page): Promise<void> {
  const registryProducts: any[] = [];

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
}

test.describe('Marketplace Environment Install', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudio(page);
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
  });

  test('installs a marketplace environment package and exposes it in the Environment Browser', async ({ page }) => {
    test.setTimeout(8 * 60_000);

    await installMarketplaceEnvironmentProduct(page, 'Pizza Trattoria', 'environment-pizza-trattoria-pack');
    await openEnvironmentBrowserFromSceneComposer(page);
    await applyMarketplaceEnvironmentPackage(page, 'marketplace-pizza-trattoria');

    await page.waitForFunction(
      () => (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId === 'food',
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      () => {
        const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
        const props = diagnostics?.sceneState?.props;
        return Array.isArray(props) && props.some((prop: any) => prop.assetId === 'pizza_hero_display');
      },
      { timeout: 180_000 },
    );

    const diagnostics = await page.evaluate(() => {
      const env = (window as any).__virtualStudioDiagnostics?.environment;
      return {
        familyId: (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId ?? null,
        propAssetIds: Array.isArray(env?.sceneState?.props)
          ? env.sceneState.props.map((prop: any) => prop.assetId)
          : [],
      };
    });

    expect(diagnostics.familyId).toBe('food');
    expect(diagnostics.propAssetIds).toContain('pizza_hero_display');
  });

  test('publishes the active environment as a registry-backed marketplace pack', async ({ page }) => {
    test.setTimeout(8 * 60_000);

    await installMarketplaceRegistryMock(page);
    await page.evaluate(() => {
      window.sessionStorage.setItem('virtualstudio-ai-planner-welcome-seen', 'true');
      (window as any).__virtualStudioLastAppliedEnvironmentPlan = {
        version: '1.0',
        planId: 'publish-pack-plan',
        prompt: 'Warm branded pizza trattoria',
        source: 'prompt',
        summary: 'Brandbar pizza-trattoria med hero-pizza og staff.',
        concept: 'Warm branded pizza restaurant',
        roomShell: {
          type: 'storefront',
          width: 14,
          depth: 10,
          height: 4.6,
          openCeiling: false,
          ceilingStyle: 'coffered',
          notes: [],
        },
        surfaces: [],
        atmosphere: {
          clearColor: '#20130c',
          ambientColor: '#f5d9b8',
          ambientIntensity: 0.82,
          fogEnabled: false,
        },
        ambientSounds: [],
        props: [],
        characters: [],
        branding: {
          enabled: true,
          brandName: 'Casa Forno',
          palette: ['#d9480f', '#f59e0b', '#fef3c7', '#14532d'],
          applicationTargets: ['environment', 'signage'],
          applyToEnvironment: true,
          applyToWardrobe: false,
          applyToSignage: true,
        },
        lighting: [],
        camera: {
          shotType: 'hero_product',
        },
        compatibility: {
          currentStudioShellSupported: true,
          confidence: 0.92,
          gaps: [],
          nextBuildModules: [],
        },
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = {
        familyId: 'food',
        familyLabel: 'Food',
        summary: 'Varm branded pizza-scene.',
        roomShellSummary: 'Storefront shell',
        validationModeLabel: 'Preview',
        lightingHeadline: 'Food lighting',
        lightingDetails: [],
        rationale: [],
      };
      (window as any).__virtualStudioLastEnvironmentEvaluation = {
        provider: 'heuristic_environment_validation',
        verdict: 'approved',
        overallScore: 0.88,
        categories: {
          promptFidelity: { score: 0.9, notes: [] },
          compositionMatch: { score: 0.86, notes: [] },
          lightingIntentMatch: { score: 0.87, notes: [] },
          technicalIntegrity: { score: 0.85, notes: [] },
          roomRealism: { score: 0.84, notes: [] },
        },
        suggestedAdjustments: [],
        validatedAt: '2026-03-27T00:00:00Z',
      };
      (window as any).__virtualStudioLastEnvironmentAssemblyValidation = {
        backendValidated: true,
        differences: [],
        localNodeCount: 4,
        localRelationshipCount: 2,
        localRuntimePropCount: 0,
        localRuntimeAssetIds: [],
        backendNodeCount: 4,
        backendRelationshipCount: 2,
        backendRuntimePropCount: 0,
        backendRuntimeAssetIds: [],
      };
      (window as any).__virtualStudioEnvironmentPreviewMock = 'data:image/jpeg;base64,cHVibGlzaC1wcmV2aWV3';
      window.dispatchEvent(new CustomEvent('create-new-scene'));
    });

    await expect(page.locator('#sceneComposerPanel')).toBeVisible();
    await page.getByRole('tab', { name: 'Miljø' }).click();
    await expect(page.getByTestId('environment-browser-panel')).toBeVisible();

    await page.getByTestId('publish-environment-pack-button').click();
    const dialog = page.getByTestId('publish-environment-pack-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Navn').fill('Marketplace Publish Pizza Test');
    await expect(dialog.getByText('Denne lagres som din egen kopi i Marketplace.')).toBeVisible();
    await expect(dialog.getByTestId('confirm-publish-environment-pack')).toContainText('Lagre egen kopi');
    await dialog.getByTestId('confirm-publish-environment-pack').click();

    await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);

    const search = page.getByPlaceholder('Søk produkter...');
    await search.fill('Marketplace Publish Pizza Test');
    await expect(
      page.locator('#marketplacePanel').getByRole('heading', { name: 'Marketplace Publish Pizza Test' }),
    ).toBeVisible();
  });

  test('installs a warehouse marketplace environment package and applies its industrial shell in the Environment Browser', async ({ page }) => {
    test.setTimeout(8 * 60_000);

    await installMarketplaceEnvironmentProduct(page, 'Warehouse Industrial', 'environment-warehouse-industrial-pack');
    await openEnvironmentBrowserFromSceneComposer(page);
    await applyMarketplaceEnvironmentPackage(page, 'marketplace-warehouse-industrial');

    await page.waitForFunction(
      () => (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId === 'warehouse',
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      () => {
        const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
        const shell = diagnostics?.sceneState?.roomShell;
        return shell?.type === 'warehouse' && Array.isArray(shell?.typeAccessoryKinds) && shell.typeAccessoryKinds.includes('warehouse_beam');
      },
      { timeout: 180_000 },
    );

    const diagnostics = await page.evaluate(() => {
      const env = (window as any).__virtualStudioDiagnostics?.environment;
      return {
        familyId: (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId ?? null,
        roomShellType: env?.sceneState?.roomShell?.type ?? null,
        typeAccessoryKinds: Array.isArray(env?.sceneState?.roomShell?.typeAccessoryKinds)
          ? env.sceneState.roomShell.typeAccessoryKinds
          : [],
      };
    });

    expect(diagnostics.familyId).toBe('warehouse');
    expect(diagnostics.roomShellType).toBe('warehouse');
    expect(diagnostics.typeAccessoryKinds).toContain('warehouse_beam');
  });

  test('installs a noir marketplace environment package and applies noir lighting cues in the Environment Browser', async ({ page }) => {
    test.setTimeout(8 * 60_000);

    await installMarketplaceEnvironmentProduct(page, 'Noir Detective', 'environment-noir-detective-pack');
    await openEnvironmentBrowserFromSceneComposer(page);
    await applyMarketplaceEnvironmentPackage(page, 'marketplace-noir-detective');

    await page.waitForFunction(
      () => (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId === 'noir',
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      () => {
        const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
        const lights = diagnostics?.sceneState?.lights;
        return Array.isArray(lights) && lights.some((light: any) => light.role === 'key' && light.goboId === 'blinds');
      },
      { timeout: 180_000 },
    );

    const diagnostics = await page.evaluate(() => {
      const env = (window as any).__virtualStudioDiagnostics?.environment;
      const lights = Array.isArray(env?.sceneState?.lights) ? env.sceneState.lights : [];
      return {
        familyId: (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId ?? null,
        roomShellType: env?.sceneState?.roomShell?.type ?? null,
        keyLight: lights.find((light: any) => light.role === 'key') ?? null,
      };
    });

    expect(diagnostics.familyId).toBe('noir');
    expect(diagnostics.roomShellType).toBe('interior_room');
    expect(diagnostics.keyLight?.goboId).toBe('blinds');
    expect(diagnostics.keyLight?.goboProjectionApplied).toBeTruthy();
  });

  test('installs a luxury retail marketplace environment package and applies a premium storefront shell in the Environment Browser', async ({ page }) => {
    test.setTimeout(8 * 60_000);

    await installMarketplaceEnvironmentProduct(page, 'Luxury Retail', 'environment-luxury-retail-pack');
    await openEnvironmentBrowserFromSceneComposer(page);
    await applyMarketplaceEnvironmentPackage(page, 'marketplace-luxury-retail');

    await page.waitForFunction(
      () => (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId === 'luxury_retail',
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      () => {
        const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
        const shell = diagnostics?.sceneState?.roomShell;
        return shell?.type === 'storefront'
          && shell?.ceilingStyle === 'coffered'
          && Array.isArray(shell?.typeAccessoryKinds)
          && shell.typeAccessoryKinds.includes('ceiling_coffered');
      },
      { timeout: 180_000 },
    );

    const diagnostics = await page.evaluate(() => {
      const env = (window as any).__virtualStudioDiagnostics?.environment;
      return {
        familyId: (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId ?? null,
        roomShellType: env?.sceneState?.roomShell?.type ?? null,
        ceilingStyle: env?.sceneState?.roomShell?.ceilingStyle ?? null,
        typeAccessoryKinds: Array.isArray(env?.sceneState?.roomShell?.typeAccessoryKinds)
          ? env.sceneState.roomShell.typeAccessoryKinds
          : [],
      };
    });

    expect(diagnostics.familyId).toBe('luxury_retail');
    expect(diagnostics.roomShellType).toBe('storefront');
    expect(diagnostics.ceilingStyle).toBe('coffered');
    expect(diagnostics.typeAccessoryKinds).toContain('ceiling_coffered');
  });

  test('installs a film soundstage marketplace environment package and applies abstract stage shell accessories in the Environment Browser', async ({ page }) => {
    test.setTimeout(8 * 60_000);

    await installMarketplaceEnvironmentProduct(page, 'Film Soundstage', 'environment-film-soundstage-pack');
    await openEnvironmentBrowserFromSceneComposer(page);
    await applyMarketplaceEnvironmentPackage(page, 'marketplace-film-soundstage');

    await page.waitForFunction(
      () => (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId === 'film_studio',
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      () => {
        const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
        const shell = diagnostics?.sceneState?.roomShell;
        return shell?.type === 'abstract_stage'
          && Array.isArray(shell?.typeAccessoryKinds)
          && shell.typeAccessoryKinds.includes('stage_edge');
      },
      { timeout: 180_000 },
    );

    const diagnostics = await page.evaluate(() => {
      const env = (window as any).__virtualStudioDiagnostics?.environment;
      return {
        familyId: (window as any).__virtualStudioLastEnvironmentPlanInsights?.familyId ?? null,
        roomShellType: env?.sceneState?.roomShell?.type ?? null,
        typeAccessoryKinds: Array.isArray(env?.sceneState?.roomShell?.typeAccessoryKinds)
          ? env.sceneState.roomShell.typeAccessoryKinds
          : [],
      };
    });

    expect(diagnostics.familyId).toBe('film_studio');
    expect(diagnostics.roomShellType).toBe('abstract_stage');
    expect(diagnostics.typeAccessoryKinds).toEqual(expect.arrayContaining(['cyclorama_curve', 'stage_edge']));
  });
});
