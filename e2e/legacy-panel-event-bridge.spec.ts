import { expect, test, type Page } from '@playwright/test';

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioRuntimeReady?.ready), { timeout: 90_000 });
  await page.waitForFunction(() => (window as any).__virtualStudioPanelEventBridgeReady === true, { timeout: 90_000 });
}

test.describe('Legacy Panel Event Bridge', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudio(page);
  });

  test('bridges legacy studio library open events to the correct modern tabs', async ({ page }) => {
    const state = await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-asset-library'));
      const panel = document.getElementById('actorBottomPanel');
      const trigger = document.getElementById('actorPanelTrigger');
      const activeTabAfterAssets = document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null;
      const activeContentAfterAssets = document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null;

      window.dispatchEvent(new CustomEvent('open-light-browser'));
      const activeTabAfterLights = document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null;
      const activeContentAfterLights = document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null;

      window.dispatchEvent(new CustomEvent('open-camera-gear'));
      const activeTabAfterCamera = document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null;
      const activeContentAfterCamera = document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null;

      window.dispatchEvent(new CustomEvent('open-equipment-library'));
      const activeTabAfterEquipment = document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null;
      const activeContentAfterEquipment = document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null;

      window.dispatchEvent(new CustomEvent('open-hdri-library'));
      const activeTabAfterHdri = document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null;
      const activeContentAfterHdri = document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null;

      window.dispatchEvent(new CustomEvent('open-character-library'));
      const activeTabAfterCharacters = document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null;
      const activeContentAfterCharacters = document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null;

      window.dispatchEvent(new CustomEvent('open-scene-library'));
      const activeTabAfterScenes = document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null;
      const activeContentAfterScenes = document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null;

      return {
        panelOpen: panel?.classList.contains('open') ?? false,
        triggerExpanded: trigger?.getAttribute('aria-expanded') ?? null,
        activeTabAfterAssets,
        activeContentAfterAssets,
        activeTabAfterLights,
        activeContentAfterLights,
        activeTabAfterCamera,
        activeContentAfterCamera,
        activeTabAfterEquipment,
        activeContentAfterEquipment,
        activeTabAfterHdri,
        activeContentAfterHdri,
        activeTabAfterCharacters,
        activeContentAfterCharacters,
        activeTabAfterScenes,
        activeContentAfterScenes,
      };
    });

    expect(state.panelOpen).toBe(true);
    expect(state.triggerExpanded).toBe('true');
    expect(state.activeTabAfterAssets).toBe('assets');
    expect(state.activeContentAfterAssets).toBe('assets');
    expect(state.activeTabAfterLights).toBe('lights');
    expect(state.activeContentAfterLights).toBe('lights');
    expect(state.activeTabAfterCamera).toBe('camera');
    expect(state.activeContentAfterCamera).toBe('camera');
    expect(state.activeTabAfterEquipment).toBe('equipment');
    expect(state.activeContentAfterEquipment).toBe('equipment');
    expect(state.activeTabAfterHdri).toBe('hdri');
    expect(state.activeContentAfterHdri).toBe('hdri');
    expect(state.activeTabAfterCharacters).toBe('models');
    expect(state.activeContentAfterCharacters).toBe('models');
    expect(state.activeTabAfterScenes).toBe('scener');
    expect(state.activeContentAfterScenes).toBe('scener');
  });

  test('bridges legacy camera and scene events to modern panels', async ({ page }) => {
    const state = await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-light-control'));
      const cameraControlsPanel = document.getElementById('cameraControlsPanel') as HTMLElement | null;
      const lightTabContent = document.getElementById('lightTabContent') as HTMLElement | null;
      const cameraTabContent = document.getElementById('cameraTabContent') as HTMLElement | null;

      const afterLightControl = {
        panelVisible: cameraControlsPanel?.style.display === 'block',
        lightVisible: lightTabContent?.style.display === 'flex',
        cameraVisible: cameraTabContent?.style.display === 'none',
      };

      window.dispatchEvent(new CustomEvent('open-camera-control'));

      const afterCameraControl = {
        panelVisible: cameraControlsPanel?.style.display === 'block',
        lightVisible: lightTabContent?.style.display === 'none',
        cameraVisible: cameraTabContent?.style.display === 'flex',
      };

      window.dispatchEvent(new CustomEvent('create-new-scene'));
      const sceneComposerPanel = document.getElementById('sceneComposerPanel') as HTMLElement | null;
      const active = sceneComposerPanel?.style.display === 'block';

      return {
        afterLightControl,
        afterCameraControl,
        sceneComposerVisible: active,
      };
    });

    expect(state.afterLightControl.panelVisible).toBe(true);
    expect(state.afterLightControl.lightVisible).toBe(true);
    expect(state.afterLightControl.cameraVisible).toBe(true);
    expect(state.afterCameraControl.panelVisible).toBe(true);
    expect(state.afterCameraControl.lightVisible).toBe(true);
    expect(state.afterCameraControl.cameraVisible).toBe(true);
    expect(state.sceneComposerVisible).toBe(true);
  });

  test('opens the panel creator from the legacy event bridge', async ({ page }) => {
    const panelCreatorShell = page.getByTestId('panel-creator-shell');
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_panelCreator === true, { timeout: 30_000 });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-panel-creator'));
    });

    await expect(page.locator('#aiAssistantPanel')).toHaveClass(/open/);
    await expect(panelCreatorShell).toHaveAttribute('data-panel-list-open', 'true');
    await expect(panelCreatorShell).toHaveAttribute('data-dialog-open', 'true');
  });

  test('toggles the notes panel through the legacy event bridge', async ({ page }) => {
    const notesShell = page.getByTestId('notes-panel-shell');
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_notesPanel === true, { timeout: 30_000 });

    await expect(notesShell).toHaveAttribute('data-open', 'false');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('toggle-notes-panel'));
    });
    await expect(notesShell).toHaveAttribute('data-open', 'true');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('toggle-notes-panel'));
    });
    await expect(notesShell).toHaveAttribute('data-open', 'false');
  });

});
