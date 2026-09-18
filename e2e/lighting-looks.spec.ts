import { test, expect } from '@playwright/test';

/**
 * Lighting by naming the place.
 *
 * The light panel could always build any rig, provided you knew what a key, a
 * fill and a ratio were. A look is the same rig asked for the way anyone would
 * ask: a kitchen at dinner, a street at night. What it leaves behind is
 * ordinary fixtures, so the panel still edits them afterwards.
 */
test.use({ video: 'off' });

/**
 * Applying a look rebuilds the whole rig: four fixtures, each loading its
 * stand and taking every mesh in the room as a shadow caster. Under software
 * WebGL that is slow — it ran inside a minute on its own and needed longer as
 * the fourth suite in a loaded run. This is a correctness suite, not a
 * performance measurement, so it waits rather than reporting a false failure.
 */
const LOOK_TIMEOUT = 180_000;

test('lighting can be chosen as a place, and stays editable afterwards', async ({ page }, testInfo) => {
  test.setTimeout(480_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); console.log('Browser error:', error.message); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  if (process.env.PLAYWRIGHT_SOFTWARE_GL === '1') {
    await page.waitForFunction(() => !!(window as any).virtualStudio?.engine);
    await page.evaluate(() => (window as any).virtualStudio.engine.setHardwareScalingLevel(2));
  }
  await page.waitForFunction(() => {
    const s = (window as any).virtualStudio;
    return s?.workspace && s.characterModelId && s.lights.size >= 3;
  }, undefined, { timeout: 120_000 });

  const panel = page.locator('.studio-sequence-panel');
  const looks = panel.locator('button[data-look]');
  await expect(looks).toHaveCount(await page.evaluate(
    () => (window as any).virtualStudio.availableLooks().length));

  // The buttons name places, and every one explains itself to someone who does
  // not know what a key light is.
  const unexplained = await looks.evaluateAll(all =>
    all.filter(b => !(b as HTMLElement).title || (b as HTMLElement).title.length < 20).length);
  expect(unexplained).toBe(0);

  // The studio starts in the look it always had.
  expect(await page.evaluate(() => (window as any).virtualStudio.currentLook())).toBe('studio-portrett');
  await expect(panel.locator('button[data-look="studio-portrett"]')).toHaveAttribute('aria-pressed', 'true');
  const rig = () => page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const exposure = s.scene.imageProcessingConfiguration.exposure;
    return [...s.lights.values()].map((d: any) => ({
      name: d.name,
      power: d.powerMultiplier,
      rendered: d.light.intensity * exposure,
      // Warmer light is redder than it is blue; this is how a look reads as a
      // place at all.
      warmth: d.light.diffuse.r / d.light.diffuse.b,
    }));
  });

  const studio = await rig();
  expect(studio.map(l => l.name).sort()).toEqual(
    ['Hovedlys · Softbox', 'Kantlys · Stripbox', 'Utfylling · Softbox']);
  // Daylight: red and blue within a hair of each other.
  expect(Math.abs(studio[0].warmth - 1)).toBeLessThan(0.35);

  // The places are grouped behind summaries, and the group the scene is
  // already in is the one that stands open.
  await expect(panel.locator('.studio-move-group[data-look-group="studio"]')).toHaveAttribute('open', '');
  await expect(panel.locator('button[data-look="kjokken-middag"]')).toBeHidden();

  // Asking for a kitchen at dinner replaces the rig, rather than adding to it.
  await panel.locator('.studio-move-group[data-look-group="rom"] summary').click();
  await panel.locator('button[data-look="kjokken-middag"]').click();
  await expect(panel.locator('.studio-look-status')).toHaveText('Kjøkken · middag', { timeout: LOOK_TIMEOUT });
  await expect(panel.locator('button[data-look="kjokken-middag"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('button[data-look="studio-portrett"]')).toHaveAttribute('aria-pressed', 'false');

  const kitchen = await rig();
  expect(kitchen).toHaveLength(4);
  expect(kitchen.map(l => l.name)).toContain('Stearinlys · på bordet');
  // Tungsten and candlelight: unmistakably warmer than the daylight rig.
  expect(kitchen[0].warmth).toBeGreaterThan(studio[0].warmth * 1.4);
  // And dimmer than the studio, because a kitchen at dinner is.
  const brightest = (r: typeof kitchen) => Math.max(...r.map(l => l.rendered));
  expect(brightest(kitchen)).toBeLessThan(brightest(studio));
  // No fixture is ever driven past its own output.
  for (const light of kitchen) expect(light.power).toBeLessThanOrEqual(1);

  await page.screenshot({ path: testInfo.outputPath('kitchen-dinner.png') });

  // A night street is darker again, and colder at the back.
  await panel.locator('.studio-move-group[data-look-group="ute"] summary').click();
  await panel.locator('button[data-look="gate-natt"]').click();
  await expect(panel.locator('.studio-look-status')).toHaveText('Gate · natt', { timeout: LOOK_TIMEOUT });
  const street = await rig();
  expect(brightest(street)).toBeLessThan(brightest(studio));
  expect(Math.min(...street.map(l => l.warmth))).toBeLessThan(1);

  // What a look leaves behind is ordinary fixtures: the light panel still
  // dims and re-aims them one at a time.
  const edited = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const [, data] = [...s.lights.entries()][0];
    const before = data.light.intensity * s.scene.imageProcessingConfiguration.exposure;
    // Halve whatever the look dialled this head to. An absolute number would
    // prove nothing: a look already runs its fixtures well under full output.
    data.powerMultiplier = data.powerMultiplier / 2;
    s.updateSceneBrightness();
    return { before, after: data.light.intensity * s.scene.imageProcessingConfiguration.exposure };
  });
  expect(edited.after).toBeCloseTo(edited.before / 2, 4);

  // Going back is one button, and it restores the rig the studio started with.
  await panel.locator('button[data-look="studio-portrett"]').click();
  await expect(panel.locator('.studio-look-status')).toHaveText('Studio · portrett', { timeout: LOOK_TIMEOUT });
  const restored = await rig();
  expect(restored.map(l => l.name).sort()).toEqual(studio.map(l => l.name).sort());
  for (let i = 0; i < restored.length; i++) {
    expect(restored[i].rendered).toBeCloseTo(studio[i].rendered, 4);
  }

  expect(errors).toEqual([]);
});
