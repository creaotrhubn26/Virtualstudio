import { expect, test, type Page } from '@playwright/test';

type TopViewSyncSnapshot = {
  reason?: string;
  selection: {
    selectedIds: string[];
    primarySelectedId: string | null;
    selectedNodeId: string | null;
    selectedActorId: string | null;
    selectedLightId: string | null;
    selectedCameraPresetId: string | null;
    activeCameraPresetId: string | null;
    source: string | null;
  };
  interaction: {
    hoveredZoneId?: string | null;
    draggingLightId: string | null;
    draggingCameraId: string | null;
    isPanning: boolean;
    behaviorZoneAssignmentMode?: 'home-zone' | 'look-target' | null;
  };
  viewport: {
    zoom: number;
    pan: {
      x: number;
      y: number;
    };
    showGrid: boolean;
    showLabels: boolean;
    showLightCones: boolean;
  };
  patterns: {
    selectedPatternId: string | null;
    selectedPatternLabel?: string | null;
    showGuides: boolean;
    availablePatternIds: string[];
    aiRecommendedPatternLabel?: string | null;
  };
  behaviors: {
    characters: Array<{
      id: string;
      name: string;
      role: string | null;
      behaviorType: string;
      pace: string;
      phase: string;
      homeZoneId: string | null;
      routeZoneIds: string[];
      lookAtTarget: string | null;
      layoutAnchorId: string | null;
      layoutAnchorKind: string | null;
      targetKind: string | null;
      targetId: string | null;
      blockingOffset: number;
      currentPosition: { x: number; y: number; z: number } | null;
      targetPosition: { x: number; y: number; z: number } | null;
      routePoints: Array<{ x: number; y: number; z: number }>;
    }>;
  };
};

type CameraLightingSyncSnapshot = {
  lighting: {
    selectedLightId: string | null;
    lights: Array<{
      id: string;
      position: [number, number, number];
      modifier?: string | null;
      beamAngle?: number | null;
      goboId?: string | null;
      hazeEnabled?: boolean | null;
      hazeDensity?: number | null;
    }>;
  };
  selection: {
    selectedLightId: string | null;
  };
};

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioRuntimeReady?.ready), { timeout: 90_000 });
}

test.describe('TopView Sync', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudio(page);
  });

  test('mirrors runtime light and camera selection into the top-view snapshot', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan || !studio?.saveCameraPreset) {
        throw new Error('VirtualStudio helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'topview-selection-sync',
        clearExisting: true,
        lighting: [
          {
            role: 'key',
            position: [1.8, 3.1, -2.1],
            intensity: 1.1,
            cct: 5600,
            purpose: 'Top-view sync key light',
          },
        ],
      });

      const lightId = Array.from(studio.lights.keys())[0];
      if (!lightId) {
        throw new Error('Expected at least one light in the studio');
      }

      studio.selectLight(lightId);
      studio.saveCameraPreset('camA');
      window.dispatchEvent(new CustomEvent('ch-camera-preset-selected', {
        detail: { presetId: 'camA' },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 200));

      return {
        topView: (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot,
      };
    });

    expect(result.topView.selection.selectedLightId).toBeTruthy();
    expect(result.topView.selection.selectedCameraPresetId).toBe('camA');
    expect(result.topView.selection.selectedIds).toContain(result.topView.selection.selectedLightId!);
    expect(result.topView.selection.selectedIds).toContain('camA');
    expect(result.topView.selection.primarySelectedId).toBe(result.topView.selection.selectedLightId);
  });

  test('shows AI family and selected light rationale in the top-view info panel', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      const insights = {
        familyId: 'warehouse',
        familyLabel: 'Warehouse',
        summary: 'AI leser dette som warehouse.',
        lightingDetails: ['rim: breakup gobo 24° — Industrial breakup adds dusty warehouse texture.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insights;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', {
        detail: insights,
      }));

      await studio.applyEnvironmentLightingPlan({
        planId: 'topview-ai-insights',
        clearExisting: true,
        mood: 'warehouse',
        contextText: 'Warehouse hero lighting with industrial breakup rim light.',
        lighting: [
          {
            role: 'rim',
            position: [2.1, 3.2, -1.7],
            intensity: 1.05,
            cct: 4300,
            purpose: 'Warehouse rim accent',
            rationale: 'Industrial breakup adds dusty warehouse texture.',
          },
        ],
      });

      const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
      const firstLight = diagnostics?.sceneState?.lights?.[0];
      if (!firstLight?.id) {
        throw new Error('Expected an environment light for AI insight top-view coverage');
      }

      studio.selectLight(firstLight.id);
      await new Promise((resolve) => window.setTimeout(resolve, 220));

      return {
        familyText: document.getElementById('topviewInfoAiFamily')?.textContent ?? null,
        reasonText: document.getElementById('topviewInfoAiReason')?.textContent ?? null,
        aiPatternText: document.getElementById('topviewInfoAiPattern')?.textContent ?? null,
        patternText: document.getElementById('topviewInfoPattern')?.textContent ?? null,
        titleText: document.getElementById('topviewInfoTitle')?.textContent ?? null,
        topView: (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot,
      };
    });

    expect(result.titleText).toMatch(/rim light/i);
    expect(result.familyText).toContain('Warehouse');
    expect(result.reasonText).toContain('Industrial breakup adds dusty warehouse texture');
    expect(result.aiPatternText).toContain('Low Key');
    expect(result.patternText).toContain('Ingen');
    expect(result.topView.patterns.aiRecommendedPatternLabel).toContain('Low Key');
    expect(result.topView.selection.selectedLightId).toBeTruthy();
  });

  test('updates camera info and viewport zoom in the top-view sync state', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.saveCameraPreset) {
        throw new Error('VirtualStudio camera preset helpers are not available');
      }

      studio.clearAllLights?.();
      studio.saveCameraPreset('camA');
      window.dispatchEvent(new CustomEvent('ch-camera-preset-selected', {
        detail: { presetId: 'camA' },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 150));

      const titleBeforeZoom = document.getElementById('topviewInfoTitle')?.textContent ?? null;
      const canvas = document.getElementById('topViewCanvas');
      if (!canvas) {
        throw new Error('Top-view canvas is not available');
      }

      canvas.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -120,
        bubbles: true,
        cancelable: true,
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 120));

      return {
        titleBeforeZoom,
        topView: (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot,
      };
    });

    expect(result.titleBeforeZoom).toContain('Camera A');
    expect(result.topView.selection.selectedCameraPresetId).toBe('camA');
    expect(result.topView.viewport.zoom).toBeGreaterThan(1);
    expect(result.topView.viewport.showGrid).toBeTruthy();
  });

  test('syncs pattern-application guides into top-view state', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const pattern = {
        id: 'rembrandt',
        name: 'Rembrandt Lighting',
        category: 'portrait',
        lights: [
          {
            type: 'key',
            position: [-2, 2.4, 1],
            intensity: 100,
            colorTemp: 5600,
          },
          {
            type: 'fill',
            position: [1.8, 1.7, 1],
            intensity: 25,
            colorTemp: 5600,
          },
        ],
      };

      window.dispatchEvent(new CustomEvent('ch-apply-lighting-pattern', {
        detail: { patternId: 'rembrandt', pattern },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 300));

      return {
        topView: (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot,
        diagnostics: (window as any).__virtualStudioDiagnostics?.environment,
      };
    });

    expect(result.topView.patterns.selectedPatternId).toBe('rembrandt');
    expect(result.topView.patterns.selectedPatternLabel).toBe('Rembrandt');
    expect(result.topView.patterns.showGuides).toBeTruthy();
    expect(result.topView.patterns.availablePatternIds).toContain('three-point');
    expect(Array.isArray(result.diagnostics?.sceneState?.lights)).toBeTruthy();
    expect(result.diagnostics.sceneState.lights[0]?.goboId ?? null).toBeNull();
  });

  test('can apply the AI-recommended pattern and open the pattern library from top-view actions', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const insight = {
        familyId: 'noir',
        familyLabel: 'Noir',
        summary: 'AI leser dette som noir.',
        lightingDetails: ['key: grid · 24° · gobo blinds — Venetian slats carve the face.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insight;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', { detail: insight }));
      await new Promise((resolve) => window.setTimeout(resolve, 120));

      const applyButton = document.getElementById('topviewApplyAiPattern') as HTMLButtonElement | null;
      const openButton = document.getElementById('topviewOpenPatternLibrary') as HTMLButtonElement | null;
      if (!applyButton || !openButton) {
        throw new Error('Expected top-view pattern action buttons to exist');
      }

      const applyDisabledBefore = applyButton.disabled;
      applyButton.click();
      await new Promise((resolve) => window.setTimeout(resolve, 500));

      openButton.click();
      await new Promise((resolve) => window.setTimeout(resolve, 150));

      return {
        applyDisabledBefore,
        aiPatternText: document.getElementById('topviewInfoAiPattern')?.textContent ?? null,
        patternText: document.getElementById('topviewInfoPattern')?.textContent ?? null,
        topView: (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot,
      };
    });

    expect(result.applyDisabledBefore).toBe(false);
    expect(result.aiPatternText).toContain('Low Key');
    expect(result.patternText).toContain('Low Key');
    expect(result.topView.patterns.selectedPatternId).toBe('low-key');
    expect(result.topView.patterns.selectedPatternLabel).toBe('Low Key');
    await expect(page.getByRole('heading', { name: 'Fotomønstre Bibliotek', exact: true })).toBeVisible({ timeout: 30_000 });
    const lowKeyCard = page.getByTestId('light-pattern-card-low-key');
    await expect(lowKeyCard.getByText('Forhåndsvalgt')).toBeVisible({ timeout: 30_000 });
    await expect(lowKeyCard).toHaveAttribute('data-preferred-pattern', 'true');
  });

  test('can apply AI light shaping directly from top-view actions', async ({ page }) => {
    const initialState = await page.evaluate(async () => {
      const insight = {
        familyId: 'warehouse',
        familyLabel: 'Warehouse',
        summary: 'AI leser dette som warehouse.',
        lightingDetails: ['rim: fresnel · 24° · gobo breakup — Industrial breakup adds dusty warehouse texture.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insight;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', { detail: insight }));

      const studio = (window as any).virtualStudio;
      if (!studio?.selectLight) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      const lightIdsBefore = Array.from(studio.lights.keys()) as string[];
      window.dispatchEvent(new CustomEvent('ch-add-light', {
        detail: {
          id: 'topview-ai-shaping-light',
          brand: 'Aputure',
          model: 'LS 600d Pro',
          type: 'led',
          power: 720,
          powerUnit: 'W',
          cct: 4300,
          beamAngle: 60,
          cri: 96,
        },
      }));
      await new Promise((resolve) => window.setTimeout(resolve, 500));

      const lightIdsAfter = Array.from(studio.lights.keys()) as string[];
      const lightId = (studio as any).lastRuntimeLightId
        || lightIdsAfter.find((id) => !lightIdsBefore.includes(id))
        || lightIdsAfter[lightIdsAfter.length - 1];
      if (!lightId) {
        throw new Error('Expected a synced light after ch-add-light');
      }

      const runtimeLight = studio.lights.get(lightId);
      if (runtimeLight) {
        runtimeLight.metadata = {
          ...(runtimeLight.metadata || {}),
          role: 'rim',
          lightingRationale: 'rim: fresnel · 24° · gobo breakup — Industrial breakup adds dusty warehouse texture.',
          hazeEnabled: true,
          hazeDensity: 0.018,
        };
      }

      window.dispatchEvent(new CustomEvent('ch-set-light-beam-angle', {
        detail: {
          lightId,
          beamAngle: 60,
        },
      }));
      window.dispatchEvent(new CustomEvent('ch-remove-gobo', {
        detail: {
          lightId,
        },
      }));

      studio.selectLight(lightId);
      (studio as any).selectedLightId = lightId;
      (studio as any).selectedActorId = null;
      (studio as any).lastRuntimeLightId = lightId;
      (studio as any).publishSceneSelectionSync?.('topview-ai-light-shaping-selection', 'test');
      (studio as any).publishCameraLightingSync?.('topview-ai-light-shaping-selection', 'test');
      (studio as any).updateTopViewInfoPanel?.();
      await new Promise((resolve) => window.setTimeout(resolve, 300));

      return {
        lightId,
      };
    });

    await page.waitForFunction(() => (
      Boolean(document.getElementById('topviewApplyAiModifier'))
      && Boolean(document.getElementById('topviewApplyAiBeam'))
      && Boolean(document.getElementById('topviewApplyAiGobo'))
      && Boolean(document.getElementById('topviewApplyAiHaze'))
    ), { timeout: 30_000 });

    await page.evaluate(() => {
      (document.getElementById('topviewApplyAiModifier') as HTMLButtonElement | null)?.click();
      (document.getElementById('topviewApplyAiBeam') as HTMLButtonElement | null)?.click();
      (document.getElementById('topviewApplyAiGobo') as HTMLButtonElement | null)?.click();
      (document.getElementById('topviewApplyAiHaze') as HTMLButtonElement | null)?.click();
    });

    await page.waitForFunction((lightId) => {
      const sync = (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot | undefined;
      const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
      const light = sync?.lighting?.lights?.find((entry) => entry.id === lightId);
      return light?.modifier === 'fresnel'
        && Math.round(light?.beamAngle ?? -1) === 24
        && light?.goboId === 'breakup'
        && diagnostics?.sceneState?.atmosphere?.fogEnabled === true
        && diagnostics?.sceneState?.atmosphere?.fogDensity >= 0.018;
    }, initialState.lightId, { timeout: 30_000 });

    const result = await page.evaluate((lightId) => {
      const sync = (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;
      const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
      return {
        light: sync.lighting.lights.find((entry) => entry.id === lightId) || null,
        atmosphere: diagnostics?.sceneState?.atmosphere ?? null,
      };
    }, initialState.lightId);

    expect(result.light?.modifier).toBe('fresnel');
    expect(Math.round(result.light?.beamAngle ?? -1)).toBe(24);
    expect(result.light?.goboId).toBe('breakup');
    expect(result.atmosphere?.fogEnabled).toBe(true);
    expect(result.atmosphere?.fogDensity).toBeGreaterThanOrEqual(0.018);
  });

  test('keeps top-view dragging in sync with runtime light selection and position', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'topview-drag-sync',
        clearExisting: true,
        lighting: [
          {
            role: 'key',
            position: [1.2, 3.0, -1.8],
            intensity: 1.0,
            cct: 5600,
            purpose: 'Top-view drag sync light',
          },
        ],
      });

      const diagnostics = (window as any).__virtualStudioDiagnostics?.environment;
      const firstLight = diagnostics?.sceneState?.lights?.[0];
      if (!firstLight?.id) {
        throw new Error('Expected an environment light for top-view drag sync');
      }

      const lightId = firstLight.id as string;
      const initialPosition = firstLight.position as [number, number, number];
      const canvas = document.getElementById('topViewCanvas') as HTMLCanvasElement | null;
      const snapshot = (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot | undefined;

      if (!canvas || !snapshot) {
        throw new Error('Top-view canvas is not available');
      }

      const light = studio.lights.get(lightId);
      if (!light) {
        throw new Error(`Light ${lightId} is not available in the studio`);
      }

      const rect = canvas.getBoundingClientRect();
      const scale = (Math.min(canvas.width, canvas.height) / 20) * snapshot.viewport.zoom;
      const cx = (canvas.width / 2) + snapshot.viewport.pan.x;
      const cy = (canvas.height / 2) + snapshot.viewport.pan.y;
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      const startCanvasX = cx + (light.mesh.position.x * scale);
      const startCanvasY = cy - (light.mesh.position.z * scale);
      const startClientX = rect.left + (startCanvasX * scaleX);
      const startClientY = rect.top + (startCanvasY * scaleY);
      const endClientX = startClientX + 64;
      const endClientY = startClientY - 36;

      const dispatch = (type: string, clientX: number, clientY: number, buttons: number) => {
        canvas.dispatchEvent(new MouseEvent(type, {
          clientX,
          clientY,
          buttons,
          bubbles: true,
          cancelable: true,
        }));
      };

      studio.selectLight?.(lightId);
      studio.topViewDraggingLightId = lightId;
      dispatch('mousemove', startClientX, startClientY, 1);
      dispatch('mousemove', endClientX, endClientY, 1);
      dispatch('mouseup', endClientX, endClientY, 0);

      await new Promise((resolve) => window.setTimeout(resolve, 220));

      return {
        topView: (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot,
        cameraLighting: (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot,
        lightId,
        initialPosition,
      };
    });

    const movedLight = result.cameraLighting.lighting.lights.find((light) => light.id === result.lightId);
    if (!movedLight) {
      throw new Error('Dragged light was not present in camera-light sync snapshot');
    }

    const movedDistance = Math.hypot(
      (movedLight.position[0] ?? 0) - result.initialPosition[0],
      (movedLight.position[2] ?? 0) - result.initialPosition[2],
    );

    expect(result.topView.selection.selectedLightId).toBe(result.lightId);
    expect(result.cameraLighting.selection.selectedLightId).toBe(result.lightId);
    expect(result.cameraLighting.lighting.selectedLightId).toBe(result.lightId);
    expect(movedDistance).toBeGreaterThan(0.25);
  });

  test('surfaces AI character routes and targets in the top-view sync snapshot', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.addEnvironmentCharacters || !studio?.updateCharacterConfiguration) {
        throw new Error('VirtualStudio environment character helpers are not available');
      }

      window.dispatchEvent(new CustomEvent('ch-apply-room-shell', {
        detail: {
          shell: {
            type: 'storefront',
            width: 14,
            depth: 10,
            height: 4.8,
            openCeiling: false,
            ceilingStyle: 'flat',
            openings: [
              {
                id: 'front_entry',
                wallTarget: 'rearWall',
                kind: 'door',
                widthRatio: 0.18,
                heightRatio: 0.78,
                xAlign: 'center',
              },
            ],
            zones: [
              { id: 'prep_line', label: 'Prep Line', purpose: 'prep', xBias: -0.24, zBias: -0.08, widthRatio: 0.3, depthRatio: 0.2 },
              { id: 'oven_wall', label: 'Oven Wall', purpose: 'service', xBias: -0.32, zBias: -0.34, widthRatio: 0.22, depthRatio: 0.16 },
              { id: 'front_counter', label: 'Front Counter', purpose: 'counter', xBias: 0.26, zBias: -0.2, widthRatio: 0.28, depthRatio: 0.18 },
              { id: 'dining_aisle', label: 'Dining Aisle', purpose: 'dining', xBias: 0.18, zBias: 0.18, widthRatio: 0.42, depthRatio: 0.3 },
            ],
            fixtures: [
              { id: 'prep_counter_fixture', kind: 'prep_island', zoneId: 'prep_line', widthRatio: 0.22, depthRatio: 0.12, height: 1.05 },
              { id: 'front_counter_fixture', kind: 'counter_block', zoneId: 'front_counter', widthRatio: 0.24, depthRatio: 0.12, height: 1.08 },
              { id: 'banquette_left', kind: 'banquette', zoneId: 'dining_aisle', widthRatio: 0.2, depthRatio: 0.1, height: 1.15 },
              { id: 'pass_shelf_fixture', kind: 'pass_shelf', wallTarget: 'backWall', xBias: -0.16, zBias: -0.28, widthRatio: 0.18, depthRatio: 0.08, height: 1.34 },
            ],
            niches: [],
            wallSegments: [],
            notes: ['Top-view sync behavior coverage'],
          },
        },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 180));

      await studio.addEnvironmentCharacters({
        planId: 'topview-behavior-sync',
        clearExisting: true,
        layoutGuidance: {
          provider: 'sam2_depth',
          roomType: 'storefront',
          visiblePlanes: ['floor', 'backWall', 'leftWall', 'rightWall'],
          depthProfile: {
            quality: 'deep',
            cameraElevation: 'eye',
          },
          objectAnchors: [
            {
              id: 'prep_counter_anchor',
              kind: 'counter',
              label: 'Prep Counter',
              placementMode: 'ground',
              preferredZonePurpose: 'prep',
              bbox: [120, 220, 360, 420],
            },
            {
              id: 'service_counter_anchor',
              kind: 'counter',
              label: 'Front Counter',
              placementMode: 'ground',
              preferredZonePurpose: 'counter',
              bbox: [420, 200, 610, 410],
            },
            {
              id: 'dining_table_anchor',
              kind: 'table',
              label: 'Dining Table',
              placementMode: 'ground',
              preferredZonePurpose: 'dining',
              bbox: [320, 250, 520, 430],
            },
          ],
          suggestedZones: {
            hero: { xBias: 0.1, depthZone: 'midground' },
            supporting: { side: 'left', depthZone: 'midground' },
            background: { wallTarget: 'backWall', depthZone: 'background' },
          },
        },
        characters: [
          {
            name: 'Marco',
            role: 'baker',
            archetypeId: 'worker_baker',
            priority: 'high',
            placementHint: 'prep counter by the oven',
            actionHint: 'stretching pizza dough and checking the oven',
            behaviorPlan: {
              type: 'work_loop',
              homeZoneId: 'prep_line',
              routeZoneIds: ['oven_wall', 'front_counter'],
              lookAtTarget: 'oven',
              pace: 'active',
              radius: 0.9,
            },
          },
          {
            name: 'Sara',
            role: 'server',
            archetypeId: 'worker_server',
            priority: 'medium',
            placementHint: 'service route between counter and dining',
            actionHint: 'serving a pizza to the dining area',
            behaviorPlan: {
              type: 'serve_route',
              homeZoneId: 'front_counter',
              routeZoneIds: ['dining_aisle'],
              lookAtTarget: 'guests',
              pace: 'active',
              radius: 0.8,
            },
          },
        ],
      });

      await new Promise((resolve) => window.setTimeout(resolve, 1400));

      const initialTopView = (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot;
      const serverCharacter = initialTopView.behaviors.characters.find((character) => character.role === 'server');
      if (!serverCharacter?.id) {
        throw new Error('Expected a server character in the top-view behavior snapshot');
      }

      await studio.updateCharacterConfiguration(serverCharacter.id, {
        behaviorPlan: {
          routeZoneIds: ['front_counter', 'dining_aisle', 'prep_line'],
          pace: 'subtle',
        },
      });

      await new Promise((resolve) => window.setTimeout(resolve, 420));

      return {
        initialTopView,
        updatedTopView: (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot,
      };
    });

    const baker = result.updatedTopView.behaviors.characters.find((character) => character.role === 'baker');
    const server = result.updatedTopView.behaviors.characters.find((character) => character.role === 'server');
    const initialServer = result.initialTopView.behaviors.characters.find((character) => character.role === 'server');

    expect(baker).toBeTruthy();
    expect(server).toBeTruthy();
    expect(baker?.behaviorType).toBe('work_loop');
    expect(baker?.homeZoneId).toBe('prep_line');
    expect(baker?.routeZoneIds).toContain('oven_wall');
    expect(baker?.routePoints.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(baker?.targetPosition).not.toBeNull();
    expect(initialServer?.routeZoneIds).toEqual(['dining_aisle']);
    expect(server?.behaviorType).toBe('serve_route');
    expect(server?.routeZoneIds).toContain('dining_aisle');
    expect(server?.routeZoneIds).toContain('prep_line');
    expect(server?.targetKind).toBeTruthy();
    expect(server?.currentPosition).not.toBeNull();
    expect((server?.routePoints.length ?? 0)).toBeGreaterThanOrEqual(initialServer?.routePoints.length ?? 0);
  });

  test('edits a top-view behavior waypoint and persists it back into the runtime plan', async ({ page }) => {
    const setup = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.addEnvironmentCharacters) {
        throw new Error('VirtualStudio environment character helpers are not available');
      }

      window.dispatchEvent(new CustomEvent('ch-apply-room-shell', {
        detail: {
          shell: {
            type: 'storefront',
            width: 14,
            depth: 10,
            height: 4.8,
            openCeiling: false,
            ceilingStyle: 'flat',
            openings: [],
            zones: [
              { id: 'prep_line', label: 'Prep Line', purpose: 'prep', xBias: -0.24, zBias: -0.08, widthRatio: 0.3, depthRatio: 0.2 },
              { id: 'front_counter', label: 'Front Counter', purpose: 'counter', xBias: 0.22, zBias: -0.18, widthRatio: 0.28, depthRatio: 0.18 },
              { id: 'dining_aisle', label: 'Dining Aisle', purpose: 'dining', xBias: 0.18, zBias: 0.2, widthRatio: 0.42, depthRatio: 0.3 },
            ],
            fixtures: [
              { id: 'front_counter_fixture', kind: 'counter_block', zoneId: 'front_counter', widthRatio: 0.24, depthRatio: 0.12, height: 1.08 },
              { id: 'banquette_left', kind: 'banquette', zoneId: 'dining_aisle', widthRatio: 0.2, depthRatio: 0.1, height: 1.15 },
            ],
            niches: [],
            wallSegments: [],
          },
        },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 180));

      await studio.addEnvironmentCharacters({
        planId: 'topview-waypoint-edit',
        clearExisting: true,
        layoutGuidance: {
          provider: 'sam2_depth',
          roomType: 'storefront',
          visiblePlanes: ['floor', 'backWall', 'leftWall', 'rightWall'],
          depthProfile: {
            quality: 'deep',
            cameraElevation: 'eye',
          },
          objectAnchors: [
            {
              id: 'service_counter_anchor',
              kind: 'counter',
              label: 'Front Counter',
              placementMode: 'ground',
              preferredZonePurpose: 'counter',
              bbox: [420, 200, 610, 410],
            },
            {
              id: 'dining_table_anchor',
              kind: 'table',
              label: 'Dining Table',
              placementMode: 'ground',
              preferredZonePurpose: 'dining',
              bbox: [320, 250, 520, 430],
            },
          ],
          suggestedZones: {
            hero: { xBias: 0.1, depthZone: 'midground' },
            supporting: { side: 'right', depthZone: 'midground' },
            background: { wallTarget: 'backWall', depthZone: 'background' },
          },
        },
        characters: [
          {
            name: 'Sara',
            role: 'server',
            archetypeId: 'worker_server',
            priority: 'medium',
            placementHint: 'service route between counter and dining',
            actionHint: 'serving a pizza to the dining area',
            behaviorPlan: {
              type: 'serve_route',
              homeZoneId: 'front_counter',
              routeZoneIds: ['dining_aisle'],
              lookAtTarget: 'guests',
              pace: 'active',
              radius: 0.8,
            },
          },
        ],
      });

      await new Promise((resolve) => window.setTimeout(resolve, 1200));

      const topView = (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot;
      const server = topView.behaviors.characters.find((character) => character.role === 'server');
      if (!server?.id) {
        throw new Error('Expected server route in top-view snapshot');
      }
      if (!server.routePoints[1]) {
        throw new Error('Expected editable route point in top-view snapshot');
      }

      window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
        detail: { nodeId: server.id },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 180));

      const canvas = document.getElementById('topViewCanvas') as HTMLCanvasElement | null;
      if (!canvas) {
        throw new Error('Top-view canvas is not available');
      }

      return {
        serverId: server.id,
        routePoint: server.routePoints[1],
        topView: (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot,
        canvas: {
          width: canvas.width,
          height: canvas.height,
        },
      };
    });

    const editResult = await page.evaluate(async ({ serverId, topView, routePoint }) => {
      const canvas = document.getElementById('topViewCanvas') as HTMLCanvasElement | null;
      const studio = (window as any).virtualStudio;
      if (!canvas || !studio?.getTopViewBehaviorHandleAtCanvasPoint || !studio?.editTopViewBehaviorRoutePoint || !studio?.updateCharacterConfiguration) {
        throw new Error('Top-view behavior editing helpers are not available');
      }

      const scale = (Math.min(canvas.width, canvas.height) / 20) * topView.viewport.zoom;
      const cx = (canvas.width / 2) + topView.viewport.pan.x;
      const cy = (canvas.height / 2) + topView.viewport.pan.y;
      const startCanvasX = cx + (routePoint.x * scale);
      const startCanvasY = cy - (routePoint.z * scale);
      const behaviorHandle = studio.getTopViewBehaviorHandleAtCanvasPoint(startCanvasX, startCanvasY);
      if (!behaviorHandle || behaviorHandle.actorId !== serverId) {
        throw new Error('Expected top-view to resolve the selected behavior handle');
      }

      const nextPoint = {
        x: routePoint.x + 1.15,
        z: routePoint.z - 0.75,
      };

      const updated = await studio.editTopViewBehaviorRoutePoint(
        serverId,
        behaviorHandle.pointIndex,
        nextPoint,
        { persist: true },
      );
      if (!updated) {
        throw new Error('Expected top-view route edit to succeed');
      }

      await studio.updateCharacterConfiguration(serverId, {
        actionHint: 'serving a pizza to the dining area with a smoother arc',
      });

      await new Promise((resolve) => window.setTimeout(resolve, 260));

      const updatedTopView = (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot;
      const updatedServer = updatedTopView.behaviors.characters.find((character) => character.id === serverId);
      const runtimeCharacter = studio.sceneState?.characters?.get?.(serverId);
      const customRoutePoints = runtimeCharacter?.metadata?.behaviorPlan?.customRoutePoints || null;

      return {
        editedPointIndex: behaviorHandle.pointIndex,
        nextPoint,
        updatedServer,
        customRoutePoints,
      };
    }, {
      serverId: setup.serverId,
      topView: setup.topView,
      routePoint: setup.routePoint,
    });

    expect(editResult.editedPointIndex).toBeGreaterThan(0);
    expect(editResult.updatedServer).toBeTruthy();
    expect(editResult.updatedServer?.routePoints[editResult.editedPointIndex]?.x).toBeCloseTo(editResult.nextPoint.x, 1);
    expect(editResult.updatedServer?.routePoints[editResult.editedPointIndex]?.z).toBeCloseTo(editResult.nextPoint.z, 1);
    expect(Array.isArray(editResult.customRoutePoints)).toBeTruthy();
    expect(editResult.customRoutePoints[editResult.editedPointIndex]?.x).toBeCloseTo(editResult.nextPoint.x, 1);
    expect(editResult.customRoutePoints[editResult.editedPointIndex]?.z).toBeCloseTo(editResult.nextPoint.z, 1);
  });

  test('assigns a top-view home zone and look target through the visible top-view toolbar', async ({ page }) => {
    test.slow();
    const setup = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (
        !studio?.addEnvironmentCharacters
        || !studio?.getTopViewRoomZonePreview
        || !studio?.applyTopViewBehaviorZoneAssignmentAtCanvasPoint
      ) {
        throw new Error('VirtualStudio top-view behavior zone helpers are not available');
      }

      window.dispatchEvent(new CustomEvent('ch-apply-room-shell', {
        detail: {
          shell: {
            type: 'storefront',
            width: 14,
            depth: 10,
            height: 4.8,
            openCeiling: false,
            ceilingStyle: 'flat',
            openings: [],
            zones: [
              { id: 'prep_line', label: 'Prep Line', purpose: 'prep', xBias: -0.24, zBias: -0.08, widthRatio: 0.3, depthRatio: 0.2 },
              { id: 'front_counter', label: 'Front Counter', purpose: 'counter', xBias: 0.22, zBias: -0.18, widthRatio: 0.28, depthRatio: 0.18 },
              { id: 'dining_aisle', label: 'Dining Aisle', purpose: 'dining', xBias: 0.18, zBias: 0.2, widthRatio: 0.42, depthRatio: 0.3 },
            ],
            fixtures: [
              { id: 'front_counter_fixture', kind: 'counter_block', zoneId: 'front_counter', widthRatio: 0.24, depthRatio: 0.12, height: 1.08 },
              { id: 'banquette_left', kind: 'banquette', zoneId: 'dining_aisle', widthRatio: 0.2, depthRatio: 0.1, height: 1.15 },
            ],
            niches: [],
            wallSegments: [],
          },
        },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 180));

      await studio.addEnvironmentCharacters({
        planId: 'topview-home-zone-edit',
        clearExisting: true,
        layoutGuidance: {
          provider: 'sam2_depth',
          roomType: 'storefront',
          visiblePlanes: ['floor', 'backWall', 'leftWall', 'rightWall'],
          depthProfile: {
            quality: 'deep',
            cameraElevation: 'eye',
          },
          objectAnchors: [
            {
              id: 'service_counter_anchor',
              kind: 'counter',
              label: 'Front Counter',
              placementMode: 'ground',
              preferredZonePurpose: 'counter',
              bbox: [420, 200, 610, 410],
            },
          ],
        },
        characters: [
          {
            name: 'Sara',
            role: 'server',
            archetypeId: 'worker_server',
            priority: 'medium',
            placementHint: 'service route between counter and dining',
            actionHint: 'serving a pizza to the dining area',
            behaviorPlan: {
              type: 'serve_route',
              homeZoneId: 'front_counter',
              routeZoneIds: ['dining_aisle'],
              lookAtTarget: 'guests',
              pace: 'active',
              radius: 0.8,
            },
          },
        ],
      });

      await new Promise((resolve) => window.setTimeout(resolve, 1100));

      const topView = (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot;
      const server = topView.behaviors.characters.find((character) => character.role === 'server');
      if (!server?.id) {
        throw new Error('Expected server character in the top-view behavior snapshot');
      }

      window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
        detail: { nodeId: server.id },
      }));
      await new Promise((resolve) => window.setTimeout(resolve, 160));

      const prepPreview = studio.getTopViewRoomZonePreview('prep_line');
      const counterPreview = studio.getTopViewRoomZonePreview('front_counter');
      if (!prepPreview?.canvasCenter) {
        throw new Error('Expected prep_line zone preview for top-view editing');
      }
      if (!counterPreview?.canvasCenter) {
        throw new Error('Expected front_counter zone preview for top-view editing');
      }

      const zoneAtCenter = studio.getTopViewRoomZoneAtCanvasPoint(prepPreview.canvasCenter.x, prepPreview.canvasCenter.y);
      if (zoneAtCenter !== 'prep_line') {
        throw new Error(`Expected prep_line at top-view zone center, got ${String(zoneAtCenter)}`);
      }

      return {
        serverId: server.id,
        prepPreview,
        counterPreview,
      };
    });

    expect(setup.prepPreview?.zoneId).toBe('prep_line');
    expect(setup.counterPreview?.zoneId).toBe('front_counter');

    await page.locator('#topviewAssignHomeZone').click();

    const homeModeState = await page.evaluate(() => ({
      mode: (window as any).virtualStudio?.getTopViewBehaviorZoneAssignmentMode?.() ?? null,
      pressed: document.getElementById('topviewAssignHomeZone')?.getAttribute('aria-pressed'),
      info: document.getElementById('topviewInfoBehaviorMode')?.textContent ?? null,
    }));

    expect(homeModeState.mode).toBe('home-zone');
    expect(homeModeState.pressed).toBe('true');
    expect(homeModeState.info).toContain('Hjemmesone');

    const assignedHomeZone = await page.evaluate(async ({ x, y }) => {
      const studio = (window as any).virtualStudio;
      return await studio.applyTopViewBehaviorZoneAssignmentAtCanvasPoint(x, y);
    }, {
      x: setup.prepPreview.canvasCenter.x,
      y: setup.prepPreview.canvasCenter.y,
    });

    expect(assignedHomeZone).toBeTruthy();

    await page.locator('#topviewAssignLookTarget').click();

    const lookTargetModeState = await page.evaluate(() => ({
      mode: (window as any).virtualStudio?.getTopViewBehaviorZoneAssignmentMode?.() ?? null,
      pressed: document.getElementById('topviewAssignLookTarget')?.getAttribute('aria-pressed'),
      info: document.getElementById('topviewInfoBehaviorMode')?.textContent ?? null,
    }));

    expect(lookTargetModeState.mode).toBe('look-target');
    expect(lookTargetModeState.pressed).toBe('true');
    expect(lookTargetModeState.info).toContain('Se mot');

    const assignedLookTarget = await page.evaluate(async ({ x, y }) => {
      const studio = (window as any).virtualStudio;
      return await studio.applyTopViewBehaviorZoneAssignmentAtCanvasPoint(x, y);
    }, {
      x: setup.counterPreview.canvasCenter.x,
      y: setup.counterPreview.canvasCenter.y,
    });

    expect(assignedLookTarget).toBeTruthy();

    await page.locator('#topviewBehaviorPaceStill').click();

    const paceModeState = await page.evaluate(() => ({
      stillPressed: document.getElementById('topviewBehaviorPaceStill')?.getAttribute('aria-pressed'),
      subtlePressed: document.getElementById('topviewBehaviorPaceSubtle')?.getAttribute('aria-pressed'),
      activePressed: document.getElementById('topviewBehaviorPaceActive')?.getAttribute('aria-pressed'),
      info: document.getElementById('topviewInfoBehaviorPace')?.textContent ?? null,
    }));

    expect(paceModeState.stillPressed).toBe('true');
    expect(paceModeState.subtlePressed).toBe('false');
    expect(paceModeState.activePressed).toBe('false');
    expect(paceModeState.info).toContain('Rolig');

    const result = await page.evaluate(async ({ serverId }) => {
      await new Promise((resolve) => window.setTimeout(resolve, 260));
      const studio = (window as any).virtualStudio;
      const updatedTopView = (window as any).__virtualStudioTopViewSync as TopViewSyncSnapshot;
      const updatedServer = updatedTopView.behaviors.characters.find((character) => character.id === serverId);
      const runtimeCharacter = studio.sceneState?.characters?.get?.(serverId);
      return {
        mode: studio.getTopViewBehaviorZoneAssignmentMode?.() ?? null,
        homePressed: document.getElementById('topviewAssignHomeZone')?.getAttribute('aria-pressed'),
        lookPressed: document.getElementById('topviewAssignLookTarget')?.getAttribute('aria-pressed'),
        updatedServer,
        runtimeBehaviorPlan: runtimeCharacter?.metadata?.behaviorPlan || null,
      };
    }, {
      serverId: setup.serverId,
    });

    expect(result.mode).toBeNull();
    expect(result.homePressed).toBe('false');
    expect(result.lookPressed).toBe('false');
    expect(result.updatedServer).toBeTruthy();
    expect(result.updatedServer?.homeZoneId).toBe('prep_line');
    expect(result.updatedServer?.lookAtTarget).toBe('counter');
    expect(result.updatedServer?.pace).toBe('still');
    expect(result.runtimeBehaviorPlan?.homeZoneId).toBe('prep_line');
    expect(result.runtimeBehaviorPlan?.lookAtTarget).toBe('counter');
    expect(result.runtimeBehaviorPlan?.pace).toBe('still');
  });
});
