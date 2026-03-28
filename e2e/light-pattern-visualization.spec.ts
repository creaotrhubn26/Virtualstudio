import { expect, test, type Page } from '@playwright/test';

type CameraLightingSnapshot = {
  lighting: {
    lights: Array<{
      id: string;
      role: string | null;
      goboId?: string | null;
      goboProjectionApplied?: boolean | null;
    }>;
  };
};

type TopViewSnapshot = {
  patterns: {
    selectedPatternId: string | null;
    selectedPatternLabel?: string | null;
    showGuides: boolean;
    aiRecommendedPatternLabel?: string | null;
  };
};

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioRuntimeReady?.ready), { timeout: 90_000 });
}

test.describe('Light Pattern Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudio(page);
  });

  test('loads the Rembrandt thumbnail from a valid source in the pattern library', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('openLightPatternLibrary'));
    });

    await expect(page.getByRole('heading', { name: 'Fotomønstre Bibliotek', exact: true })).toBeVisible({ timeout: 30_000 });

    const rembrandtThumbnail = page.locator('img[alt="Rembrandt"]').first();
    await expect(rembrandtThumbnail).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(() => {
      const image = document.querySelector('img[alt="Rembrandt"]') as HTMLImageElement | null;
      return Boolean(image && image.complete && image.naturalWidth > 0);
    }, { timeout: 30_000 });

    const thumbnailState = await rembrandtThumbnail.evaluate((image: HTMLImageElement) => ({
      currentSrc: image.currentSrc || image.src,
      naturalWidth: image.naturalWidth,
    }));

    expect(thumbnailState.naturalWidth).toBeGreaterThan(0);
    expect(
      thumbnailState.currentSrc.includes('/attached_assets/generated_images/rembrandt_lighting_pattern_diagram.png')
      || thumbnailState.currentSrc.startsWith('data:image/svg+xml,'),
    ).toBeTruthy();
  });

  test('surfaces AI family recommendations inside the pattern library', async ({ page }) => {
    await page.evaluate(() => {
      const insight = {
        familyId: 'noir',
        familyLabel: 'Noir',
        summary: 'AI leser dette som noir.',
        lightingDetails: ['key: grid · 24° · gobo blinds — Venetian slats carve the face.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insight;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', { detail: insight }));
      window.dispatchEvent(new CustomEvent('openLightPatternLibrary'));
    });

    await expect(page.getByRole('heading', { name: 'Fotomønstre Bibliotek', exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('light-pattern-ai-banner')).toContainText('AI-retning: Noir');
    await expect(page.getByTestId('light-pattern-ai-banner')).toContainText('Prioriterer: Low-Key · Split Lighting · Motivated');
    await expect(page.getByText('AI-match').first()).toBeVisible({ timeout: 10_000 });
  });

  test('applies the AI-recommended pattern directly from the pattern library', async ({ page }) => {
    await page.evaluate(() => {
      const insight = {
        familyId: 'noir',
        familyLabel: 'Noir',
        summary: 'AI leser dette som noir.',
        lightingDetails: ['key: grid · 24° · gobo blinds — Venetian slats carve the face.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insight;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', { detail: insight }));
      window.dispatchEvent(new CustomEvent('openLightPatternLibrary'));
    });

    await expect(page.getByTestId('light-pattern-ai-apply')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('light-pattern-ai-apply').click();

    await page.waitForFunction(() => {
      const snapshot = (window as any).__virtualStudioTopViewSync as TopViewSnapshot | undefined;
      return snapshot?.patterns?.selectedPatternId === 'low-key';
    }, { timeout: 10_000 });

    const topView = await page.evaluate(() => (window as any).__virtualStudioTopViewSync as TopViewSnapshot);
    expect(topView.patterns.selectedPatternId).toBe('low-key');
    expect(topView.patterns.selectedPatternLabel).toBe('Low Key');
    expect(topView.patterns.showGuides).toBeTruthy();
    expect(topView.patterns.aiRecommendedPatternLabel).toBe('Low Key');
  });

  test('can open the AI-recommended pattern directly in details view', async ({ page }) => {
    await page.waitForFunction(() => Boolean((window as any).__virtualStudioLightPatternLibraryReady), { timeout: 30_000 });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('openLightPatternLibrary', {
        detail: {
          preferredPatternId: 'low-key',
          openPreferredPatternDetails: true,
        },
      }));
    });

    await expect(page.getByText('When to Use')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Setup Instructions')).toBeVisible({ timeout: 30_000 });
  });

  test('can open AI pattern details directly from the light recommendation dialog', async ({ page }) => {
    await page.waitForFunction(() => Boolean((window as any).__virtualStudioLightPatternLibraryReady), { timeout: 30_000 });

    await page.evaluate(async () => {
      const insight = {
        familyId: 'warehouse',
        familyLabel: 'Warehouse',
        summary: 'AI leser dette som warehouse.',
        lightingDetails: ['rim: fresnel · 24° · gobo breakup — Industrial breakup adds dusty warehouse texture.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insight;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', { detail: insight }));

      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan || !studio?.selectLight) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'camera-light-pattern-details',
        clearExisting: true,
        mood: 'industrial warehouse',
        contextText: 'warehouse rim accent with dusty breakup texture',
        lighting: [
          {
            role: 'rim',
            position: [2.2, 3.1, -1.6],
            intensity: 1.1,
            cct: 4300,
            purpose: 'Warehouse rim accent',
          },
        ],
      });

      const lightId = Array.from(studio.lights.keys())[0];
      if (!lightId) {
        throw new Error('Expected a synced light after applyEnvironmentLightingPlan');
      }

      studio.selectLight(lightId);
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });

    await expect(page.locator('#lightRecommendationAiPatternDetailsBtn')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#lightRecommendationAiPatternFamily')).toContainText('Warehouse');
    await expect(page.locator('#lightRecommendationAiPatternLabel')).toContainText('Low Key');
    await page.evaluate(() => {
      (document.getElementById('lightRecommendationAiPatternDetailsBtn') as HTMLButtonElement | null)?.click();
    });

    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('[role="dialog"]')).some((dialog) => {
        const text = dialog.textContent || '';
        return text.includes('When to Use') && text.includes('Setup Instructions');
      });
    }, { timeout: 30_000 });
  });

  test('can apply the AI-recommended pattern directly from the light recommendation dialog', async ({ page }) => {
    await page.evaluate(async () => {
      const insight = {
        familyId: 'warehouse',
        familyLabel: 'Warehouse',
        summary: 'AI leser dette som warehouse.',
        lightingDetails: ['rim: fresnel · 24° · gobo breakup — Industrial breakup adds dusty warehouse texture.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insight;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', { detail: insight }));

      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan || !studio?.selectLight) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'camera-light-pattern-apply',
        clearExisting: true,
        mood: 'industrial warehouse',
        contextText: 'warehouse rim accent with dusty breakup texture',
        lighting: [
          {
            role: 'rim',
            position: [2.2, 3.1, -1.6],
            intensity: 1.1,
            cct: 4300,
            purpose: 'Warehouse rim accent',
          },
        ],
      });

      const lightId = Array.from(studio.lights.keys())[0];
      if (!lightId) {
        throw new Error('Expected a synced light after applyEnvironmentLightingPlan');
      }

      studio.selectLight(lightId);
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });

    await expect(page.locator('#lightRecommendationAiPatternApplyBtn')).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => {
      (document.getElementById('lightRecommendationAiPatternApplyBtn') as HTMLButtonElement | null)?.click();
    });

    await page.waitForFunction(() => {
      const snapshot = (window as any).__virtualStudioTopViewSync as TopViewSnapshot | undefined;
      return snapshot?.patterns?.selectedPatternId === 'low-key';
    }, { timeout: 30_000 });

    const topView = await page.evaluate(() => (window as any).__virtualStudioTopViewSync as TopViewSnapshot);
    expect(topView.patterns.selectedPatternId).toBe('low-key');
    expect(topView.patterns.selectedPatternLabel).toBe('Low Key');
    expect(topView.patterns.showGuides).toBeTruthy();
  });

  test('can apply the AI-recommended pattern directly from the camera and lights overlay', async ({ page }) => {
    await page.evaluate(async () => {
      const insight = {
        familyId: 'warehouse',
        familyLabel: 'Warehouse',
        summary: 'AI leser dette som warehouse.',
        lightingDetails: ['rim: fresnel · 24° · gobo breakup — Industrial breakup adds dusty warehouse texture.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insight;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', { detail: insight }));

      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan || !studio?.selectLight) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'camera-overlay-light-pattern-apply',
        clearExisting: true,
        mood: 'industrial warehouse',
        contextText: 'warehouse rim accent with dusty breakup texture',
        lighting: [
          {
            role: 'rim',
            position: [2.2, 3.1, -1.6],
            intensity: 1.1,
            cct: 4300,
            purpose: 'Warehouse rim accent',
          },
        ],
      });

      const lightId = Array.from(studio.lights.keys())[0];
      if (!lightId) {
        throw new Error('Expected a synced light after applyEnvironmentLightingPlan');
      }

      studio.selectLight(lightId);
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      (document.querySelector('.light-recommendation-close') as HTMLButtonElement | null)?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    });

    await page.evaluate(() => {
      (document.getElementById('cameraControlBtn') as HTMLButtonElement | null)?.click();
      (document.getElementById('tabLight') as HTMLButtonElement | null)?.click();
    });

    await expect(page.locator('#lightAiPatternApplyBtn')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#lightAiPatternFamily')).toContainText('Warehouse');
    await expect(page.locator('#lightAiPatternLabel')).toContainText('Low Key');

    await page.evaluate(() => {
      (document.getElementById('lightAiPatternApplyBtn') as HTMLButtonElement | null)?.click();
    });

    await page.waitForFunction(() => {
      const snapshot = (window as any).__virtualStudioTopViewSync as TopViewSnapshot | undefined;
      return snapshot?.patterns?.selectedPatternId === 'low-key';
    }, { timeout: 30_000 });

    const topView = await page.evaluate(() => (window as any).__virtualStudioTopViewSync as TopViewSnapshot);
    expect(topView.patterns.selectedPatternId).toBe('low-key');
    expect(topView.patterns.selectedPatternLabel).toBe('Low Key');
    expect(topView.patterns.showGuides).toBeTruthy();
  });

  test('can apply the AI-recommended pattern directly from the Studio Library lights panel', async ({ page }) => {
    await page.evaluate(async () => {
      const insight = {
        familyId: 'warehouse',
        familyLabel: 'Warehouse',
        summary: 'AI leser dette som warehouse.',
        lightingDetails: ['rim: fresnel · 24° · gobo breakup — Industrial breakup adds dusty warehouse texture.'],
      };
      (window as any).__virtualStudioLastEnvironmentPlanInsights = insight;
      window.dispatchEvent(new CustomEvent('vs-environment-plan-insights-updated', { detail: insight }));

      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan || !studio?.selectLight) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'studio-library-lights-panel-pattern-apply',
        clearExisting: true,
        mood: 'industrial warehouse',
        contextText: 'warehouse rim accent with dusty breakup texture',
        lighting: [
          {
            role: 'rim',
            position: [2.2, 3.1, -1.6],
            intensity: 1.1,
            cct: 4300,
            purpose: 'Warehouse rim accent',
          },
        ],
      });

      const lightId = Array.from(studio.lights.keys())[0];
      if (!lightId) {
        throw new Error('Expected a synced light after applyEnvironmentLightingPlan');
      }

      studio.selectLight(lightId);
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      (document.querySelector('.light-recommendation-close') as HTMLButtonElement | null)?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    });

    await page.getByRole('button', { name: 'Studio Library' }).click();
    await page.waitForFunction(() => {
      const panel = document.getElementById('actorBottomPanel');
      return Boolean(panel?.classList.contains('open'));
    }, { timeout: 30_000 });
    await page.evaluate(() => {
      (document.querySelector('.actor-tab[data-tab="lights"]') as HTMLButtonElement | null)?.click();
    });

    const lightsPanel = page.locator('#lightsBrowserRoot');
    await expect(lightsPanel.getByText('AI-retning: Warehouse')).toBeVisible({ timeout: 30_000 });
    await expect(lightsPanel.getByRole('button', { name: /Bruk AI-pattern/i })).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => {
      const root = document.getElementById('lightsBrowserRoot');
      const button = Array.from(root?.querySelectorAll('button') || []).find((element) =>
        (element.textContent || '').includes('Bruk AI-pattern'),
      ) as HTMLButtonElement | undefined;
      button?.click();
    });

    await page.waitForFunction(() => {
      const snapshot = (window as any).__virtualStudioTopViewSync as TopViewSnapshot | undefined;
      return snapshot?.patterns?.selectedPatternId === 'low-key';
    }, { timeout: 30_000 });

    const topView = await page.evaluate(() => (window as any).__virtualStudioTopViewSync as TopViewSnapshot);
    expect(topView.patterns.selectedPatternId).toBe('low-key');
    expect(topView.patterns.selectedPatternLabel).toBe('Low Key');
    expect(topView.patterns.showGuides).toBeTruthy();
  });

  test('keeps Rembrandt pattern lights clean while enabling top-view guides', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const pattern = {
        id: 'rembrandt',
        name: 'Rembrandt',
        slug: 'rembrandt',
        category: 'portrait',
        description: 'Classic Rembrandt portrait lighting',
        lookDescription: 'Dramatic portrait look with triangle cheek light',
        whenToUse: 'Character portraits and classic headshots',
        lightSetup: [
          { type: 'key', angle: 45, height: 1.8, distance: 2.3, power: 80 },
          { type: 'fill', angle: -30, height: 1.3, distance: 1.9, power: 24 },
        ],
      };

      window.dispatchEvent(new CustomEvent('applyLightPattern', { detail: pattern }));
      await new Promise((resolve) => window.setTimeout(resolve, 350));

      return {
        cameraLighting: (window as any).__virtualStudioCameraLightingSync as CameraLightingSnapshot,
        topView: (window as any).__virtualStudioTopViewSync as TopViewSnapshot,
        diagnostics: (window as any).__virtualStudioDiagnostics?.environment,
      };
    });

    expect(result.topView.patterns.selectedPatternId).toBe('rembrandt');
    expect(result.topView.patterns.showGuides).toBeTruthy();
    expect(result.cameraLighting.lighting.lights.length).toBeGreaterThanOrEqual(1);
    expect(result.cameraLighting.lighting.lights.every((light) => !light.goboId)).toBeTruthy();
    expect(
      (result.diagnostics?.sceneState?.lights ?? []).every((light: { goboId?: string | null }) => !light.goboId),
    ).toBeTruthy();
  });

  test('infers warehouse breakup gobos for accent lights in runtime', async ({ page }) => {
    await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      if (!studio?.applyEnvironmentLightingPlan) {
        throw new Error('VirtualStudio lighting helpers are not available');
      }

      await studio.applyEnvironmentLightingPlan({
        planId: 'warehouse-gobo-visualization',
        clearExisting: true,
        mood: 'industrial warehouse plate',
        contextText: 'warehouse scene with haze, concrete pillars and metal texture',
        lighting: [
          {
            role: 'accent',
            position: [2.6, 3.5, 1.2],
            intensity: 0.74,
            cct: 4600,
            purpose: 'Dusty industrial breakup on the background wall',
          },
        ],
      });
    });
    await page.waitForFunction(() => {
      const snapshot = (window as any).__virtualStudioCameraLightingSync as CameraLightingSnapshot | undefined;
      const accentLight = snapshot?.lighting?.lights?.find(
        (light: any) => light.role === 'accent' && light.environmentAutoRig,
      ) || snapshot?.lighting?.lights?.find((light: any) => light.environmentAutoRig);
      return accentLight?.goboId === 'breakup' && Boolean(accentLight?.goboProjectionApplied);
    }, { timeout: 10_000 });

    const snapshot = await page.evaluate(() => (window as any).__virtualStudioCameraLightingSync as CameraLightingSnapshot);
    const accentLight = snapshot.lighting.lights.find(
      (light) => light.role === 'accent' && light.environmentAutoRig,
    ) || snapshot.lighting.lights.find((light) => light.environmentAutoRig);

    expect(accentLight?.goboId).toBe('breakup');
    expect(accentLight?.goboProjectionApplied).toBeTruthy();
  });
});
