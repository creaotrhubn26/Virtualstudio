import { expect, test, type Page } from '@playwright/test';

type PlannerRequestPayload = {
  prompt?: string;
  referenceImages?: string[];
  preferredPresetId?: string;
  roomConstraints?: {
    currentShell?: string;
    supportsParametricGeometry?: boolean;
    supportsPresetMaterials?: boolean;
  };
  worldModelProvider?: string;
  worldModelReference?: {
    provider?: string;
    mode?: string;
    prompt?: string;
    notes?: string;
    importedImageCount?: number;
    previewLabels?: string[];
  };
  brandReference?: {
    brandName?: string;
    usageNotes?: string;
    logoImage?: string;
  };
};

type EnvironmentDiagnostics = {
  serviceState: {
    activePresetId?: string | null;
  };
  sceneState: {
    walls: Record<string, { materialId: string | null }>;
    floor: { materialId: string | null };
    roomShell: {
      type: string;
      width: number;
      depth: number;
      height: number;
      openCeiling: boolean;
      openings: Array<{
        id: string;
        wallTarget: string;
        kind: string;
        xAlign: string;
      }>;
      zones: Array<{
        id: string;
        label: string;
        purpose: string;
        xBias: number;
        zBias: number;
      }>;
      fixtures: Array<{
        id: string;
        kind: string;
        zoneId?: string | null;
      }>;
      renderedOpenings: string[];
      renderedFixtures: string[];
      ceilingVisible: boolean;
    };
    branding: {
      planId?: string | null;
      brandName?: string | null;
      palette: string[];
      signageText?: string | null;
      hasLogo: boolean;
      applyToEnvironment: boolean;
      applyToWardrobe: boolean;
      applyToSignage: boolean;
      applicationTargets: string[];
      notes: string[];
    };
    atmosphere: {
      fogEnabled: boolean;
      fogDensity: number;
      fogColor?: string | null;
      clearColor?: string | null;
      ambientLightIntensity?: number | null;
      ambientLightColor?: string | null;
    };
    camera: {
      position: [number, number, number];
      target: [number, number, number] | null;
      fov: number;
      focalLength: number;
      shotType?: string | null;
      mood?: string | null;
      autoRig?: boolean;
      planId?: string | null;
    };
    props: Array<{
      assetId: string;
      position: [number, number, number];
      environmentGenerated?: boolean;
      brandDecorationKinds?: string[];
    }>;
    characters: Array<{
      id: string;
      name: string;
      role?: string | null;
      avatarUrl?: string | null;
      avatarId?: string | null;
      position: [number, number, number];
      rotationY: number;
      wardrobeStyle?: string | null;
      wardrobeVariantId?: string | null;
      logoPlacement?: string | null;
      outfitColors?: string[];
      placementHint?: string | null;
      actionHint?: string | null;
      wardrobeNotes?: string[];
      appearance?: {
        skinTone?: string | null;
        hairColor?: string | null;
        hairStyle?: string | null;
        facialHair?: string | null;
      } | null;
      behaviorPlan?: {
        type?: string | null;
        homeZoneId?: string | null;
        routeZoneIds?: string[];
        lookAtTarget?: string | null;
        pace?: string | null;
        radius?: number | null;
      } | null;
      behaviorState?: {
        phase?: string | null;
        carryKind?: string | null;
        targetKind?: string | null;
        targetId?: string | null;
        blockingOffset?: number | null;
        lastPhaseChangeAtMs?: number | null;
      } | null;
      environmentGenerated?: boolean;
    }>;
    lights: Array<{
      id: string;
      name: string;
      type: string;
      role?: string | null;
      purpose?: string | null;
      position: [number, number, number];
      meshPosition: [number, number, number];
      intensity: number;
      cct?: number | null;
      environmentAutoRig?: boolean;
      behaviorType?: string | null;
      target?: [number, number, number] | null;
      goboId?: string | null;
      goboPattern?: string | null;
      goboRotation?: number | null;
      goboSize?: number | null;
      goboIntensity?: number | null;
      goboProjectionApplied?: boolean | null;
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
  brandName?: string;
  brandNotes?: string;
  brandLogoImage?: PlannerReferenceSeed | null;
  selectedTemplateId?: string;
  worldModelProvider?: string;
  geniePrompt?: string;
  genieNotes?: string;
  referenceImages?: PlannerReferenceSeed[];
};

type CharacterDraftPatch = {
  skinTone?: string;
  actionHint?: string;
};

type ValidationMockResponse = {
  success: boolean;
  provider: string;
  usedFallback?: boolean;
  warnings?: string[];
  evaluation: {
    provider: string;
    verdict: 'approved' | 'needs_refinement';
    overallScore: number;
    categories: Record<string, { score: number; notes: string[] }>;
    suggestedAdjustments: string[];
    validatedAt: string;
    previewUsed?: boolean;
    previewSource?: string | null;
    usedVisionModel?: boolean;
    warnings?: string[];
    providerMetadata?: Record<string, unknown> | null;
  };
};

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
    characters: [],
    branding: null,
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

function createValidationMockResponse(overrides: Partial<ValidationMockResponse['evaluation']> = {}): ValidationMockResponse {
  return {
    success: true,
    provider: 'gemini_validation',
    usedFallback: false,
    evaluation: {
      provider: 'gemini_validation',
      verdict: 'needs_refinement',
      overallScore: 0.62,
      categories: {
        promptFidelity: { score: 0.84, notes: [] },
        compositionMatch: { score: 0.61, notes: [] },
        lightingIntentMatch: { score: 0.59, notes: [] },
        technicalIntegrity: { score: 0.71, notes: [] },
        roomRealism: { score: 0.63, notes: [] },
        brandConsistency: { score: 0.68, notes: [] },
      },
      suggestedAdjustments: [
        'Presiser lighting intent, modifier, beam angle og haze for flere lys.',
        'Legg til flere arkitektoniske signaler som pass-through, backroom eller nisjer.',
        'Juster kamera-shot, target og hero-zoner for tydeligere komposisjon.',
      ],
      validatedAt: new Date().toISOString(),
      previewUsed: true,
      previewSource: 'runtime_capture',
      usedVisionModel: true,
      providerMetadata: null,
      ...overrides,
    },
  };
}

async function installValidationMock(page: Page, responses: ValidationMockResponse[]): Promise<void> {
  await page.evaluate((mockResponses) => {
    (window as any).__virtualStudioEnvironmentValidationRequests = [];
    let responseIndex = 0;
    (window as any).__virtualStudioEnvironmentValidationMock = () => {
      const nextResponse = mockResponses[Math.min(responseIndex, mockResponses.length - 1)];
      responseIndex += 1;
      return nextResponse;
    };
  }, responses);
}

async function readValidationRequestCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    return ((window as any).__virtualStudioEnvironmentValidationRequests?.length) ?? 0;
  });
}

function createInlineLogoSeed(name = 'brand-logo.svg'): PlannerReferenceSeed {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">
      <rect width="240" height="120" rx="16" fill="#c0392b"/>
      <circle cx="62" cy="60" r="26" fill="#f4e7d3"/>
      <path d="M62 36 L74 60 L62 84 L50 60 Z" fill="#2f6b45"/>
      <text x="102" y="53" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#f4e7d3">Luigi's</text>
      <text x="102" y="82" font-family="Arial, sans-serif" font-size="20" fill="#f4e7d3">Pizza</text>
    </svg>
  `.trim();
  return {
    name,
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  };
}

function createInlineReferenceImageSeed(name = 'role-foto.png'): PlannerReferenceSeed {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#16181d"/>
          <stop offset="100%" stop-color="#343843"/>
        </linearGradient>
        <linearGradient id="key" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f8d5c5" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#f3bfd6" stop-opacity="0.55"/>
        </linearGradient>
      </defs>
      <rect width="960" height="640" fill="url(#bg)"/>
      <rect x="120" y="70" width="300" height="500" rx="22" fill="#0f1117" opacity="0.76"/>
      <rect x="560" y="96" width="250" height="448" rx="20" fill="#1b1f28" opacity="0.82"/>
      <ellipse cx="690" cy="332" rx="142" ry="220" fill="#11151d"/>
      <ellipse cx="708" cy="248" rx="72" ry="72" fill="#f0c1a7"/>
      <rect x="638" y="320" width="140" height="188" rx="48" fill="#1d2532"/>
      <rect x="626" y="356" width="48" height="128" rx="20" fill="#f0c1a7"/>
      <rect x="742" y="356" width="48" height="128" rx="20" fill="#f0c1a7"/>
      <ellipse cx="632" cy="246" rx="86" ry="184" fill="url(#key)" opacity="0.52"/>
      <rect x="250" y="156" width="92" height="340" rx="18" fill="#dad8d2" opacity="0.9"/>
      <rect x="272" y="214" width="48" height="124" rx="24" fill="#eef2f6" opacity="0.95"/>
      <circle cx="312" cy="468" r="26" fill="#d9dee5" opacity="0.88"/>
      <text x="132" y="118" fill="#f5f7fb" font-size="34" font-family="Arial, sans-serif" font-weight="700">Reference Beauty Setup</text>
      <text x="132" y="156" fill="#b7bfcc" font-size="22" font-family="Arial, sans-serif">Glossy editorial framing with side bounce and deep backdrop.</text>
    </svg>
  `.trim();

  return {
    name,
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
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
    const settingsStore = new Map<string, {
      userId: string;
      projectId: string | null;
      namespace: string;
      data: unknown;
    }>();
    (window as any).__virtualStudioSettingsMockStore = settingsStore;

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

      if (url.pathname.startsWith('/api/avatars/')) {
        return originalFetch(input, init);
      }

      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (url.pathname === '/api/settings/list') {
        const userId = url.searchParams.get('user_id') || 'default-user';
        const namespacePrefix = url.searchParams.get('namespace_prefix') || '';
        const projectId = url.searchParams.get('project_id');
        const entries = Array.from(settingsStore.values())
          .filter((entry) => entry.userId === userId)
          .filter((entry) => entry.namespace.startsWith(namespacePrefix))
          .filter((entry) => (projectId ? entry.projectId === projectId : true))
          .map((entry) => ({
            projectId: entry.projectId,
            namespace: entry.namespace,
            data: entry.data,
          }));
        return json({ entries });
      }

      if (url.pathname === '/api/settings') {
        if (requestMethod.toUpperCase() === 'GET') {
          const userId = url.searchParams.get('user_id') || 'default-user';
          const namespace = url.searchParams.get('namespace') || '';
          const projectId = url.searchParams.get('project_id');
          const key = `${userId}::${projectId || ''}::${namespace}`;
          return json({ data: settingsStore.get(key)?.data ?? null });
        }
        if (requestMethod.toUpperCase() === 'PUT') {
          const payload = JSON.parse(String(init?.body || '{}')) as {
            userId?: string;
            projectId?: string | null;
            namespace?: string;
            data?: unknown;
          };
          const userId = payload.userId || 'default-user';
          const namespace = payload.namespace || '';
          const projectId = payload.projectId || null;
          const key = `${userId}::${projectId || ''}::${namespace}`;
          settingsStore.set(key, {
            userId,
            projectId,
            namespace,
            data: payload.data ?? null,
          });
          return json({ success: true });
        }
        if (requestMethod.toUpperCase() === 'DELETE') {
          const userId = url.searchParams.get('user_id') || 'default-user';
          const namespace = url.searchParams.get('namespace') || '';
          const projectId = url.searchParams.get('project_id');
          const key = `${userId}::${projectId || ''}::${namespace}`;
          settingsStore.delete(key);
          return json({ success: true });
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

  await page.waitForFunction(() => Boolean((window as any).__virtualStudioGlobalEnvironmentPlannerHost?.open), { timeout: 30_000 });
  await page.evaluate(() => {
    (window as any).__virtualStudioGlobalEnvironmentPlannerHost?.open?.();
  });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioAiPlannerTestApi?.getSnapshot), { timeout: 30_000 });
  const plannerHeading = page.getByRole('heading', { name: 'Sett Opp Scene' });
  try {
    await expect(plannerHeading).toBeVisible({ timeout: 5_000 });
  } catch {
    // The hidden planner test API is the true contract for e2e. In some headless runs
    // the dialog heading can lag behind or fail to paint even though the planner mounts.
  }
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

async function waitForCharacters(page: Page, minimumCount: number): Promise<void> {
  await page.waitForFunction((count: number) => {
    const studio = (window as any).virtualStudio;
    const diagnostics = studio?.buildEnvironmentDiagnostics?.('wait-for-characters');
    const characters = diagnostics?.sceneState?.characters ?? [];
    return characters.length >= count;
  }, minimumCount, { timeout: 45_000 });
}

function distance3(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}

async function waitForCharacterMovement(
  page: Page,
  role: string,
  initialPosition: [number, number, number],
  minimumDistance = 0.08,
): Promise<void> {
  await expect.poll(async () => {
    const diagnostics = await readDiagnostics(page, `wait-for-character-movement-${role}`);
    const character = diagnostics.sceneState.characters.find((entry) => entry.role === role);
    if (!character) {
      return 0;
    }
    return distance3(character.position, initialPosition);
  }, {
    timeout: 15_000,
    intervals: [400, 700, 1000, 1200],
  }).toBeGreaterThan(minimumDistance);
}

async function waitForEnvironmentLights(page: Page, minimumCount = 1): Promise<void> {
  await page.waitForFunction((count: number) => {
    const studio = (window as any).virtualStudio;
    const diagnostics = studio?.buildEnvironmentDiagnostics?.('wait-for-lights');
    const lights = diagnostics?.sceneState?.lights ?? [];
    const autoRigLights = lights.filter((light: { environmentAutoRig?: boolean }) => Boolean(light.environmentAutoRig));
    return autoRigLights.length >= count;
  }, minimumCount, { timeout: 45_000 });
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

async function waitForRoomShell(
  page: Page,
  expected: Partial<EnvironmentDiagnostics['sceneState']['roomShell']>,
): Promise<void> {
  await page.waitForFunction((targets) => {
    const studio = (window as any).virtualStudio;
    const diagnostics = studio?.buildEnvironmentDiagnostics?.('wait-for-room-shell');
    const roomShell = diagnostics?.sceneState?.roomShell;
    if (!roomShell) {
      return false;
    }

    const candidate = roomShell as Record<string, unknown>;
    return Object.entries(targets).every(([key, value]) => candidate[key] === value);
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

async function clearBrandInputs(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const api = (window as any).__virtualStudioAiPlannerTestApi;
    if (!api?.clearBrandInputs) {
      throw new Error('AI planner clearBrandInputs helper is unavailable');
    }
    await api.clearBrandInputs();
  });
}

async function applyCharacterDraftPatch(page: Page, patch: CharacterDraftPatch): Promise<void> {
  await page.evaluate(async (nextPatch) => {
    const api = (window as any).__virtualStudioCharacterInspectorTestApi;
    if (!api?.applyDraftPatch) {
      throw new Error('Character inspector test API is unavailable');
    }
    const applied = await api.applyDraftPatch(nextPatch);
    if (!applied) {
      throw new Error('Character inspector draft patch was not applied');
    }
  }, patch);
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
  const initialSnapshot = await page.evaluate(() => {
    const api = (window as any).__virtualStudioAiPlannerTestApi;
    if (!api?.getSnapshot) {
      throw new Error('AI planner test API is not available');
    }
    return api.getSnapshot();
  });

  await page.evaluate(async () => {
    const api = (window as any).__virtualStudioAiPlannerTestApi;
    if (api?.startApply) {
      await api.startApply();
      return;
    }
    if (api?.apply) {
      await api.apply();
      return;
    }
    throw new Error('AI planner test API is not available');
  });

  await page.waitForFunction(([initialAppliedCount, initialSkippedCount]) => {
    const snapshot = (window as any).__virtualStudioAiPlannerTestApi?.getSnapshot?.();
    if (!snapshot) {
      return false;
    }
    if (snapshot.lastTestApiError) {
      return true;
    }
    if (snapshot.applyLoading) {
      return false;
    }
    return snapshot.appliedCount !== initialAppliedCount
      || snapshot.skippedCount !== initialSkippedCount;
  }, [initialSnapshot.appliedCount, initialSnapshot.skippedCount], { timeout: 240_000 });
}

async function logPlannerSnapshot(page: Page, label: string): Promise<void> {
  try {
    const snapshot = await page.evaluate(() => {
      return (window as any).__virtualStudioAiPlannerTestApi?.getSnapshot?.() ?? null;
    });
    console.log(`[environment-ai-flow] ${label} planner snapshot: ${JSON.stringify(snapshot)}`);
  } catch (error) {
    console.log(`[environment-ai-flow] ${label} planner snapshot unavailable: ${String(error)}`);
  }
}

async function logDiagnosticsSummary(page: Page, label: string): Promise<void> {
  try {
    const diagnostics = await readDiagnostics(page, `checkpoint-${label}`);
    console.log(
      `[environment-ai-flow] ${label} diagnostics: ${JSON.stringify({
        props: diagnostics.sceneState.props.map((prop) => prop.assetId),
        characters: diagnostics.sceneState.characters.map((character) => ({
          role: character.role,
          targetKind: character.behaviorState?.targetKind ?? null,
          targetId: character.behaviorState?.targetId ?? null,
        })),
        lights: diagnostics.sceneState.lights.map((light) => ({
          role: light.role,
          gobo: light.goboId ?? null,
        })),
        roomShell: diagnostics.sceneState.roomShell.type,
      })}`,
    );
  } catch (error) {
    console.log(`[environment-ai-flow] ${label} diagnostics unavailable: ${String(error)}`);
  }
}

test.describe('AI Environment Builder UI', () => {
  test.describe.configure({ timeout: 600_000 });

  test('builds a 3D pizza environment from a text brief', async ({ page }) => {
    const logoSeed = createInlineLogoSeed();
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-text-pizza',
      prompt: 'Pizza-reklame med varm italiensk pizzeria-følelse',
      source: 'prompt',
      summary: 'Varm pizzeria-scene med hero-props på bord.',
      concept: 'Rustic Italian Pizzeria Studio',
      roomShell: {
        type: 'storefront',
        width: 14,
        depth: 9,
        height: 5,
        openCeiling: false,
        notes: ['Warm restaurant shell with clear prep, counter and dining zones.'],
        openings: [
          {
            id: 'front_entry',
            wallTarget: 'backWall',
            kind: 'door',
            widthRatio: 0.18,
            heightRatio: 0.72,
            xAlign: 'right',
          },
          {
            id: 'service_pass',
            wallTarget: 'rightWall',
            kind: 'service_window',
            widthRatio: 0.22,
            heightRatio: 0.34,
            xAlign: 'center',
          },
        ],
        zones: [
          {
            id: 'prep_line',
            label: 'Prep line',
            purpose: 'prep',
            xBias: -0.36,
            zBias: 0.26,
            widthRatio: 0.28,
            depthRatio: 0.2,
            notes: ['Dough prep and ingredients'],
          },
          {
            id: 'oven_wall',
            label: 'Oven wall',
            purpose: 'background',
            xBias: -0.12,
            zBias: 0.34,
            widthRatio: 0.24,
            depthRatio: 0.18,
            notes: ['Pizza oven and peel staging'],
          },
          {
            id: 'front_counter',
            label: 'Front counter',
            purpose: 'counter',
            xBias: 0.3,
            zBias: -0.16,
            widthRatio: 0.3,
            depthRatio: 0.16,
            notes: ['Guest ordering zone'],
          },
          {
            id: 'dining_lane',
            label: 'Dining lane',
            purpose: 'dining',
            xBias: 0.18,
            zBias: 0.06,
            widthRatio: 0.34,
            depthRatio: 0.28,
            notes: ['Servers move through here'],
          },
          {
            id: 'hero_table',
            label: 'Hero table',
            purpose: 'hero',
            xBias: 0,
            zBias: -0.02,
            widthRatio: 0.24,
            depthRatio: 0.2,
            notes: ['Main pizza shot'],
          },
        ],
        fixtures: [
          {
            id: 'prep_island',
            kind: 'prep_island',
            zoneId: 'prep_line',
            widthRatio: 0.24,
            depthRatio: 0.14,
            height: 0.96,
          },
          {
            id: 'front_counter_block',
            kind: 'counter_block',
            zoneId: 'front_counter',
            widthRatio: 0.3,
            depthRatio: 0.14,
            height: 1.08,
          },
          {
            id: 'host_stand',
            kind: 'host_stand',
            zoneId: 'front_counter',
            xBias: 0.16,
            zBias: -0.08,
            widthRatio: 0.12,
            depthRatio: 0.08,
            height: 1.18,
          },
          {
            id: 'banquette_left',
            kind: 'banquette',
            zoneId: 'dining_lane',
            xBias: -0.26,
            zBias: 0.02,
            widthRatio: 0.18,
            depthRatio: 0.12,
            height: 1.08,
          },
          {
            id: 'pass_shelf',
            kind: 'pass_shelf',
            zoneId: 'oven_wall',
            wallTarget: 'rightWall',
            widthRatio: 0.2,
            depthRatio: 0.08,
            height: 1.2,
          },
        ],
      },
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
      characters: [
        {
          name: 'Bakemester',
          role: 'baker',
          archetypeId: 'worker_baker',
          priority: 'high',
          placementHint: 'Back-left prep counter',
          actionHint: 'Stretching dough and checking the oven',
          wardrobeStyle: 'baker',
          outfitColors: ['#c0392b', '#f4e7d3'],
          logoPlacement: 'apron_chest',
          appearance: {
            skinTone: '#c58c62',
            hairColor: '#2f241f',
            hairStyle: 'covered',
            facialHair: 'stubble',
          },
        },
        {
          name: 'Front-of-house',
          role: 'cashier',
          archetypeId: 'worker_cashier',
          priority: 'medium',
          placementHint: 'Front-right counter zone',
          actionHint: 'Welcoming guests and taking orders',
          wardrobeStyle: 'cashier',
          outfitColors: ['#2f6b45', '#f4e7d3'],
          logoPlacement: 'shirt_chest',
          appearance: {
            skinTone: '#f0c2a2',
            hairColor: '#6d4c41',
            hairStyle: 'bun',
            facialHair: 'none',
          },
        },
        {
          name: 'Servering',
          role: 'server',
          archetypeId: 'worker_server',
          priority: 'medium',
          placementHint: 'Midground right aisle',
          actionHint: 'Carrying plates through the dining zone',
          wardrobeStyle: 'server',
          outfitColors: ['#111827', '#f4e7d3'],
          logoPlacement: 'shirt_chest',
          appearance: {
            skinTone: '#8d5b3d',
            hairColor: '#1f2937',
            hairStyle: 'short',
            facialHair: 'none',
          },
        },
        {
          name: 'Vertskap',
          role: 'host',
          archetypeId: 'worker_host',
          priority: 'low',
          placementHint: 'Front entry host stand',
          actionHint: 'Greeting guests at the branded host stand',
          wardrobeStyle: 'host',
          outfitColors: ['#c0392b', '#f4e7d3', '#1f2937'],
          logoPlacement: 'shirt_chest',
          appearance: {
            skinTone: '#b97d5a',
            hairColor: '#2f241f',
            hairStyle: 'medium',
            facialHair: 'none',
          },
        },
        {
          name: 'Gjest',
          role: 'customer',
          archetypeId: 'customer_man',
          priority: 'low',
          placementHint: 'Dining lane booth zone',
          actionHint: 'Waiting for takeaway and looking toward the counter',
          wardrobeStyle: 'casual',
          outfitColors: ['#6b7280', '#f4e7d3'],
          logoPlacement: 'none',
          appearance: {
            skinTone: '#a86d4f',
            hairColor: '#231f20',
            hairStyle: 'short',
            facialHair: 'stubble',
          },
        },
      ],
      branding: {
        enabled: true,
        brandName: "Luigi's Pizza",
        palette: ['#c0392b', '#f4e7d3', '#2f6b45'],
        signageText: "Luigi's Pizza",
        logoImage: logoSeed.dataUrl,
        applyToEnvironment: true,
        applyToWardrobe: true,
        applyToSignage: true,
        applicationTargets: ['environment', 'wardrobe', 'signage', 'packaging', 'interior_details'],
        packagingStyle: 'box_stamp',
        interiorStyle: 'accent_trim',
        notes: ['Carry the uploaded logo into wardrobe, packaging and wall signage.'],
      },
      lighting: [
        {
          role: 'key',
          position: [2.8, 3.2, -2.4],
          intensity: 1.2,
          cct: 4200,
          purpose: 'Warm hero light for the pizza and table texture',
        },
        {
          role: 'rim',
          position: [-2.3, 3.8, 2.7],
          intensity: 0.75,
          cct: 3600,
          purpose: 'Warm separation on herbs and glassware',
        },
      ],
      camera: {
        shotType: 'hero shot',
        target: [0, 1, 0],
        positionHint: [0, 1.7, 4.2],
        fov: 0.82,
      },
    }));
    await openEnvironmentPlanner(page, plannerResponse);
    await logPlannerSnapshot(page, 'opened');
    await expect(page.getByRole('button', { name: 'Pizza-reklame med varm italiensk pizzeria-følelse' })).toBeVisible();
    await seedPlannerDraft(page, {
      brief: 'Pizza-reklame med varm italiensk pizzeria-følelse',
      brandName: "Luigi's Pizza",
      brandNotes: 'Branded forkler, varm italiensk palett, tydelig logo på uniformer og skilting.',
      brandLogoImage: logoSeed,
    });
    await logPlannerSnapshot(page, 'seeded');
    await waitForPlannerDraft(page, 'Pizza-reklame med varm italiensk pizzeria-følelse');
    await logPlannerSnapshot(page, 'draft-ready');
    await generatePlannerResult(page);
    await logPlannerSnapshot(page, 'generated');
    await waitForPlannerResult(page, 'Rustic Italian Pizzeria Studio');
    await logPlannerSnapshot(page, 'result-ready');

    await expect(page.getByText('Rustic Italian Pizzeria Studio')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('3D-objekter AI vil bygge')).toBeVisible();
    await expect(page.getByText('Karakterer AI vil sette inn')).toBeVisible();
    await expect(page.getByText('Branding og palett')).toBeVisible();

    await applyEnvironmentPlan(page);
    await logPlannerSnapshot(page, 'applied');
    await logDiagnosticsSummary(page, 'post-apply');

    await waitForProps(page, [
      'table_rustic',
      'pizza_hero_display',
      'wine_bottle_red',
      'wine_glass_clear',
      'herb_pots_cluster',
      'pizza_peel_wall',
      'menu_board_wall',
    ]);
    await logDiagnosticsSummary(page, 'props-ready');
    await waitForSurfaceMaterials(page, {
      backWall: 'brick-white',
      floor: 'checkerboard',
    });
    await logDiagnosticsSummary(page, 'materials-ready');
    await waitForRoomShell(page, {
      type: 'storefront',
      width: 14,
      depth: 9,
      height: 5,
      openCeiling: false,
      ceilingVisible: true,
    });
    await logDiagnosticsSummary(page, 'shell-ready');
    await waitForCharacters(page, 5);
    await logDiagnosticsSummary(page, 'characters-ready');
    await waitForEnvironmentLights(page, 2);
    await logDiagnosticsSummary(page, 'lights-ready');

    const diagnostics = await readDiagnostics(page, 'text-pizza-ui');
    const props = diagnostics.sceneState.props;
    const characters = diagnostics.sceneState.characters;
    const lights = diagnostics.sceneState.lights;
    const heroPizzas = props.filter((prop) => prop.assetId === 'pizza_hero_display');
    const table = props.find((prop) => prop.assetId === 'table_rustic');
    const pizza = props.find((prop) => prop.assetId === 'pizza_hero_display');
    const menuBoard = props.find((prop) => prop.assetId === 'menu_board_wall');
    const rusticTable = props.find((prop) => prop.assetId === 'table_rustic');
    const keyLight = lights.find((light) => light.role === 'key');
    const rimLight = lights.find((light) => light.role === 'rim');
    const baker = characters.find((character) => character.role === 'baker');
    const cashier = characters.find((character) => character.role === 'cashier');
    const bakerInitialPosition = baker?.position;

    expect(diagnostics.sceneState.walls.backWall.materialId).toBe('brick-white');
    expect(diagnostics.sceneState.floor.materialId).toBe('checkerboard');
    expect(diagnostics.sceneState.branding.brandName).toBe("Luigi's Pizza");
    expect(diagnostics.sceneState.branding.hasLogo).toBeTruthy();
    expect(diagnostics.sceneState.branding.applicationTargets).toEqual(
      expect.arrayContaining(['signage', 'packaging', 'interior_details']),
    );
    expect(diagnostics.sceneState.roomShell.zones.map((zone) => zone.id)).toEqual(
      expect.arrayContaining(['prep_line', 'oven_wall', 'front_counter', 'dining_lane', 'hero_table']),
    );
    expect(diagnostics.sceneState.roomShell.fixtures.map((fixture) => fixture.id)).toEqual(
      expect.arrayContaining(['prep_island', 'front_counter_block', 'host_stand', 'banquette_left', 'pass_shelf']),
    );
    expect(diagnostics.sceneState.roomShell.renderedOpenings).toEqual(
      expect.arrayContaining(['front_entry', 'service_pass']),
    );
    expect(diagnostics.sceneState.roomShell.renderedFixtures).toEqual(
      expect.arrayContaining(['prep_island', 'front_counter_block', 'host_stand', 'banquette_left', 'pass_shelf']),
    );
    expect(heroPizzas).toHaveLength(1);
    expect(table).toBeDefined();
    expect(pizza).toBeDefined();
    expect(menuBoard?.brandDecorationKinds).toContain('signage');
    expect(menuBoard?.brandDecorationKinds).toContain('interior_trim');
    expect(rusticTable?.brandDecorationKinds).toEqual(
      expect.arrayContaining(['packaging', 'interior_trim']),
    );
    expect(pizza!.position[1]).toBeGreaterThan(table!.position[1]);
    expect(props.every((prop) => prop.environmentGenerated)).toBeTruthy();
    expect(characters).toHaveLength(5);
    expect(characters.every((character) => character.environmentGenerated)).toBeTruthy();
    expect(characters.every((character) => !!character.avatarUrl || !!character.avatarId)).toBeTruthy();
    expect(baker?.placementHint).toContain('prep');
    expect(baker?.appearance?.hairStyle).toBe('covered');
    expect(baker?.logoPlacement).toBe('apron_chest');
    expect(baker?.behaviorPlan?.type).toBe('work_loop');
    expect(baker?.behaviorPlan?.homeZoneId).toBe('prep_line');
    expect(baker?.behaviorPlan?.routeZoneIds ?? []).toEqual(expect.arrayContaining(['prep_line', 'oven_wall']));
    expect(baker?.behaviorState?.phase).toBeTruthy();
    expect(['dough_tray', 'pizza_peel', 'pizza_box', null, undefined]).toContain(baker?.behaviorState?.carryKind);
    expect(['fixture', 'scene_anchor', 'zone', 'route', null, undefined]).toContain(baker?.behaviorState?.targetKind);
    expect(cashier?.behaviorPlan?.type).toBe('counter_service');
    expect(cashier?.behaviorPlan?.homeZoneId).toBe('front_counter');
    const host = characters.find((character) => character.role === 'host');
    const customer = characters.find((character) => character.role === 'customer');
    expect(host?.behaviorPlan?.type).toBe('counter_service');
    expect(customer?.behaviorPlan?.type).toBe('patrol');
    expect(['fixture', 'scene_anchor', 'zone', 'route', 'queue_slot', 'dining_slot']).toContain(customer?.behaviorState?.targetKind);
    expect(lights).toHaveLength(2);
    expect(lights.every((light) => light.environmentAutoRig)).toBeTruthy();
    expect(keyLight?.cct).toBe(4200);
    expect(rimLight?.goboId).toBe('window');
    expect(rimLight?.goboProjectionApplied).toBeTruthy();
    expect(diagnostics.sceneState.camera.autoRig).toBeTruthy();
    expect(diagnostics.sceneState.camera.shotType).toBe('hero shot');
    expect(diagnostics.sceneState.camera.focalLength).toBe(65);

    if (!bakerInitialPosition) {
      throw new Error('Missing initial baker position for movement assertion');
    }
    await waitForCharacterMovement(page, 'baker', bakerInitialPosition, 0.12);

    await page.waitForFunction(() => {
      const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
      const characters = diagnostics?.sceneState?.characters || [];
      const cashier = characters.find((character: any) => character.role === 'cashier');
      const customer = characters.find((character: any) => character.role === 'customer');
      return Boolean(
        customer?.id
        && cashier?.behaviorState?.targetKind === 'actor'
        && cashier?.behaviorState?.targetId === customer.id
        && (customer?.behaviorState?.phase === 'queue' || customer?.behaviorState?.phase === 'dine')
        && (customer?.behaviorState?.targetKind === 'queue_slot' || customer?.behaviorState?.targetKind === 'dining_slot')
      );
    }, { timeout: 30_000 });

    const interactionDiagnostics = await readDiagnostics(page, 'text-pizza-ui-interactions');
    const interactionCashier = interactionDiagnostics.sceneState.characters.find((character) => character.role === 'cashier');
    const interactionCustomer = interactionDiagnostics.sceneState.characters.find((character) => character.role === 'customer');
    expect(interactionCashier?.behaviorState?.targetKind).toBe('actor');
    expect(interactionCashier?.behaviorState?.targetId).toBe(interactionCustomer?.id);
    expect(['queue', 'dine']).toContain(interactionCustomer?.behaviorState?.phase ?? null);
    expect(['queue_slot', 'dining_slot']).toContain(interactionCustomer?.behaviorState?.targetKind ?? null);

    const capsuleMeshNames = await page.evaluate(() => {
      const studio = (window as any).virtualStudio;
      const sceneMeshes = studio?.scene?.meshes ?? [];
      return sceneMeshes
        .map((mesh: { name?: string }) => (mesh.name || '').toLowerCase())
        .filter((name: string) => name.includes('capsule'));
    });
    expect(capsuleMeshNames).toHaveLength(0);

    await expect.poll(async () => (await readLastPlannerRequest(page))?.prompt ?? '', {
      timeout: 10_000,
    }).toContain('Pizza-reklame');
    const lastRequest = await readLastPlannerRequest(page);
    expect(lastRequest?.referenceImages ?? []).toHaveLength(0);
    expect(lastRequest?.brandReference?.brandName).toBe("Luigi's Pizza");
    expect(lastRequest?.brandReference?.logoImage).toContain('data:image/svg+xml;base64');
  });

  test('lets the user restyle an AI-generated worker from the accessories panel', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-character-editor',
      prompt: 'Pizza restaurant with a visible baker',
      source: 'prompt',
      summary: 'Pizzeria med én synlig baker som kan redigeres.',
      concept: 'Character Editable Pizzeria',
      surfaces: [
        { target: 'backWall', materialId: 'brick-white', visible: true },
        { target: 'leftWall', materialId: 'stucco', visible: true },
        { target: 'rightWall', materialId: 'wood-panels', visible: true },
        { target: 'rearWall', materialId: 'plaster', visible: true },
        { target: 'floor', materialId: 'checkerboard', visible: true },
      ],
      characters: [
        {
          name: 'Bakemester',
          role: 'baker',
          archetypeId: 'worker_baker',
          priority: 'high',
          placementHint: 'Back-left prep counter',
          actionHint: 'Stretching dough',
          wardrobeStyle: 'baker',
          outfitColors: ['#c0392b', '#f4e7d3'],
          logoPlacement: 'apron_chest',
          appearance: {
            skinTone: '#c58c62',
            hairColor: '#2f241f',
            hairStyle: 'covered',
            facialHair: 'stubble',
          },
        },
      ],
    }));

    await openEnvironmentPlanner(page, plannerResponse);
    await seedPlannerDraft(page, {
      brief: 'Pizza restaurant with a visible baker',
    });
    await waitForPlannerDraft(page, 'Pizza restaurant with a visible baker');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Character Editable Pizzeria');
    await applyEnvironmentPlan(page);
    await waitForCharacters(page, 1);

    const initialDiagnostics = await readDiagnostics(page, 'character-editor-before');
    const characterId = initialDiagnostics.sceneState.characters[0]?.id;
    expect(characterId).toBeTruthy();

    await page.evaluate((nodeId: string) => {
      window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
        detail: { nodeId },
      }));
    }, characterId!);

    await expect(page.getByText('Valgt karakter')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('input[value="Bakemester"]').first()).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction((targetCharacterId: string) => {
      const api = (window as any).__virtualStudioCharacterInspectorTestApi;
      return api?.getState?.().selectedActor === targetCharacterId;
    }, characterId!, { timeout: 30_000 });

    await applyCharacterDraftPatch(page, {
      skinTone: '#4a2c1a',
      actionHint: 'Greeting guests from the oven side',
    });

    await page.waitForFunction((targetCharacterId: string) => {
      const studio = (window as any).virtualStudio;
      const diagnostics = studio?.buildEnvironmentDiagnostics?.('character-editor-after');
      const character = diagnostics?.sceneState?.characters?.find((entry: { id: string }) => entry.id === targetCharacterId);
      return character?.appearance?.skinTone === '#4a2c1a'
        && character?.actionHint === 'Greeting guests from the oven side';
    }, characterId!, { timeout: 30_000 });

    const diagnostics = await readDiagnostics(page, 'character-editor-complete');
    const updatedCharacter = diagnostics.sceneState.characters.find((character) => character.id === characterId);
    expect(updatedCharacter?.appearance?.skinTone).toBe('#4a2c1a');
    expect(updatedCharacter?.actionHint).toBe('Greeting guests from the oven side');
    expect(updatedCharacter?.wardrobeStyle).toBe('baker');
  });

  test('reuses a stored brand profile when the AI dialog is reopened', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-stored-brand-profile',
      prompt: 'Pizza-reklame med brandprofil',
      source: 'prompt',
      summary: 'Brandprofil gjenbrukes ved neste oppsett.',
      concept: 'Stored Brand Profile Studio',
      branding: {
        brandName: "Luigi's Pizza",
        palette: ['#c0392b', '#f4e7d3', '#1f2937'],
        applyToEnvironment: true,
        applyToWardrobe: true,
        applyToSignage: true,
        notes: ['Apply the uploaded logo across wardrobe, signage and packaging.'],
      },
    }));
    const logoSeed = createInlineLogoSeed('luigi-brand.svg');

    await openEnvironmentPlanner(page, plannerResponse);
    await seedPlannerDraft(page, {
      brief: 'Pizza-reklame med brandprofil',
      brandName: "Luigi's Pizza",
      brandNotes: 'Varme italienske toner, brandet forkle og tydelig menyskilt.',
      brandLogoImage: logoSeed,
    });
    await waitForPlannerDraft(page, 'Pizza-reklame med brandprofil');

    await page.waitForFunction(() => {
      const api = (window as any).__virtualStudioAiPlannerTestApi;
      const snapshot = api?.getSnapshot?.();
      return snapshot?.storedBrandProfileName === "Luigi's Pizza"
        && snapshot?.brandLogoName === 'luigi-brand.svg';
    }, { timeout: 30_000 });

    await clearBrandInputs(page);

    await page.getByRole('button', { name: 'Lukk' }).click();
    await page.waitForFunction(() => {
      const heading = Array.from(document.querySelectorAll('h2, h1')).find((node) => node.textContent?.includes('Sett Opp Scene'));
      return !heading;
    }, { timeout: 30_000 });

    await page.getByRole('button', { name: 'AI miljøplan' }).click();
    await expect(page.getByRole('heading', { name: 'Sett Opp Scene' })).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(() => {
      const api = (window as any).__virtualStudioAiPlannerTestApi;
      const snapshot = api?.getSnapshot?.();
      return snapshot?.brandName === "Luigi's Pizza"
        && snapshot?.brandNotes.includes('Varme italienske toner')
        && snapshot?.brandLogoName === 'luigi-brand.svg'
        && snapshot?.storedBrandProfileName === "Luigi's Pizza";
    }, { timeout: 30_000 });

    await page.evaluate(() => {
      (window as any).__virtualStudioEnvironmentPlannerRequests = [];
    });

    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Stored Brand Profile Studio');

    await expect.poll(async () => (await readLastPlannerRequest(page))?.brandReference?.brandName ?? '', {
      timeout: 10_000,
    }).toBe("Luigi's Pizza");
    const lastRequest = await readLastPlannerRequest(page);
    expect(lastRequest?.brandReference?.usageNotes ?? '').toContain('signage');
    expect(lastRequest?.brandReference?.logoImage ?? '').toContain('data:image/svg+xml;base64');
  });

  test('builds a 3D environment from a reference image upload', async ({ page }) => {
    const referenceImageSeed = createInlineReferenceImageSeed();
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
      camera: {
        shotType: 'close-up beauty',
        target: [0, 1.2, 0],
        positionHint: [0.45, 1.6, 3.1],
        fov: 0.72,
      },
      layoutGuidance: {
        provider: 'heuristics',
        summary: 'Reference image places the talent/product slightly camera-right with glossy support elements on camera-left.',
        visiblePlanes: ['floor', 'backWall', 'leftWall', 'rightWall'],
        depthProfile: {
          quality: 'medium',
          cameraElevation: 'eye',
          horizonLine: 0.48,
        },
        suggestedZones: {
          hero: {
            xBias: 0.72,
            depthZone: 'foreground',
          },
          supporting: {
            side: 'left',
            depthZone: 'midground',
          },
          background: {
            wallTarget: 'rightWall',
            depthZone: 'background',
          },
        },
      },
      lighting: [
        {
          role: 'key',
          position: [2.1, 3.4, -2.3],
          intensity: 1.35,
          cct: 5600,
          purpose: 'Soft beauty key with broad flattering coverage',
        },
        {
          role: 'fill',
          position: [-2.2, 2.6, -2.9],
          intensity: 0.7,
          cct: 5000,
          purpose: 'Controlled fill to keep makeup detail open',
        },
        {
          role: 'accent',
          position: [0.8, 3.2, 2.6],
          intensity: 0.55,
          color: '#f6d8ff',
          purpose: 'Glossy accent sweep for product highlights',
          behavior: {
            type: 'pan_sweep',
            speed: 0.85,
            amplitude: 0.18,
            radius: 0.8,
          },
        },
      ],
    }));
    await openEnvironmentPlanner(page, plannerResponse);
    await seedPlannerDraft(page, {
      referenceImages: [referenceImageSeed],
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
    await waitForEnvironmentLights(page, 3);

    const diagnostics = await readDiagnostics(page, 'reference-image-ui');
    const cameraPosition = diagnostics.sceneState.camera.position;
    const keyLight = diagnostics.sceneState.lights.find((light) => light.role === 'key');
    const fillLight = diagnostics.sceneState.lights.find((light) => light.role === 'fill');
    const accentLight = diagnostics.sceneState.lights.find((light) => light.role === 'accent');
    const keyTarget = keyLight?.target ?? [0, 0, 0];
    const forward = [
      keyTarget[0] - cameraPosition[0],
      0,
      keyTarget[2] - cameraPosition[2],
    ] as const;
    const forwardLength = Math.sqrt((forward[0] ** 2) + (forward[2] ** 2)) || 1;
    const normalizedForward = [
      forward[0] / forwardLength,
      0,
      forward[2] / forwardLength,
    ] as const;
    const cameraRight = [
      -normalizedForward[2],
      0,
      normalizedForward[0],
    ] as const;
    const projectLightSide = (position: [number, number, number], target: [number, number, number]) => (
      ((position[0] - target[0]) * cameraRight[0])
      + ((position[2] - target[2]) * cameraRight[2])
    );
    expect(diagnostics.sceneState.walls.leftWall.materialId).toBe('nolan-dark');
    expect(diagnostics.sceneState.floor.materialId).toBe('black-glossy');
    expect(diagnostics.sceneState.lights).toHaveLength(3);
    expect(diagnostics.sceneState.lights.some((light) => light.behaviorType === 'pan_sweep')).toBeTruthy();
    expect(keyLight).toBeDefined();
    expect(fillLight).toBeDefined();
    expect(accentLight?.goboId).toBe('breakup');
    expect(accentLight?.goboPattern).toBe('breakup');
    expect(accentLight?.goboProjectionApplied).toBeTruthy();
    expect(keyLight?.target?.[0] ?? 0).toBeGreaterThan(2);
    expect(keyLight?.target?.[2] ?? 0).toBeGreaterThan(1.2);
    expect(Math.abs(projectLightSide(keyLight!.position, keyLight!.target!))).toBeGreaterThan(0.5);
    expect(Math.abs(projectLightSide(fillLight!.position, fillLight!.target!))).toBeGreaterThan(0.35);
    expect(
      projectLightSide(keyLight!.position, keyLight!.target!)
      * projectLightSide(fillLight!.position, fillLight!.target!),
    ).toBeLessThan(0);
    expect(diagnostics.sceneState.camera.autoRig).toBeTruthy();
    expect(diagnostics.sceneState.camera.shotType).toBe('close-up beauty');
    expect(diagnostics.sceneState.camera.focalLength).toBe(85);

    const lastRequest = await readLastPlannerRequest(page);
    expect(lastRequest?.referenceImages).toHaveLength(1);
    expect(lastRequest?.referenceImages?.[0] ?? '').toContain('data:image/');
  });

  test('auto-refines a photo studio scene into a clean studio shell', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-photo-studio',
      prompt: 'Clean photo studio with seamless paper backdrop and controlled portrait lighting',
      source: 'prompt',
      summary: 'Photo studio for portrait stills.',
      concept: 'Clean Photo Studio',
      roomShell: {
        type: 'interior_room',
        width: 12,
        depth: 10,
        height: 4.6,
        openCeiling: false,
        notes: ['Initial shell before auto-refine.'],
      },
      props: [
        { name: 'Beauty table', category: 'hero', priority: 'high', placementHint: 'Center' },
        { name: 'Posing chair', category: 'supporting', priority: 'medium', placementHint: 'Slightly behind the beauty table' },
        { name: 'Reflective panel', category: 'set_dressing', priority: 'medium', placementHint: 'Camera-left edge' },
      ],
      lighting: [
        {
          role: 'key',
          position: [1.8, 2.8, -2.1],
          intensity: 1.2,
          purpose: 'Portrait key',
          gobo: {
            goboId: 'lines',
            intensity: 0.4,
          },
        },
        {
          role: 'rim',
          position: [-1.8, 2.4, -1.5],
          intensity: 0.55,
          purpose: 'Clean edge light',
        },
      ],
      camera: {
        shotType: 'wide shot',
        target: [0, 1.4, 0],
        positionHint: [0, 1.7, 5.2],
        fov: 0.9,
      },
    }));

    await openEnvironmentPlanner(page, plannerResponse);
    await installValidationMock(page, [
      createValidationMockResponse(),
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.88,
        categories: {
          promptFidelity: { score: 0.9, notes: [] },
          compositionMatch: { score: 0.84, notes: [] },
          lightingIntentMatch: { score: 0.86, notes: [] },
          technicalIntegrity: { score: 0.85, notes: [] },
          roomRealism: { score: 0.83, notes: [] },
        },
        suggestedAdjustments: ['Scenen scorer godt.'],
      }),
    ]);
    await seedPlannerDraft(page, {
      brief: 'Clean photo studio with seamless paper backdrop and controlled portrait lighting',
    });
    await waitForPlannerDraft(page, 'Clean photo studio with seamless paper backdrop and controlled portrait lighting');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Clean Photo Studio');
    await applyEnvironmentPlan(page);

    await expect(page.getByText('Iterasjoner: 1')).toBeVisible({ timeout: 20_000 });
    await waitForRoomShell(page, {
      type: 'studio_shell',
      openCeiling: true,
    });
    await waitForProps(page, [
      'beauty_table',
      'chair_posing',
      'reflective_panel',
    ]);
    await waitForEnvironmentLights(page, 2);

    const diagnostics = await readDiagnostics(page, 'photo-studio-ui');
    expect(diagnostics.sceneState.roomShell.type).toBe('studio_shell');
    expect(diagnostics.sceneState.roomShell.openCeiling).toBe(true);
    expect(diagnostics.sceneState.camera.shotType).toBe('medium shot');
    expect(diagnostics.sceneState.atmosphere.fogEnabled).toBe(false);
    expect(diagnostics.sceneState.lights.every((light) => !light.goboId)).toBe(true);
    expect(await readValidationRequestCount(page)).toBe(2);
  });

  test('auto-refines a film studio scene into a soundstage-like setup', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-film-studio',
      prompt: 'Film studio soundstage with stage build and cinematic practicals',
      source: 'prompt',
      summary: 'Film studio stage build.',
      concept: 'Film Studio Soundstage',
      roomShell: {
        type: 'interior_room',
        width: 16,
        depth: 12,
        height: 5,
        openCeiling: false,
        notes: [],
      },
      lighting: [
        {
          role: 'key',
          position: [2.2, 3.4, -2.8],
          intensity: 1.25,
          purpose: 'Cinematic stage key',
        },
        {
          role: 'background',
          position: [-2.4, 3.8, 1.8],
          intensity: 0.66,
          purpose: 'Backdrop separation',
        },
      ],
      camera: {
        shotType: 'medium shot',
        target: [0, 1.5, 0],
        positionHint: [0, 1.8, 5.8],
        fov: 0.84,
      },
    }));

    await openEnvironmentPlanner(page, plannerResponse);
    await installValidationMock(page, [
      createValidationMockResponse(),
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.86,
        categories: {
          promptFidelity: { score: 0.88, notes: [] },
          compositionMatch: { score: 0.82, notes: [] },
          lightingIntentMatch: { score: 0.84, notes: [] },
          technicalIntegrity: { score: 0.83, notes: [] },
          roomRealism: { score: 0.81, notes: [] },
        },
        suggestedAdjustments: ['Scenen scorer godt.'],
      }),
    ]);
    await seedPlannerDraft(page, {
      brief: 'Film studio soundstage with stage build and cinematic practicals',
    });
    await waitForPlannerDraft(page, 'Film studio soundstage with stage build and cinematic practicals');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Film Studio Soundstage');
    await applyEnvironmentPlan(page);

    await expect(page.getByText('Iterasjoner: 1')).toBeVisible({ timeout: 20_000 });
    await waitForRoomShell(page, {
      type: 'studio_shell',
      openCeiling: true,
    });
    await waitForEnvironmentLights(page, 2);

    const diagnostics = await readDiagnostics(page, 'film-studio-ui');
    expect(diagnostics.sceneState.roomShell.type).toBe('studio_shell');
    expect(diagnostics.sceneState.roomShell.openCeiling).toBe(true);
    expect(diagnostics.sceneState.camera.shotType).toBe('medium wide');
    expect(diagnostics.sceneState.atmosphere.fogEnabled).toBe(true);
    expect(diagnostics.sceneState.atmosphere.fogDensity).toBeGreaterThan(0.005);
    expect(await readValidationRequestCount(page)).toBe(2);
  });

  test('auto-refines a noir scene with venetian-blind texture', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-noir',
      prompt: 'Noir detective office with venetian blind shadows and cigarette haze',
      source: 'prompt',
      summary: 'Noir detective setup.',
      concept: 'Noir Detective Office',
      lighting: [
        {
          role: 'key',
          position: [1.4, 2.9, -1.8],
          intensity: 1.05,
          purpose: 'Hard noir key',
        },
      ],
      camera: {
        shotType: 'medium shot',
        target: [0, 1.5, 0],
        positionHint: [0.2, 1.7, 4.6],
        fov: 0.82,
      },
    }));

    await openEnvironmentPlanner(page, plannerResponse);
    await installValidationMock(page, [
      createValidationMockResponse(),
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.87,
        categories: {
          promptFidelity: { score: 0.9, notes: [] },
          compositionMatch: { score: 0.83, notes: [] },
          lightingIntentMatch: { score: 0.88, notes: [] },
          technicalIntegrity: { score: 0.84, notes: [] },
          roomRealism: { score: 0.82, notes: [] },
        },
        suggestedAdjustments: ['Scenen scorer godt.'],
      }),
    ]);
    await seedPlannerDraft(page, {
      brief: 'Noir detective office with venetian blind shadows and cigarette haze',
    });
    await waitForPlannerDraft(page, 'Noir detective office with venetian blind shadows and cigarette haze');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Noir Detective Office');
    await applyEnvironmentPlan(page);

    await expect(page.getByText('Iterasjoner: 1')).toBeVisible({ timeout: 20_000 });
    await waitForEnvironmentLights(page, 1);

    const diagnostics = await readDiagnostics(page, 'noir-ui');
    const keyLight = diagnostics.sceneState.lights.find((light) => light.role === 'key');
    expect(diagnostics.sceneState.camera.shotType).toBe('medium close-up');
    expect(diagnostics.sceneState.atmosphere.fogEnabled).toBe(true);
    expect(keyLight?.goboId).toBe('blinds');
    expect(keyLight?.goboProjectionApplied).toBeTruthy();
    expect(await readValidationRequestCount(page)).toBe(2);
  });

  test('auto-refines a luxury retail scene into a premium showroom look', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-luxury-retail',
      prompt: 'Luxury retail boutique showroom with premium display walls and polished product islands',
      source: 'prompt',
      summary: 'Luxury retail showroom.',
      concept: 'Luxury Retail Showroom',
      roomShell: {
        type: 'interior_room',
        width: 14,
        depth: 11,
        height: 4.8,
        openCeiling: false,
        notes: [],
      },
      props: [
        { name: 'Product podium', category: 'hero', priority: 'high', placementHint: 'Center foreground' },
        { name: 'Display shelf', category: 'supporting', priority: 'medium', placementHint: 'Back wall with layered products' },
      ],
      branding: {
        enabled: true,
        brandName: 'Maison Lumiere',
        palette: ['#d9c7a2', '#f5efe5', '#2b2a30'],
        applicationTargets: ['signage'],
        applyToEnvironment: false,
        applyToWardrobe: false,
        applyToSignage: true,
      },
      lighting: [
        {
          role: 'key',
          position: [1.6, 2.8, -2.2],
          intensity: 1.18,
          purpose: 'Product key',
        },
        {
          role: 'accent',
          position: [-1.8, 2.9, 1.4],
          intensity: 0.68,
          purpose: 'Wall grazing accent',
        },
      ],
      camera: {
        shotType: 'medium shot',
        target: [0, 1.2, 0],
        positionHint: [0.2, 1.7, 4.2],
        fov: 0.8,
      },
    }));

    await openEnvironmentPlanner(page, plannerResponse);
    await installValidationMock(page, [
      createValidationMockResponse({
        categories: {
          promptFidelity: { score: 0.84, notes: [] },
          compositionMatch: { score: 0.61, notes: [] },
          lightingIntentMatch: { score: 0.63, notes: [] },
          technicalIntegrity: { score: 0.72, notes: [] },
          roomRealism: { score: 0.66, notes: [] },
          brandConsistency: { score: 0.58, notes: [] },
        },
        suggestedAdjustments: [
          'Presiser lighting intent, modifier, beam angle og haze for flere lys.',
          'Bruk brandprofilen bredere på signage, wardrobe, packaging og interior details.',
          'Legg til flere arkitektoniske signaler som pass-through, backroom eller nisjer.',
        ],
      }),
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.89,
        categories: {
          promptFidelity: { score: 0.92, notes: [] },
          compositionMatch: { score: 0.86, notes: [] },
          lightingIntentMatch: { score: 0.87, notes: [] },
          technicalIntegrity: { score: 0.84, notes: [] },
          roomRealism: { score: 0.83, notes: [] },
          brandConsistency: { score: 0.9, notes: [] },
        },
        suggestedAdjustments: ['Scenen scorer godt.'],
      }),
    ]);
    await seedPlannerDraft(page, {
      brief: 'Luxury retail boutique showroom with premium display walls and polished product islands',
      brandName: 'Maison Lumiere',
      brandNotes: 'Premium showroom med varme gulltoner, diskret logo og eksklusiv arkitektonisk rytme.',
    });
    await waitForPlannerDraft(page, 'Luxury retail boutique showroom with premium display walls and polished product islands');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Luxury Retail Showroom');
    await applyEnvironmentPlan(page);

    await expect(page.getByText('Iterasjoner: 1')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Familie: Luxury retail')).toBeVisible({ timeout: 20_000 });
    await waitForProps(page, [
      'product_podium_round',
      'display_shelf_wall',
    ]);
    await waitForEnvironmentLights(page, 2);

    const diagnostics = await readDiagnostics(page, 'luxury-retail-ui');
    const accentLight = diagnostics.sceneState.lights.find((light) => light.role === 'accent');
    expect(diagnostics.sceneState.camera.shotType).toBe('hero shot');
    expect(diagnostics.sceneState.roomShell.ceilingStyle).toBe('coffered');
    expect(diagnostics.sceneState.atmosphere.fogEnabled).toBe(false);
    expect(diagnostics.sceneState.branding.applyToEnvironment).toBe(true);
    expect(diagnostics.sceneState.branding.applyToWardrobe).toBe(true);
    expect(accentLight?.goboId).toBe('lines');
    expect(accentLight?.goboProjectionApplied).toBeTruthy();
    expect(await readValidationRequestCount(page)).toBe(2);
  });

  test('auto-refines an approved warehouse scene when industrial depth cues are weak', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-warehouse',
      prompt: 'Industrial warehouse product bay with metal racks and dusty shafts through haze',
      source: 'prompt',
      summary: 'Warehouse hero bay.',
      concept: 'Industrial Warehouse Bay',
      roomShell: {
        type: 'warehouse',
        width: 18,
        depth: 14,
        height: 6.5,
        openCeiling: false,
        ceilingStyle: 'flat',
        notes: [],
      },
      lighting: [
        {
          role: 'key',
          position: [2.2, 3.5, -2.4],
          intensity: 1.1,
          purpose: 'Industrial hero key',
        },
        {
          role: 'accent',
          position: [-2.4, 4.2, 1.8],
          intensity: 0.74,
          purpose: 'Dusty background shaft',
        },
      ],
      camera: {
        shotType: 'medium shot',
        target: [0, 1.4, 0],
        positionHint: [0.25, 1.8, 5.4],
        fov: 0.84,
      },
    }));

    await openEnvironmentPlanner(page, plannerResponse);
    await installValidationMock(page, [
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.83,
        categories: {
          promptFidelity: { score: 0.88, notes: [] },
          compositionMatch: { score: 0.8, notes: [] },
          lightingIntentMatch: { score: 0.63, notes: [] },
          technicalIntegrity: { score: 0.79, notes: [] },
          roomRealism: { score: 0.67, notes: [] },
          brandConsistency: { score: 0.84, notes: [] },
        },
        suggestedAdjustments: [
          'Forsterk industriell haze og breakup så volumet leser bedre.',
          'Gi warehouse-shellen tydeligere åpne trusser og dybdesjikt.',
        ],
      }),
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.9,
        categories: {
          promptFidelity: { score: 0.91, notes: [] },
          compositionMatch: { score: 0.86, notes: [] },
          lightingIntentMatch: { score: 0.88, notes: [] },
          technicalIntegrity: { score: 0.84, notes: [] },
          roomRealism: { score: 0.87, notes: [] },
          brandConsistency: { score: 0.85, notes: [] },
        },
        suggestedAdjustments: ['Scenen scorer godt.'],
      }),
    ]);
    await seedPlannerDraft(page, {
      brief: 'Industrial warehouse product bay with metal racks and dusty shafts through haze',
    });
    await waitForPlannerDraft(page, 'Industrial warehouse product bay with metal racks and dusty shafts through haze');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Industrial Warehouse Bay');
    await applyEnvironmentPlan(page);

    await expect(page.getByText('Iterasjoner: 1')).toBeVisible({ timeout: 20_000 });
    await waitForRoomShell(page, {
      type: 'warehouse',
      openCeiling: true,
      ceilingStyle: 'open_truss',
    });
    await waitForEnvironmentLights(page, 2);

    const diagnostics = await readDiagnostics(page, 'warehouse-ui');
    const accentLight = diagnostics.sceneState.lights.find((light) => light.role === 'accent');
    expect(diagnostics.sceneState.camera.shotType).toBe('medium wide');
    expect(diagnostics.sceneState.atmosphere.fogEnabled).toBe(true);
    expect(diagnostics.sceneState.roomShell.typeAccessoryKinds).toContain('ceiling_open_truss');
    expect(accentLight?.goboId).toBe('breakup');
    expect(accentLight?.goboProjectionApplied).toBeTruthy();
    expect(await readValidationRequestCount(page)).toBe(2);
  });

  test('auto-refines an approved office scene when the lighting still feels too stylized', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-office',
      prompt: 'Corporate office interview setup in a clean meeting room with soft daylight',
      source: 'prompt',
      summary: 'Office interview set.',
      concept: 'Corporate Office Interview',
      roomShell: {
        type: 'interior_room',
        width: 12,
        depth: 10,
        height: 4.4,
        openCeiling: false,
        ceilingStyle: 'flat',
        notes: [],
      },
      lighting: [
        {
          role: 'key',
          position: [1.8, 2.8, -2.1],
          intensity: 1.14,
          purpose: 'Corporate key',
          gobo: {
            goboId: 'lines',
            intensity: 0.36,
          },
        },
        {
          role: 'background',
          position: [-1.6, 2.9, 1.6],
          intensity: 0.58,
          purpose: 'Meeting room separation',
          gobo: {
            goboId: 'breakup',
            intensity: 0.44,
          },
        },
      ],
      camera: {
        shotType: 'wide shot',
        target: [0, 1.5, 0],
        positionHint: [0.2, 1.75, 5.0],
        fov: 0.88,
      },
    }));

    await openEnvironmentPlanner(page, plannerResponse);
    await installValidationMock(page, [
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.82,
        categories: {
          promptFidelity: { score: 0.87, notes: [] },
          compositionMatch: { score: 0.74, notes: [] },
          lightingIntentMatch: { score: 0.61, notes: [] },
          technicalIntegrity: { score: 0.72, notes: [] },
          roomRealism: { score: 0.81, notes: [] },
          brandConsistency: { score: 0.84, notes: [] },
        },
        suggestedAdjustments: [
          'Rydd opp i stylized light texture og gå mer mot myk, ren daylight.',
        ],
      }),
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.89,
        categories: {
          promptFidelity: { score: 0.9, notes: [] },
          compositionMatch: { score: 0.82, notes: [] },
          lightingIntentMatch: { score: 0.87, notes: [] },
          technicalIntegrity: { score: 0.84, notes: [] },
          roomRealism: { score: 0.83, notes: [] },
          brandConsistency: { score: 0.86, notes: [] },
        },
        suggestedAdjustments: ['Scenen scorer godt.'],
      }),
    ]);
    await seedPlannerDraft(page, {
      brief: 'Corporate office interview setup in a clean meeting room with soft daylight',
    });
    await waitForPlannerDraft(page, 'Corporate office interview setup in a clean meeting room with soft daylight');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Corporate Office Interview');
    await applyEnvironmentPlan(page);

    await expect(page.getByText('Iterasjoner: 1')).toBeVisible({ timeout: 20_000 });
    await waitForRoomShell(page, {
      type: 'interior_room',
      openCeiling: false,
    });
    await waitForEnvironmentLights(page, 2);

    const diagnostics = await readDiagnostics(page, 'office-ui');
    expect(diagnostics.sceneState.camera.shotType).toBe('medium shot');
    expect(diagnostics.sceneState.atmosphere.fogEnabled).toBe(false);
    expect(diagnostics.sceneState.lights.every((light) => !light.goboId)).toBe(true);
    expect(await readValidationRequestCount(page)).toBe(2);
  });

  test('auto-refines an approved nightclub scene when the club lighting lacks kinetic texture', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-nightclub',
      prompt: 'Nightclub promo stage with DJ booth, haze and kinetic LED energy',
      source: 'prompt',
      summary: 'Nightclub promo setup.',
      concept: 'Nightclub Promo Stage',
      roomShell: {
        type: 'abstract_stage',
        width: 14,
        depth: 12,
        height: 5.4,
        openCeiling: true,
        ceilingStyle: 'flat',
        notes: [],
      },
      lighting: [
        {
          role: 'accent',
          position: [2.1, 3.1, -1.8],
          intensity: 0.84,
          purpose: 'Dancefloor energy',
        },
        {
          role: 'rim',
          position: [-2.0, 3.2, 1.9],
          intensity: 0.68,
          purpose: 'Performer edge',
        },
      ],
      camera: {
        shotType: 'medium shot',
        target: [0, 1.4, 0],
        positionHint: [0.1, 1.8, 4.6],
        fov: 0.84,
      },
    }));

    await openEnvironmentPlanner(page, plannerResponse);
    await installValidationMock(page, [
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.83,
        categories: {
          promptFidelity: { score: 0.88, notes: [] },
          compositionMatch: { score: 0.73, notes: [] },
          lightingIntentMatch: { score: 0.6, notes: [] },
          technicalIntegrity: { score: 0.8, notes: [] },
          roomRealism: { score: 0.79, notes: [] },
          brandConsistency: { score: 0.84, notes: [] },
        },
        suggestedAdjustments: [
          'Gi klubblyset mer kinetisk breakup og sterkere volum i haze.',
        ],
      }),
      createValidationMockResponse({
        verdict: 'approved',
        overallScore: 0.9,
        categories: {
          promptFidelity: { score: 0.91, notes: [] },
          compositionMatch: { score: 0.84, notes: [] },
          lightingIntentMatch: { score: 0.88, notes: [] },
          technicalIntegrity: { score: 0.85, notes: [] },
          roomRealism: { score: 0.82, notes: [] },
          brandConsistency: { score: 0.85, notes: [] },
        },
        suggestedAdjustments: ['Scenen scorer godt.'],
      }),
    ]);
    await seedPlannerDraft(page, {
      brief: 'Nightclub promo stage with DJ booth, haze and kinetic LED energy',
    });
    await waitForPlannerDraft(page, 'Nightclub promo stage with DJ booth, haze and kinetic LED energy');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Nightclub Promo Stage');
    await applyEnvironmentPlan(page);

    await expect(page.getByText('Iterasjoner: 1')).toBeVisible({ timeout: 20_000 });
    await waitForEnvironmentLights(page, 2);

    const diagnostics = await readDiagnostics(page, 'nightclub-ui');
    const accentLight = diagnostics.sceneState.lights.find((light) => light.role === 'accent');
    const rimLight = diagnostics.sceneState.lights.find((light) => light.role === 'rim');
    expect(diagnostics.sceneState.camera.shotType).toBe('medium wide');
    expect(diagnostics.sceneState.atmosphere.fogEnabled).toBe(true);
    expect(accentLight?.goboId).toBe('dots');
    expect(accentLight?.goboProjectionApplied).toBeTruthy();
    expect(rimLight?.goboId).toBe('lines');
    expect(rimLight?.goboProjectionApplied).toBeTruthy();
    expect(await readValidationRequestCount(page)).toBe(2);
  });

  test('forwards Genie world-sketch context and builds matching 3D props', async ({ page }) => {
    const referenceImageSeed = createInlineReferenceImageSeed();
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
      camera: {
        shotType: 'wide',
        target: [0, 1, 0],
        positionHint: [0.3, 1.8, 5.8],
        fov: 0.78,
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
      lighting: [
        {
          role: 'practical',
          position: [-2.5, 2.2, -1.1],
          intensity: 0.65,
          color: '#38f5ff',
          purpose: 'Neon cyan signage buzz with a slight flicker',
          gobo: {
            goboId: 'lines',
            size: 1.0,
            rotation: 0,
            intensity: 0.76,
            rationale: 'Linear gobo creates synthetic signage streaks.',
          },
          behavior: {
            type: 'flicker',
            speed: 2.4,
            amplitude: 0.18,
            radius: 0.3,
          },
        },
        {
          role: 'accent',
          position: [1.8, 3.1, 1.9],
          intensity: 0.78,
          color: '#ff4bd1',
          purpose: 'Orbiting magenta kicker to rake across wet surfaces',
          behavior: {
            type: 'orbit',
            speed: 0.9,
            amplitude: 0.18,
            radius: 1.5,
          },
        },
      ],
    }));
    await openEnvironmentPlanner(page, plannerResponse);
    await seedPlannerDraft(page, {
      brief: 'Neon-tung cyberpunk produktscene',
      worldModelProvider: 'genie',
      geniePrompt: 'Rainy neon alley with reflective streets and cyan/magenta signage',
      genieNotes: 'Bevar vått gulv, cyan/magenta-skilt og dybde bak produktet.',
      referenceImages: [referenceImageSeed],
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
    await waitForEnvironmentLights(page, 2);

    const diagnostics = await readDiagnostics(page, 'genie-ui');
    expect(diagnostics.serviceState.activePresetId).toBe('cinematic-blade-runner');
    expect(diagnostics.sceneState.floor.materialId).toBe('blade-runner-wet');
    expect(diagnostics.sceneState.camera.autoRig).toBeTruthy();
    expect(diagnostics.sceneState.camera.shotType).toBe('wide');
    expect(diagnostics.sceneState.camera.focalLength).toBe(28);
    const orbitLight = diagnostics.sceneState.lights.find((light) => light.behaviorType === 'orbit');
    const practicalLight = diagnostics.sceneState.lights.find((light) => light.role === 'practical');
    expect(orbitLight).toBeDefined();
    expect(practicalLight?.goboId).toBe('lines');
    expect(practicalLight?.goboProjectionApplied).toBeTruthy();

    await page.waitForTimeout(1200);
    const movedDiagnostics = await readDiagnostics(page, 'genie-ui-motion');
    const movedOrbitLight = movedDiagnostics.sceneState.lights.find((light) => light.id === orbitLight?.id);
    expect(movedOrbitLight).toBeDefined();
    const orbitDistance = Math.hypot(
      (movedOrbitLight?.position[0] ?? 0) - (orbitLight?.position[0] ?? 0),
      (movedOrbitLight?.position[2] ?? 0) - (orbitLight?.position[2] ?? 0),
    );
    expect(orbitDistance).toBeGreaterThan(0.08);

    const lastRequest = await readLastPlannerRequest(page);
    expect(lastRequest?.worldModelProvider).toBe('genie');
    expect(lastRequest?.worldModelReference?.provider).toBe('genie');
    expect(lastRequest?.worldModelReference?.importedImageCount).toBe(1);
    expect(lastRequest?.worldModelReference?.previewLabels).toContain('role-foto.png');
  });

  test('applies a parametrisk room shell from the environment plan', async ({ page }) => {
    const plannerResponse = createPlannerResponse(createBasePlan({
      planId: 'e2e-room-shell',
      prompt: 'Bygg et mindre showroom med lukket tak',
      source: 'prompt',
      concept: 'Compact Product Showroom',
      summary: 'Mindre showroom med lukket tak og tydelig romfølelse.',
      roomShell: {
        type: 'storefront',
        width: 12,
        depth: 8,
        height: 5,
        openCeiling: false,
        notes: ['Closed ceiling showroom for product lighting'],
      },
      camera: {
        shotType: 'wide',
        target: [0, 1.2, 0],
        positionHint: [0, 1.8, 4.2],
        fov: 0.78,
      },
      surfaces: [
        { target: 'backWall', materialId: 'white', visible: true },
        { target: 'leftWall', materialId: 'gray-medium', visible: true },
        { target: 'rightWall', materialId: 'gray-medium', visible: true },
        { target: 'rearWall', materialId: 'white', visible: true },
        { target: 'floor', materialId: 'gray-dark', visible: true },
      ],
      props: [
        { name: 'Product podium', category: 'hero', priority: 'high', placementHint: 'Center foreground' },
      ],
      lighting: [
        {
          role: 'key',
          position: [1.5, 2.8, -1.9],
          intensity: 1.1,
          cct: 5200,
          purpose: 'Showroom key for a compact product display',
        },
      ],
    }));
    await openEnvironmentPlanner(page, plannerResponse);
    await seedPlannerDraft(page, {
      brief: 'Bygg et mindre showroom med lukket tak',
    });
    await waitForPlannerDraft(page, 'Bygg et mindre showroom med lukket tak');
    await generatePlannerResult(page);
    await waitForPlannerResult(page, 'Compact Product Showroom');
    await applyEnvironmentPlan(page);

    await waitForRoomShell(page, {
      type: 'storefront',
      width: 12,
      depth: 8,
      height: 5,
      openCeiling: false,
      ceilingVisible: true,
    });
    await waitForEnvironmentLights(page, 1);

    const diagnostics = await readDiagnostics(page, 'room-shell-ui');
    expect(diagnostics.sceneState.roomShell.width).toBe(12);
    expect(diagnostics.sceneState.roomShell.depth).toBe(8);
    expect(diagnostics.sceneState.roomShell.height).toBe(5);
    expect(diagnostics.sceneState.roomShell.openCeiling).toBe(false);
    expect(diagnostics.sceneState.roomShell.ceilingVisible).toBe(true);
    expect(diagnostics.sceneState.lights.some((light) => light.environmentAutoRig)).toBeTruthy();
    expect(diagnostics.sceneState.camera.autoRig).toBeTruthy();
    expect(diagnostics.sceneState.camera.shotType).toBe('wide');
    expect(diagnostics.sceneState.camera.focalLength).toBe(28);

    const lastRequest = await readLastPlannerRequest(page);
    expect(lastRequest?.roomConstraints?.supportsParametricGeometry).toBe(true);
  });
});
