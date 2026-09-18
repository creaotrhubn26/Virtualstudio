import { test, expect } from '@playwright/test';

/**
 * A place that belongs to someone.
 *
 * The pizzeria the studio builds is *a* pizzeria. Typing a name into one field
 * makes it theirs: the band over the pass, the mark on the brick, the poster
 * and the board on the pavement are all painted from the brand at build time,
 * and the sign is emissive, so the brand colour reaches the room as light.
 */
test.use({ video: 'off' });

const PLACE_TIMEOUT = 180_000;

test('a place takes a name, and the sign lights the room with it', async ({ page }, testInfo) => {
  test.setTimeout(600_000);
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

  // Go where the signs are.
  await panel.locator('button[data-location="pizzeria"]').click();
  await expect(panel.locator('.studio-location-status')).toHaveText('Pizzeria', { timeout: PLACE_TIMEOUT });

  /** The branded surfaces standing in the room, and what they are painted with. */
  const signs = () => page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const named = ['studioRoom_brandSign', 'studioRoom_brandLogo', 'studioRoom_brandPoster', 'studioRoom_brandBoard'];
    const found = named.map(name => {
      const mesh = s.scene.meshes.find((m: any) => m.name === name);
      const material = mesh?.material;
      return {
        name,
        standing: !!mesh,
        // Painted at runtime, so there is no file to fetch and no font to load.
        drawn: !!material?.albedoTexture,
        // A shop sign is a source, not a printed board.
        lit: !!material?.emissiveTexture,
      };
    });
    const glow = s.scene.lights.find((l: any) => l.name === 'studioRoom_practical_sign');
    return {
      found,
      glow: glow ? { on: glow.isEnabled(), r: glow.diffuse.r, b: glow.diffuse.b } : null,
      brand: s.currentBrand(),
    };
  });

  const before = await signs();
  for (const surface of before.found) {
    expect(surface.standing, surface.name).toBe(true);
    expect(surface.drawn, surface.name).toBe(true);
  }
  // The band, the mark and the board are lit from within; the poster is not.
  expect(before.found.find(s => s.name === 'studioRoom_brandSign')!.lit).toBe(true);
  expect(before.glow?.on).toBe(true);

  // Open the brand fields and put a name on the place.
  const brandGroup = panel.locator('.studio-brand-group');
  await expect(panel.locator('#studioBrandName')).toBeHidden();
  await brandGroup.locator('summary').click();
  await expect(panel.locator('#studioBrandName')).toBeVisible();
  expect(await panel.locator('#studioBrandName').inputValue()).toBe(before.brand.name);

  await panel.locator('#studioBrandName').fill('Holy Crust');
  await panel.locator('#studioBrandName').dispatchEvent('change');
  await panel.locator('#studioBrandTagline').fill('PIZZA · STREET FOOD · GOOD VIBES');
  await panel.locator('#studioBrandTagline').dispatchEvent('change');
  await panel.locator('#studioBrandSlogan').fill('HOT.\nFRESH.\nHOLY.');
  await panel.locator('#studioBrandSlogan').dispatchEvent('change');
  await panel.locator('#studioBrandAccent').fill('#e03a20');
  await panel.locator('#studioBrandAccent').dispatchEvent('change');

  await expect(panel.locator('.studio-brand-status')).toHaveText('Holy Crust står på skiltet.', { timeout: PLACE_TIMEOUT });

  const after = await signs();
  expect(after.brand.name).toBe('Holy Crust');
  expect(after.brand.tagline).toBe('PIZZA · STREET FOOD · GOOD VIBES');
  expect(after.brand.accent).toBe('#e03a20');
  // The room was rebuilt around the new name, signs and all.
  for (const surface of after.found) expect(surface.standing, surface.name).toBe(true);
  // A red brand throws red: more red than blue in what the sign gives back.
  expect(after.glow!.r).toBeGreaterThan(after.glow!.b);

  await page.locator('button[data-studio-view="camera"]').click();
  await page.screenshot({ path: testInfo.outputPath('branded-pizzeria.png') });

  // A name too long for a sign is cut, and the field says so rather than
  // disagreeing quietly with the wall.
  await panel.locator('#studioBrandName').fill('x'.repeat(60));
  await panel.locator('#studioBrandName').dispatchEvent('change');
  await expect(panel.locator('.studio-brand-status')).toContainText('står på skiltet', { timeout: PLACE_TIMEOUT });
  expect(await panel.locator('#studioBrandName').inputValue()).toHaveLength(28);

  await panel.locator('#studioBrandName').fill('Holy Crust');
  await panel.locator('#studioBrandName').dispatchEvent('change');
  await expect(panel.locator('.studio-brand-status')).toHaveText('Holy Crust står på skiltet.', { timeout: PLACE_TIMEOUT });

  // The brand is part of the document, so the place is still theirs tomorrow.
  const saved = await page.evaluate(() => {
    const preset = (window as any).virtualStudio.getCurrentSceneAsPreset();
    return preset.environment?.room?.brand ?? null;
  });
  expect(saved?.name).toBe('Holy Crust');
  expect(saved?.accent).toBe('#e03a20');

  expect(errors).toEqual([]);
});
