import { expect, test, type Page } from '@playwright/test';

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioRuntimeReady?.ready), { timeout: 90_000 });
  await page.waitForFunction(() => (window as any).__virtualStudioPanelEventBridgeReady === true, { timeout: 90_000 });
}

test.describe('Modern Panel Open Events', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudio(page);
  });

  test('opens studio library tabs through the modern tab event', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
        detail: { tab: 'assets' },
      }));
      const afterAssets = {
        panelOpen: document.getElementById('actorBottomPanel')?.classList.contains('open') ?? false,
        activeTab: document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null,
        activeContent: document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null,
      };

      window.dispatchEvent(new CustomEvent('vs-open-studio-library-tab', {
        detail: { tab: 'hdri' },
      }));
      const afterHdri = {
        activeTab: document.querySelector('.actor-tab.active')?.getAttribute('data-tab') ?? null,
        activeContent: document.querySelector('.tab-content.active')?.getAttribute('data-content') ?? null,
      };

      return { afterAssets, afterHdri };
    });

    expect(result.afterAssets.panelOpen).toBe(true);
    expect(result.afterAssets.activeTab).toBe('assets');
    expect(result.afterAssets.activeContent).toBe('assets');
    expect(result.afterHdri.activeTab).toBe('hdri');
    expect(result.afterHdri.activeContent).toBe('hdri');
  });

  test('opens camera controls tabs through the modern camera controls event', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-camera-controls-tab', {
        detail: { tab: 'light' },
      }));

      const lightState = {
        panelVisible: (document.getElementById('cameraControlsPanel') as HTMLElement | null)?.style.display === 'block',
        lightVisible: (document.getElementById('lightTabContent') as HTMLElement | null)?.style.display === 'flex',
        cameraVisible: (document.getElementById('cameraTabContent') as HTMLElement | null)?.style.display === 'none',
      };

      window.dispatchEvent(new CustomEvent('vs-open-camera-controls-tab', {
        detail: { tab: 'camera' },
      }));

      const cameraState = {
        panelVisible: (document.getElementById('cameraControlsPanel') as HTMLElement | null)?.style.display === 'block',
        lightVisible: (document.getElementById('lightTabContent') as HTMLElement | null)?.style.display === 'none',
        cameraVisible: (document.getElementById('cameraTabContent') as HTMLElement | null)?.style.display === 'flex',
      };

      return { lightState, cameraState };
    });

    expect(result.lightState.panelVisible).toBe(true);
    expect(result.lightState.lightVisible).toBe(true);
    expect(result.lightState.cameraVisible).toBe(true);
    expect(result.cameraState.panelVisible).toBe(true);
    expect(result.cameraState.lightVisible).toBe(true);
    expect(result.cameraState.cameraVisible).toBe(true);
  });

  test('opens and closes studio library and scene hierarchy through explicit panel events', async ({ page }) => {
    const leftPanel = page.locator('.left-panel').first();

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-studio-library-panel'));
    });
    await expect(page.locator('#actorBottomPanel')).toHaveClass(/open/);
    await expect(page.locator('#actorPanelTrigger')).toHaveAttribute('aria-expanded', 'true');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-studio-library-panel'));
    });
    await expect(page.locator('#actorBottomPanel')).not.toHaveClass(/open/);
    await expect(page.locator('#actorPanelTrigger')).toHaveAttribute('aria-expanded', 'false');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-scene-hierarchy-panel'));
    });
    await expect(leftPanel).toHaveClass(/floating-open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-scene-hierarchy-panel'));
    });
    await expect(leftPanel).not.toHaveClass(/floating-open/);
  });

  test('opens the panel creator through the modern panel creator event', async ({ page }) => {
    const panelCreatorShell = page.getByTestId('panel-creator-shell');
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_panelCreator === true, { timeout: 30_000 });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-panel-creator'));
    });

    await expect(page.locator('#aiAssistantPanel')).toHaveClass(/open/);
    await expect(panelCreatorShell).toHaveAttribute('data-panel-list-open', 'true');
    await expect(panelCreatorShell).toHaveAttribute('data-dialog-open', 'true');
  });

  test('opens and closes the AI assistant and environment planner through explicit events', async ({ page }) => {
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_aiAssistant === true, { timeout: 30_000 });
    await page.waitForFunction(
      () => Boolean((window as any).__virtualStudioGlobalEnvironmentPlannerHost?.getSnapshot),
      { timeout: 30_000 },
    );

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-ai-assistant-panel'));
    });
    await expect(page.locator('#aiAssistantPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-ai-assistant-panel'));
    });
    await expect(page.locator('#aiAssistantPanel')).not.toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-ai-environment-planner'));
    });
    await page.waitForFunction(
      () => (window as any).__virtualStudioGlobalEnvironmentPlannerHost?.getSnapshot?.().plannerOpen === true,
      { timeout: 30_000 },
    );
    await expect(page.getByRole('heading', { name: 'Sett Opp Scene' })).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-ai-environment-planner'));
    });
    await page.waitForFunction(
      () => (window as any).__virtualStudioGlobalEnvironmentPlannerHost?.getSnapshot?.().plannerOpen === false,
      { timeout: 30_000 },
    );
    await expect(page.getByRole('heading', { name: 'Sett Opp Scene' })).not.toBeVisible();
  });

  test('opens and closes installed tool panels through the generic installed-tool events', async ({ page }) => {
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_aiAssistant === true, { timeout: 30_000 });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-installed-tool-panel', {
        detail: { toolId: 'plugin-ai-assistant' },
      }));
    });
    await expect(page.locator('#aiAssistantPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-installed-tool-panel', {
        detail: { toolId: 'plugin-ai-assistant' },
      }));
    });
    await expect(page.locator('#aiAssistantPanel')).not.toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-toggle-installed-tool-panel', {
        detail: { toolId: 'plugin-ai-assistant' },
      }));
    });
    await expect(page.locator('#aiAssistantPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-toggle-installed-tool-panel', {
        detail: { toolId: 'plugin-ai-assistant' },
      }));
    });
    await expect(page.locator('#aiAssistantPanel')).not.toHaveClass(/open/);
  });

  test('retains intentional user-toggle behavior for marketplace and AI assistant launchers', async ({ page }) => {
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_aiAssistant === true, { timeout: 30_000 });

    await page.evaluate(() => {
      (document.getElementById('marketplaceTrigger') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      (document.getElementById('marketplaceTrigger') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#marketplacePanel')).not.toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
    });
    await expect(page.locator('#aiAssistantPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
    });
    await expect(page.locator('#aiAssistantPanel')).not.toHaveClass(/open/);
  });

  test('opens and closes marketplace and help through explicit panel events', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-marketplace-panel'));
    });
    await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-marketplace-panel'));
    });
    await expect(page.locator('#marketplacePanel')).not.toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-help-panel'));
    });
    await expect(page.locator('#helpPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-help-panel'));
    });
    await expect(page.locator('#helpPanel')).not.toHaveClass(/open/);
  });

  test('opens and closes pro panels through explicit pro panel events', async ({ page }) => {
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_virtualStudioPro === true, { timeout: 30_000 });
    const proShell = page.getByTestId('virtual-studio-pro-shell');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-pro-panel', {
        detail: { panel: 'collaboration' },
      }));
    });
    await expect(proShell).toHaveAttribute('data-active-panel', 'collaboration');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-pro-panel', {
        detail: { panel: 'collaboration' },
      }));
    });
    await expect(proShell).toHaveAttribute('data-active-panel', '');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-pro-panel', {
        detail: { panel: 'particles' },
      }));
    });
    await expect(proShell).toHaveAttribute('data-active-panel', 'particles');
  });

  test('retains legacy toggle compatibility for pro panels', async ({ page }) => {
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_virtualStudioPro === true, { timeout: 30_000 });
    const proShell = page.getByTestId('virtual-studio-pro-shell');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('toggle-pro-panel', {
        detail: { panel: 'particles' },
      }));
    });
    await expect(proShell).toHaveAttribute('data-active-panel', 'particles');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('toggle-pro-panel', {
        detail: { panel: 'particles' },
      }));
    });
    await expect(proShell).toHaveAttribute('data-active-panel', '');
  });

  test('opens pro panels from the top-view pro menu without toggling them closed', async ({ page }) => {
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_virtualStudioPro === true, { timeout: 30_000 });
    const proShell = page.getByTestId('virtual-studio-pro-shell');

    await page.evaluate(() => {
      (document.getElementById('topviewProMenu') as HTMLElement | null)?.click();
      (document.querySelector('#topviewProDropdown .topview-pro-item[data-panel="particles"]') as HTMLElement | null)?.click();
    });
    await expect(proShell).toHaveAttribute('data-active-panel', 'particles');

    await page.evaluate(() => {
      (document.getElementById('topviewProMenu') as HTMLElement | null)?.click();
      (document.querySelector('#topviewProDropdown .topview-pro-item[data-panel="particles"]') as HTMLElement | null)?.click();
    });
    await expect(proShell).toHaveAttribute('data-active-panel', 'particles');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-pro-panel', {
        detail: { panel: 'particles' },
      }));
    });
    await expect(proShell).toHaveAttribute('data-active-panel', '');
  });

  test('opens help and marketplace from the secondary menu without toggling them closed', async ({ page }) => {
    await page.evaluate(() => {
      (document.getElementById('menuHjelp') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#helpPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      (document.getElementById('menuHjelp') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#helpPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-help-panel'));
    });
    await expect(page.locator('#helpPanel')).not.toHaveClass(/open/);

    await page.evaluate(() => {
      (document.getElementById('menuMarketplace') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      (document.getElementById('menuMarketplace') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-marketplace-panel'));
    });
    await expect(page.locator('#marketplacePanel')).not.toHaveClass(/open/);
  });

  test('opens marketplace from the user menu without toggling it closed', async ({ page }) => {
    await page.getByRole('button', { name: /Brukermeny/i }).click();
    await page.evaluate(() => {
      (document.getElementById('userMenuMarketplace') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);

    await page.getByRole('button', { name: /Brukermeny/i }).click();
    await page.evaluate(() => {
      (document.getElementById('userMenuMarketplace') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#marketplacePanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-marketplace-panel'));
    });
    await expect(page.locator('#marketplacePanel')).not.toHaveClass(/open/);
  });

  test('opens studio library and scene hierarchy from the secondary menu without toggling them closed', async ({ page }) => {
    const leftPanel = page.locator('.left-panel').first();

    await page.evaluate(() => {
      (document.getElementById('menuStudioLibrary') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#actorBottomPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      (document.getElementById('menuStudioLibrary') as HTMLElement | null)?.click();
    });
    await expect(page.locator('#actorBottomPanel')).toHaveClass(/open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-studio-library-panel'));
    });
    await expect(page.locator('#actorBottomPanel')).not.toHaveClass(/open/);

    await page.evaluate(() => {
      (document.getElementById('menuSceneHierarchy') as HTMLElement | null)?.click();
    });
    await expect(leftPanel).toHaveClass(/floating-open/);

    await page.evaluate(() => {
      (document.getElementById('menuSceneHierarchy') as HTMLElement | null)?.click();
    });
    await expect(leftPanel).toHaveClass(/floating-open/);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-scene-hierarchy-panel'));
    });
    await expect(leftPanel).not.toHaveClass(/floating-open/);
  });

  test('opens and closes the notes panel through explicit notes events', async ({ page }) => {
    const notesShell = page.getByTestId('notes-panel-shell');
    await page.waitForFunction(() => (window as any).__virtualStudioPanelReady_notesPanel === true, { timeout: 30_000 });

    await expect(notesShell).toHaveAttribute('data-open', 'false');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-open-notes-panel'));
    });
    await expect(notesShell).toHaveAttribute('data-open', 'true');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vs-close-notes-panel'));
    });
    await expect(notesShell).toHaveAttribute('data-open', 'false');
  });
});
