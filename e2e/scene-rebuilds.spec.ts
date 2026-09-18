import { test, expect } from '@playwright/test';

/**
 * Asking for the next place before the last one is ready.
 *
 * Setting a place rebuilds the room and its lighting, and both take long
 * enough that a person can press the next button first. Overlapping rebuilds
 * each took their own snapshot of the rig to remove and each missed what the
 * other had added, so two quick presses left two rigs standing — and the page
 * froze outright once enough of them had piled up.
 */
test.use({ video: 'off' });

test('asking for three places at once leaves one studio, not three', async ({ page }) => {
  test.setTimeout(400_000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const s = (window as any).virtualStudio;
    return s?.workspace && s.characterModelId && s.characterKeyboardState?.poseLocked && s.lights.size >= 3;
  }, undefined, { timeout: 180_000 });

  const counts = async (label: string) => {
    const c = await page.evaluate(() => {
      const s = (window as any).virtualStudio;
      return { lights: s.lights.size, sceneLights: s.scene.lights.length, meshes: s.scene.meshes.length };
    });
    console.log('COUNT', label, JSON.stringify(c));
    return c;
  };
  await counts('ready');

  // Three place changes fired without waiting, the way a person clicking
  // quickly would.
  await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    await Promise.all([s.applyLocation('kjokken'), s.applyLocation('pizzeria'), s.applyLocation('studio')]);
  });
  await page.waitForTimeout(6000);
  const after = await counts('after three at once');
  expect(after.lights).toBeLessThanOrEqual(5);
});
