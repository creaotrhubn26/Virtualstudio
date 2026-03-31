/**
 * studio-health.spec.ts
 * Playwright regression suite for Virtual Studio.
 *
 * Bugs caught and fixed so far (all guarded by tests below):
 *   1. AutoFocusSystem fired face-detect log on every 150ms AF-C tick
 *   2. CinematicEvaluationPanel defaulted focalLength to 36 (not in Select options)
 *   3. 61 files imported @mui/material/GridLegacy (deprecated)
 *   4. 59 files used xs/sm/md/lg/xl props removed in Grid v2
 *   5. AutoFocusSystem logged "No character-sized meshes found" every tick
 *
 * Architecture: the console-audit describe block shares one page load
 * (beforeAll) so all four assertions run in ~8–10 s total.
 */

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// ─── shared page load ────────────────────────────────────────────────────────

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
    // 10 s: lets the studio, AutoFocusSystem, and all React components settle.
    await sharedPage.waitForTimeout(10_000);
  });

  test.afterAll(async () => {
    await sharedPage.close();
    await sharedContext.close();
  });

  // ── Bug #3 / #4 ────────────────────────────────────────────────────────────
  test('MUI deprecated GridLegacy is not used', () => {
    const gridLegacy = collectedWarnings.filter((w) => w.includes('GridLegacy'));
    expect(
      gridLegacy,
      `MUI GridLegacy (deprecated) is still in use:\n${gridLegacy.join('\n')}`,
    ).toHaveLength(0);
  });

  test('MUI Grid v2 xs/sm/md/lg/xl props are not used (size prop required)', () => {
    const bpWarnings = collectedWarnings.filter((w) =>
      /MUI Grid:.*`(xs|sm|md|lg|xl)` prop has been removed/.test(w),
    );
    expect(
      bpWarnings,
      `MUI Grid v2 breakpoint-prop warnings detected — use size={{...}} instead:\n${bpWarnings.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── Bug #2 ─────────────────────────────────────────────────────────────────
  test('MUI select components have no out-of-range value warnings', () => {
    const outOfRange = collectedWarnings.filter((w) => w.includes('out-of-range value'));
    expect(
      outOfRange,
      `MUI out-of-range warnings — a Select default is not in its options:\n${outOfRange.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── Bug #1 ─────────────────────────────────────────────────────────────────
  test('AutoFocusSystem does not spam face-detection logs on every tick', () => {
    const faceDetect = collectedLogs.filter((l) =>
      l.includes('[AutoFocusSystem]') && l.includes('Auto-detected face'),
    );
    expect(
      faceDetect.length,
      `Face-detection logged ${faceDetect.length} times — per-interval spam.\n${faceDetect.slice(0, 3).join('\n')}`,
    ).toBeLessThanOrEqual(5);
  });

  // ── Bug #5 ─────────────────────────────────────────────────────────────────
  test('AutoFocusSystem does not spam "No character-sized meshes" on every tick', () => {
    const noMesh = collectedLogs.filter((l) =>
      l.includes('[AutoFocusSystem]') && l.includes('No character-sized meshes'),
    );
    // Should fire at most once (at startup, before models load).
    expect(
      noMesh.length,
      `"No character-sized meshes" logged ${noMesh.length} times — per-interval spam.`,
    ).toBeLessThanOrEqual(1);
  });

  // ── General JS health ──────────────────────────────────────────────────────
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
});

// ─── UI structure (separate navigation each) ─────────────────────────────────

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

  test('backend API health endpoint responds 200', async ({ request }) => {
    const resp = await request.get('http://127.0.0.1:8000/api/ml/health');
    expect(resp.status(), 'Backend /api/ml/health should return 200').toBe(200);
  });

  test('default lights are loaded after studio setup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(10_000);

    const lightCount = await page.evaluate(() => {
      const s = (window as any).virtualStudio;
      return s?.lights?.size ?? -1;
    });

    if (lightCount === -1) {
      // Studio didn't initialize (SW-renderer headless) — skip gracefully
      test.skip();
      return;
    }

    expect(lightCount, 'Expected at least 1 default light after setup').toBeGreaterThan(0);
  });
});
