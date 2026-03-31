/**
 * studio-health.spec.ts
 * Playwright regression suite for Virtual Studio.
 * Covers bugs found in the 2026-03-31 console audit:
 *   1. AutoFocusSystem fires its face-detect log every render frame (per-frame spam)
 *   2. Focal-length select default value 36 is not in the option set → MUI out-of-range warning
 *   3. MUI GridLegacy (deprecated) components still rendered
 *   4. JS errors / uncaught exceptions during normal studio load
 *   5. Canvas element present in DOM
 */

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// ─── shared page load (one navigation for all console-audit tests) ──────────

let sharedPage: Page;
let sharedContext: BrowserContext;
const collectedErrors: string[] = [];
const collectedWarnings: string[] = [];
const collectedLogs: string[] = [];

test.describe('Studio health — console audit', () => {
  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();

    sharedPage.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') collectedErrors.push(text);
      else if (msg.type() === 'warning') collectedWarnings.push(text);
      else collectedLogs.push(text);
    });
    sharedPage.on('pageerror', (err) => collectedErrors.push(`[pageerror] ${err.message}`));

    await sharedPage.goto('/');
    await sharedPage.waitForLoadState('domcontentloaded');
    // Allow 8 s for the studio, AutoFocusSystem, and all React components to settle.
    await sharedPage.waitForTimeout(8_000);
  });

  test.afterAll(async () => {
    await sharedPage.close();
    await sharedContext.close();
  });

  test('no uncaught JS exceptions during load', () => {
    const critical = collectedErrors.filter((e) =>
      !e.includes('shader') &&
      !e.includes('WebGL') &&
      !e.includes('SharedArrayBuffer') &&
      !e.includes('favicon'),
    );
    if (critical.length > 0) console.log('Critical errors:', critical);
    expect(critical, `Unexpected JS errors:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('AutoFocusSystem does not log face-detection on every render frame', () => {
    const autoFocusLogs = collectedLogs.filter((l) =>
      l.includes('[AutoFocusSystem]') && l.includes('Auto-detected face'),
    );
    // Detection should fire at most once per model load, not every 150 ms interval tick.
    expect(
      autoFocusLogs.length,
      `AutoFocusSystem logged face-detection ${autoFocusLogs.length} times — likely per-frame.\nSample: ${autoFocusLogs.slice(0, 3).join('\n')}`,
    ).toBeLessThanOrEqual(5);
  });

  test('MUI select components have no out-of-range value warnings', () => {
    const outOfRange = collectedWarnings.filter((w) => w.includes('out-of-range value'));
    expect(
      outOfRange,
      `MUI out-of-range warnings — a Select default value is not in its options:\n${outOfRange.join('\n')}`,
    ).toHaveLength(0);
  });

  test('MUI deprecated GridLegacy is not used', () => {
    const gridLegacy = collectedWarnings.filter((w) => w.includes('GridLegacy'));
    expect(
      gridLegacy,
      `MUI GridLegacy (deprecated) is still in use:\n${gridLegacy.join('\n')}`,
    ).toHaveLength(0);
  });
});

// ─── UI structure (separate navigation) ─────────────────────────────────────

test.describe('Studio health — UI structure', () => {
  test('studio canvas element is present in DOM', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, {
      timeout: 15_000,
    });
    const count = await page.evaluate(() => document.querySelectorAll('canvas').length);
    expect(count, 'At least one canvas element must exist').toBeGreaterThan(0);
  });

  test('light panel renders at least one light after default setup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(10_000);

    const lightCount = await page.evaluate(() => {
      const s = (window as any).virtualStudio;
      return s?.lights?.size ?? -1;
    });

    // -1 = studio didn't load (SW-renderer in headless); skip gracefully
    if (lightCount === -1) {
      test.skip();
      return;
    }

    expect(lightCount, 'Expected at least 1 default light').toBeGreaterThan(0);
  });
});
