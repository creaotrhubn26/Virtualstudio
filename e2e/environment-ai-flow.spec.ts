import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type PlannerRequestPayload = {
  prompt?: string;
  referenceImages?: string[];
  preferredPresetId?: string;
  worldModelProvider?: string;
  worldModelReference?: {
    provider?: string;
    mode?: string;
    prompt?: string;
    notes?: string;
    importedImageCount?: number;
    previewLabels?: string[];
  };
};

type EnvironmentDiagnostics = {
  serviceState: {
    activePresetId?: string | null;
  };
  sceneState: {
    walls: Record<string, { materialId: string | null }>;
    floor: { materialId: string | null };
    props: Array<{
      assetId: string;
      position: [number, number, number];
      environmentGenerated?: boolean;
    }>;
  };
};

type PlannerReferenceSeed = {
  name: string;
  dataUrl: string;
};

type PlannerSeedDraft = {
  brief?: string;
  subjectFocus?: string;
  mood?: string;
  sceneTalent?: string;
  shotIntent?: string;
  mustHaveElements?: string;
  selectedTemplateId?: string;
  worldModelProvider?: string;
  geniePrompt?: string;
  genieNotes?: string;
  referenceImages?: PlannerReferenceSeed[];
};

const REFERENCE_IMAGE_PATH = path.resolve(process.cwd(), 'public/role-foto.png');

test.use({
  trace: 'off',
  screenshot: 'off',
  video: 'off',
});

function createBasePlan(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0',
    planId: 'e2e-plan',
    prompt: 'Test prompt',
    source: 'prompt',
    summary: 'E2E environment plan',
    concept: 'E2E concept',
    roomShell: {
      type: 'studio_shell',
      width: 20,
      depth: 20,
      height: 6,
      openCeiling: true,
      notes: [],
    },
    surfaces: [],
    atmosphere: {
      fogEnabled: false,
      ambientIntensity: 0.7,
    },
    ambientSounds: [],
    props: [],
    lighting: [],
    camera: {
      shotType: 'hero shot',
      target: [0, 1, 0],
      positionHint: [0, 1.7, 4.2],
      fov: 0.82,
    },
    assemblySteps: [],
    compatibility: {
      currentStudioShellSupported: true,
      confidence: 0.95,
      gaps: [],
      nextBuildModules: [],
    },
    ...overrides,
  };
}

function createPlannerResponse(plan: Record<string, unknown>) {
  return {
    success: true,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    usedFallback: false,
    plan,
  };
}

async function readLastPlannerRequest(page: Page): Promise<PlannerRequestPayload | null> {
  return page.evaluate(() => {
    const requests = (window as any).__virtualStudioEnvironmentPlannerRequests as PlannerRequestPayload[] | undefined;
    if (!requests || requests.length === 0) {
      return null;
    }
    return requests[requests.length - 1];
  });
}

async function imageFileToDataUrl(filePath: string): Promise<PlannerReferenceSeed> {
  const buffer = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
  return {
    name: path.basename(filePath),
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
  };
}

async function openEnvironmentPlanner(page: Page, plannerResponse: Record<string, unknown>): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });
  await page.waitForFunction(() => {
    const root = document.getElementById('sceneComposerRoot');
    return Boolean(root && root.childElementCount > 0);
  }, { timeout: 90_000 });

  await page.evaluate((mock) => {
    (window as any).__virtualStudioEnvironmentPlannerRequests = [];
    (window as any).__virtualStudioEnvironmentPlannerStatusMock = {
      enabled: true,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      hasVisionSupport: true,
      supportedWorldModelProviders: ['none', 'manual', 'genie'],
    };
    (window as any).__virtualStudioEnvironmentPlannerMock = mock;

    const plannerStatusResponse = (window as any).__virtualStudioEnvironmentPlannerStatusMock;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : input.toString();
      const requestMethod = init?.method
        ?? (input instanceof Request ? input.method : 'GET');
      const url = new URL(requestUrl, window.location.origin);

      if (!url.pathname.startsWith('/api/')) {
        return originalFetch(input, init);
      }

      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (url.pathname === '/api/settings/list') {
        return json({ entries: [] });
      }

      if (url.pathname === '/api/settings') {
        if (requestMethod.toUpperCase() === 'GET') {
          return json({ data: null });
        }
        return json({ success: true });
      }

      if (url.pathname === '/api/ml/health') {
        return json({
          available: false,
          services: {},
        });
      }

      if (url.pathname === '/api/environment/planner/status') {
        return json(plannerStatusResponse);
      }

      if (url.pathname === '/api/environment/plan') {
        return json(mock);
      }

      return json({ success: true });
    };
  }, plannerResponse);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('ch-open-scene-composer', {
      detail: {
        tab: 'environment',
      },
    }));
  });
  await page.waitForFunction(() => {
    const panel = document.getElementById('sceneComposerPanel');
    return Boolean(panel && panel.style.display === 'block');
  }, { timeout: 10_000 });
  await expect(page.locator('#sceneComposerPanel')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => {
    const panel = document.getElementById('sceneComposerPanel');
    return Boolean(panel && panel.querySelectorAll('[role="tab"]').length >= 4);
  }, { timeout: 30_000 });
  const environmentTab = page.locator('#sceneComposerPanel [role="tab"]').filter({ hasText: 'Miljø' }).first();
  await expect(environmentTab).toBeVisible({ timeout: 30_000 });
  await environmentTab.click({ force: true });
  await expect(page.getByRole('heading', { name: 'Sett Opp Scene' })).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioAiPlannerTestApi?.getSnapshot), { timeout: 30_000 });
}

async function readDiagnostics(page: Page, reason: string): Promise<EnvironmentDiagnostics> {
  return page.evaluate((diagnosticReason) => {
    const studio = (window as any).virtualStudio;
    if (!studio?.buildEnvironmentDiagnostics) {
      throw new Error('Environment diagnostics are not available');
    }
    return studio.buildEnvironmentDiagnostics(diagnosticReason);
  }, reason) as Promise<EnvironmentDiagnostics>;
}

async function waitForProps(page: Page, assetIds: string[]): Promise<void> {
  await page.waitForFunction((ids: string[]) => {
    const studio = (window as any).virtualStudio;
    const diagnostics = studio?.buildEnvironmentDiagnostics?.('wait-for-props');
    const props = diagnostics?.sceneState?.props ?? [];
    return ids.every((id) => props.some((prop: { assetId: string }) => prop.assetId === id));
  }, assetIds, { timeout: 30_000 });
}

async function waitForSurfaceMaterials(
  page: Page,
  expected: Partial<Record<'backWall' | 'leftWall' | 'rightWall' | 'rearWall' | 'floor', string>>,
): Promise<void> {
  await page.waitForFunction((targets) => {
    const studio = (window as any).virtualStudio;
    const diagnostics = studio?.buildEnvironmentDiagnostics?.('wait-for-surface-materials');
    if (!diagnostics?.sceneState) {
      return false;
    }

    const wallState = diagnostics.sceneState.walls ?? {};
    const floorState = diagnostics.sceneState.floor ?? {};

    return Object.entries(targets).every(([target, materialId]) => {
      if (!materialId) return true;
      if (target === 'floor') {
        return floorState.materialId === materialId;
      }
      return wallState[target]?.materialId === materialId;
    });
  }, expected, { timeout: 30_000 });
}

async function seedPlannerDraft(page: Page, draft: PlannerSeedDraft): Promise<void> {
  await page.evaluate(async (nextDraft) => {
    const api = (window as any).__virtualStudioAiPlannerTestApi;
    if (!api?.seedDraft) {
      throw new Error('AI planner test API is not available');
    }

    await api.seedDraft(nextDraft);
  }, draft);
}

async function generatePlannerResult(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const api = (window as any).__virtualStudioAiPlannerTestApi;
    if (!api?.generate) {
      throw new Error('AI planner test API is not available');
    }

    await api.generate();
  });
}

async function waitForPlannerDraft(page: Page, expectedBrief?: string): Promise<void> {
  await page.waitForFunction((nextBrief) => {
    const snapshot = (window as any).__virtualStudioAiPlannerTestApi?.getSnapshot?.();
    if (!snapshot?.hasEnoughInput) {
      return false;
    }

    if (typeof nextBrief === 'string') {
      return snapshot.brief === nextBrief;
    }

    return true;
  }, expectedBrief, { timeout: 120_000 });
}

async function waitForPlannerResult(page: Page, expectedConcept: string): Promise<void> {
  await page.waitForFunction((nextConcept) => {
    const snapshot = (window as any).__virtualStudioAiPlannerTestApi?.getSnapshot?.();
    return snapshot?.hasResult && snapshot.resultConcept === nextConcept;
  }, expectedConcept, { timeout: 120_000 });
}

async function applyEnvironmentPlan(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const api = (window as any).__virtualStudioAiPlannerTestApi;
    if (!api?.apply) {
      throw new Error('AI planner test API is not available');
    }

    await api.apply();
  });
}

test.describe('AI Environment Builder UI', () => {
  test.describe.configure({ timeout: 240_000 });

  test('builds a 3D pizza environment from a text brief', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-text-pizza',
      prompt: 'Pizza-reklame med varm italiensk pizzeria-følelse',
      source: 'prompt',
      summary: 'Varm pizzeria-scene med hero-props på bord.',
      concept: 'Rustic Italian Pizzeria Studio',
      surfaces: [
        { target: 'backWall', materialId: 'brick-white', visible: true },
        { target: 'leftWall', materialId: 'stucco', visible: true },
        { target: 'rightWall', materialId: 'wood-panels', visible: true },
        { target: 'rearWall', materialId: 'plaster', visible: true },
        { target: 'floor', materialId: 'checkerboard', visible: true },
      ],
      props: [
        { name: 'Rustic wooden table', category: 'hero', priority: 'high', placementHint: 'Center foreground' },
        { name: 'Freshly baked pizza', category: 'hero', priority: 'high', placementHint: 'On the rustic wooden table' },
        { name: 'Wine bottle', category: 'supporting', priority: 'medium', placementHint: 'On the table, next to the pizza' },
        { name: 'Wine glass', category: 'supporting', priority: 'medium', placementHint: 'On the table, next to the wine bottle' },
        { name: 'Italian herb pots', category: 'set_dressing', priority: 'medium', placementHint: 'On the table or a nearby shelf' },
        { name: 'Pizza peel', category: 'set_dressing', priority: 'medium', placementHint: 'Leaning against the back wall' },
        { name: 'Menu board', category: 'set_dressing', priority: 'medium', placementHint: 'Side wall' },
      ],
    }));
    await openEnvironmentPlanner(page, plannerResponse);
    await expect(page.getByRole('button', { name: 'Pizza-reklame med varm italiensk pizzeria-følelse' })).toBeVisible();
    await seedPlannerDraft(page, {
      brief: 'Pizza-reklame med varm italiensk pizzeria-følelse',
    });
    await waitForPlannerDraft(page, 'Pizza-reklame med varm italiensk pizzeria-følelse');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Rustic Italian Pizzeria Studio');

    await expect(page.getByText('Rustic Italian Pizzeria Studio')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('3D-objekter AI vil bygge')).toBeVisible();

    await applyEnvironmentPlan(page);

    await waitForProps(page, [
      'table_rustic',
      'pizza_hero_display',
      'wine_bottle_red',
      'wine_glass_clear',
      'herb_pots_cluster',
      'pizza_peel_wall',
      'menu_board_wall',
    ]);
    await waitForSurfaceMaterials(page, {
      backWall: 'brick-white',
      floor: 'checkerboard',
    });

    const diagnostics = await readDiagnostics(page, 'text-pizza-ui');
    const props = diagnostics.sceneState.props;
    const table = props.find((prop) => prop.assetId === 'table_rustic');
    const pizza = props.find((prop) => prop.assetId === 'pizza_hero_display');

    expect(diagnostics.sceneState.walls.backWall.materialId).toBe('brick-white');
    expect(diagnostics.sceneState.floor.materialId).toBe('checkerboard');
    expect(table).toBeDefined();
    expect(pizza).toBeDefined();
    expect(pizza!.position[1]).toBeGreaterThan(table!.position[1]);
    expect(props.every((prop) => prop.environmentGenerated)).toBeTruthy();

    await expect.poll(async () => (await readLastPlannerRequest(page))?.prompt ?? '', {
      timeout: 10_000,
    }).toContain('Pizza-reklame');
    const lastRequest = await readLastPlannerRequest(page);
    expect(lastRequest?.referenceImages ?? []).toHaveLength(0);
  });

  test('builds a 3D environment from a reference image upload', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-reference-beauty',
      prompt: '',
      source: 'reference_image',
      summary: 'Mørk beauty-scene bygget fra referanse.',
      concept: 'Luxury Beauty Editorial Set',
      surfaces: [
        { target: 'backWall', materialId: 'black', visible: true },
        { target: 'leftWall', materialId: 'nolan-dark', visible: true },
        { target: 'rightWall', materialId: 'burgundy', visible: true },
        { target: 'rearWall', materialId: 'black', visible: true },
        { target: 'floor', materialId: 'black-glossy', visible: true },
      ],
      props: [
        { name: 'Beauty table', category: 'hero', priority: 'high', placementHint: 'Center foreground' },
        { name: 'Product podium', category: 'supporting', priority: 'high', placementHint: 'Centered just behind the beauty table' },
        { name: 'Reflective panel', category: 'set_dressing', priority: 'medium', placementHint: 'Slightly to camera-left for glossy highlights' },
      ],
    }));
    await openEnvironmentPlanner(page, plannerResponse);
    await seedPlannerDraft(page, {
      referenceImages: [await imageFileToDataUrl(REFERENCE_IMAGE_PATH)],
    });
    await waitForPlannerDraft(page);
    await expect(page.getByText('role-foto.png')).toBeVisible({ timeout: 10_000 });
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Luxury Beauty Editorial Set');
    await expect(page.getByText('Luxury Beauty Editorial Set')).toBeVisible({ timeout: 20_000 });
    await applyEnvironmentPlan(page);

    await waitForProps(page, [
      'beauty_table',
      'product_podium_round',
      'reflective_panel',
    ]);
    await waitForSurfaceMaterials(page, {
      leftWall: 'nolan-dark',
      floor: 'black-glossy',
    });

    const diagnostics = await readDiagnostics(page, 'reference-image-ui');
    expect(diagnostics.sceneState.walls.leftWall.materialId).toBe('nolan-dark');
    expect(diagnostics.sceneState.floor.materialId).toBe('black-glossy');

    const lastRequest = await readLastPlannerRequest(page);
    expect(lastRequest?.referenceImages).toHaveLength(1);
    expect(lastRequest?.referenceImages?.[0] ?? '').toContain('data:image/');
  });

  test('forwards Genie world-sketch context and builds matching 3D props', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-genie-cyberpunk',
      prompt: 'Neon-tung cyberpunk produktscene',
      source: 'genie_reference',
      concept: 'Cinematic Neon Product Alley',
      summary: 'Blade Runner-inspirert scene med tydelige signage- og podium-props.',
      recommendedPresetId: 'cinematic-blade-runner',
      worldModel: {
        provider: 'genie',
        mode: 'world_sketch',
        prompt: 'Rainy neon alley with reflective streets and cyan/magenta signage',
        notes: 'Preserve the wet ground, signage depth, and moody haze.',
        importedImageCount: 1,
        summary: 'Imported from Genie as lookdev reference.',
        previewLabels: ['role-foto.png'],
      },
      surfaces: [
        { target: 'backWall', materialId: 'blade-runner', visible: true },
        { target: 'leftWall', materialId: 'urban-neon-cyan', visible: true },
        { target: 'rightWall', materialId: 'urban-neon-orange', visible: true },
        { target: 'rearWall', materialId: 'blade-runner', visible: true },
        { target: 'floor', materialId: 'blade-runner-wet', visible: true },
      ],
      props: [
        { name: 'Product podium', category: 'hero', priority: 'high', placementHint: 'Center foreground' },
        { name: 'Cyan neon sign', category: 'set_dressing', priority: 'medium', placementHint: 'Left wall' },
        { name: 'Magenta neon sign', category: 'set_dressing', priority: 'medium', placementHint: 'Right wall' },
        { name: 'Display shelf', category: 'supporting', priority: 'medium', placementHint: 'Back wall with layered product silhouettes' },
      ],
    }));
    await openEnvironmentPlanner(page, plannerResponse);
    await seedPlannerDraft(page, {
      brief: 'Neon-tung cyberpunk produktscene',
      worldModelProvider: 'genie',
      geniePrompt: 'Rainy neon alley with reflective streets and cyan/magenta signage',
      genieNotes: 'Bevar vått gulv, cyan/magenta-skilt og dybde bak produktet.',
      referenceImages: [await imageFileToDataUrl(REFERENCE_IMAGE_PATH)],
    });
    await waitForPlannerDraft(page, 'Neon-tung cyberpunk produktscene');
    await expect(page.getByText('Genie import aktiv')).toBeVisible({ timeout: 10_000 });
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Cinematic Neon Product Alley');
    await expect(page.getByText('World model: genie')).toBeVisible({ timeout: 20_000 });
    await applyEnvironmentPlan(page);

    await waitForProps(page, [
      'product_podium_round',
      'neon_sign_cyan',
      'neon_sign_magenta',
      'display_shelf_wall',
    ]);
    await waitForSurfaceMaterials(page, {
      backWall: 'blade-runner',
      floor: 'blade-runner-wet',
    });

    const diagnostics = await readDiagnostics(page, 'genie-ui');
    expect(diagnostics.serviceState.activePresetId).toBe('cinematic-blade-runner');
    expect(diagnostics.sceneState.floor.materialId).toBe('blade-runner-wet');

    const lastRequest = await readLastPlannerRequest(page);
    expect(lastRequest?.worldModelProvider).toBe('genie');
    expect(lastRequest?.worldModelReference?.provider).toBe('genie');
    expect(lastRequest?.worldModelReference?.importedImageCount).toBe(1);
    expect(lastRequest?.worldModelReference?.previewLabels).toContain('role-foto.png');
  });
});
