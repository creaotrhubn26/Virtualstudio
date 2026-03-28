import { expect, test, type Page } from '@playwright/test';

type CameraLightingSyncSnapshot = {
  reason?: string;
  camera: {
    focalLength: number;
    aperture: number;
    lastSource?: string | null;
  };
  lighting: {
    lights: Array<{
      id: string;
      name: string;
      role: string | null;
      environmentAutoRig: boolean;
      goboId?: string | null;
      goboPattern?: string | null;
      goboProjectionApplied?: boolean | null;
    }>;
    selectedLightId: string | null;
  };
  selection: {
    selectedCameraBodyId: string | null;
    selectedLensId: string | null;
    selectedLightId: string | null;
  };
};

type SceneSelectionSyncSnapshot = {
  reason?: string;
  selection: {
    selectedNodeId: string | null;
    selectedActorId: string | null;
    selectedLightId: string | null;
    selectedCameraPresetId: string | null;
    activeCameraPresetId: string | null;
    source: string | null;
  };
};

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioRuntimeReady?.ready), { timeout: 90_000 });
}

test.describe('Camera And Light Sync', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudio(page);
  });

  test('syncs camera body and lens selections into runtime state', async ({ page }) => {
    const snapshot = await page.evaluate(async () => {
      window.dispatchEvent(new CustomEvent('ch-select-camera', {
        detail: {
          id: 'canon-r5',
          name: 'Canon EOS R5',
        },
      }));
      window.dispatchEvent(new CustomEvent('ch-select-lens', {
        detail: {
          id: 'canon-rf85',
          name: 'Canon RF 85mm f/1.2L USM',
          focalValue: 85,
          apertureValue: 1.2,
        },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 150));
      return (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;
    });

    expect(snapshot.selection.selectedCameraBodyId).toBe('canon-r5');
    expect(snapshot.selection.selectedLensId).toBe('canon-rf85');
    expect(snapshot.camera.focalLength).toBe(85);
    expect(snapshot.camera.aperture).toBe(1.2);
  });

  test('publishes light additions and selection into sync snapshot', async ({ page }) => {
    const snapshot = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan || !studio?.selectLight) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'camera-light-sync',
        clearExisting: true,
        lighting: [
          {
            role: 'key',
            position: [1.8, 3.2, -2.2],
            intensity: 1.2,
            cct: 5600,
            purpose: 'Sync test key light',
          },
        ],
      });

      const afterApply = (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;
      const firstLightId = afterApply.lighting.lights[0]?.id;
      if (!firstLightId) {
        throw new Error('Expected a synced light after applyEnvironmentLightingPlan');
      }

      studio.selectLight(firstLightId);
      await new Promise((resolve) => window.setTimeout(resolve, 50));

      return (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;
    });

    expect(snapshot.lighting.lights).toHaveLength(1);
    expect(snapshot.lighting.lights[0].role).toBe('key');
    expect(snapshot.lighting.lights[0].environmentAutoRig).toBeTruthy();
    expect(snapshot.lighting.selectedLightId).toBe(snapshot.lighting.lights[0].id);
    expect(snapshot.selection.selectedLightId).toBe(snapshot.lighting.lights[0].id);
  });

  test('syncs gobo attachments into runtime light state', async ({ page }) => {
    const snapshot = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan || !studio?.selectLight) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'camera-light-gobo-sync',
        clearExisting: true,
        lighting: [
          {
            role: 'accent',
            position: [1.5, 3.0, -1.7],
            intensity: 0.85,
            cct: 5600,
            purpose: 'Gobo sync test accent light',
          },
        ],
      });

      const afterApply = (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;
      const lightId = afterApply.lighting.lights[0]?.id;
      if (!lightId) {
        throw new Error('Expected a synced light after applyEnvironmentLightingPlan');
      }

      studio.selectLight(lightId);
      window.dispatchEvent(new CustomEvent('ch-attach-gobo', {
        detail: {
          lightId,
          goboId: 'blinds',
          options: {
            size: 1.2,
            rotation: 0,
            intensity: 0.85,
          },
        },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 120));
      return (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;
    });

    expect(snapshot.lighting.lights[0]?.goboId).toBe('blinds');
    expect(snapshot.lighting.lights[0]?.goboPattern).toBe('blinds');
    expect(snapshot.lighting.lights[0]?.goboProjectionApplied).toBeTruthy();
  });

  test('infers beauty editorial gobos for accent lights when auto-rig plans omit them', async ({ page }) => {
    const snapshot = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'camera-light-beauty-gobo-infer',
        clearExisting: true,
        mood: 'luxury beauty editorial',
        contextText: 'fashion beauty close-up with premium glossy backdrop',
        lighting: [
          {
            role: 'accent',
            position: [0.8, 3.2, 2.6],
            intensity: 0.55,
            cct: 5600,
            purpose: 'Glossy editorial accent sweep for product highlights',
          },
        ],
      });

      await new Promise((resolve) => window.setTimeout(resolve, 120));
      return (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;
    });

    expect(snapshot.lighting.lights[0]?.goboId).toBe('breakup');
    expect(snapshot.lighting.lights[0]?.goboProjectionApplied).toBeTruthy();
  });

  test('infers noir gobos for key lights when auto-rig plans omit them', async ({ page }) => {
    const snapshot = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'camera-light-noir-gobo-infer',
        clearExisting: true,
        mood: 'dramatic low-key noir',
        contextText: 'detective portrait with venetian blinds',
        lighting: [
          {
            role: 'key',
            position: [-1.9, 2.8, -0.8],
            intensity: 0.88,
            cct: 4300,
            purpose: 'Hard venetian blind shadow across the subject',
          },
        ],
      });

      await new Promise((resolve) => window.setTimeout(resolve, 120));
      return (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;
    });

    expect(snapshot.lighting.lights[0]?.goboId).toBe('blinds');
    expect(snapshot.lighting.lights[0]?.goboProjectionApplied).toBeTruthy();
  });

  test('syncs camera preset selection and director camera controls into runtime state', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.saveCameraPreset || !studio?.getCameraFov) {
        throw new Error('VirtualStudio camera preset helpers are not available');
      }

      studio.saveCameraPreset('camA');
      window.dispatchEvent(new CustomEvent('ch-camera-preset-selected', {
        detail: { presetId: 'camA' },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 150));
      const selectionAfterSelect = (window as any).__virtualStudioSceneSelectionSync as SceneSelectionSyncSnapshot;

      window.dispatchEvent(new CustomEvent('vs-camera-zoom', {
        detail: { cameraId: 'camA', amount: 0.5 },
      }));

      await new Promise((resolve) => window.setTimeout(resolve, 1400));
      const selectionAfterZoom = (window as any).__virtualStudioSceneSelectionSync as SceneSelectionSyncSnapshot;
      const cameraSyncAfterZoom = (window as any).__virtualStudioCameraLightingSync as CameraLightingSyncSnapshot;

      return {
        selectionAfterSelect,
        selectionAfterZoom,
        cameraSyncAfterZoom,
      };
    });

    expect(result.selectionAfterSelect.selection.selectedCameraPresetId).toBe('camA');
    expect(result.selectionAfterZoom.selection.selectedCameraPresetId).toBe('camA');
    expect(result.selectionAfterZoom.reason).toBe('director-camera-zoomed');
    expect(result.cameraSyncAfterZoom.reason).toBe('director-camera-zoomed');
    expect(result.cameraSyncAfterZoom.camera.lastSource).toBe('director-mode');
  });
});
