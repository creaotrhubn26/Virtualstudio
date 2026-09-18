import { test, expect } from '@playwright/test';

/**
 * Nothing on the right edge lands on top of anything else.
 *
 * The environment panel, the camera preview and the moves panel were each
 * positioned against the same corner independently, and every content change
 * was one step away from one of them covering another — which is how the
 * preview ended up swallowing every click meant for the move buttons. They now
 * share one column, and this is the check that keeps them there.
 */
test.use({ video: 'off' });

const SIZES = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet landscape', width: 1024, height: 768 },
  { name: 'tablet portrait', width: 820, height: 1180 },
];

test('the panels never cover each other', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as any).virtualStudio?.workspace, undefined, { timeout: 120_000 });

  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.locator('button[data-studio-view="studio"]').click();

    const overlaps = await page.evaluate(() => {
      const names = [
        '.studio-environment-panel',
        '.studio-camera-preview',
        '.studio-view-toolbar',
        '.studio-sequence-panel',
        '.studio-model-panel:not(.studio-environment-panel)',
      ];
      const rects = names.map(name => ({ name, box: document.querySelector(name)!.getBoundingClientRect() }));
      const hits: string[] = [];
      rects.forEach((a, i) => rects.slice(i + 1).forEach(b => {
        if (a.box.left < b.box.right && a.box.right > b.box.left
          && a.box.top < b.box.bottom && a.box.bottom > b.box.top) hits.push(`${a.name} over ${b.name}`);
      }));
      // Nothing may be pushed off the top of the column either: content above
      // a scroll container's start edge cannot be scrolled back into view.
      const rail = document.querySelector('.studio-right-rail')!;
      const railBox = rail.getBoundingClientRect();
      const above = [...rail.children].filter(child =>
        child.getBoundingClientRect().top < railBox.top - 1).map(child => child.className);
      return { hits, above };
    });

    expect(overlaps.hits, size.name).toEqual([]);
    expect(overlaps.above, size.name).toEqual([]);

    // And what the panel offers at rest — a summary per group — is reachable
    // at every width, scrolling the panel if it must.
    const groups = page.locator('.studio-sequence-panel .studio-move-group > summary');
    const count = await groups.count();
    expect(count, size.name).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < count; i++) {
      await groups.nth(i).scrollIntoViewIfNeeded();
      await expect(groups.nth(i), `${size.name} group ${i}`).toBeVisible();
    }
  }

  expect(errors).toEqual([]);
});
