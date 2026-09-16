import { test, expect } from '@playwright/test';

/**
 * Setting the scene somewhere.
 *
 * A look could light a subject the way a kitchen lights one, but there was no
 * kitchen: the frame behind the figure stayed an industrial studio, which for
 * a training video is the difference between a scene and a lighting test. A
 * place brings its own room and the lighting that belongs to it, and leaves
 * both editable afterwards.
 */
test.use({ video: 'off' });

/** Building a room and relighting it is a lot of work under software WebGL. */
const PLACE_TIMEOUT = 180_000;

test('a scene can be set in a place, which brings its room and its light', async ({ page }, testInfo) => {
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
  const places = panel.locator('button[data-location]');
  await expect(places).toHaveCount(await page.evaluate(
    () => (window as any).virtualStudio.availableLocations().length));

  // Every place explains itself; nobody has to know what a cyclorama is.
  const unexplained = await places.evaluateAll(all =>
    all.filter(b => !(b as HTMLElement).title || (b as HTMLElement).title.length < 20).length);
  expect(unexplained).toBe(0);

  /** What is actually standing in the scene, and what is lighting it. */
  const scene = () => page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const root = s.scene.transformNodes.find((n: any) => /^studioRoom_/.test(n.name) && !n.parent);
    const meshes = root ? root.getChildMeshes() : [];
    return {
      room: s.studioRoom.getState().type,
      place: s.currentLocation(),
      look: s.currentLook(),
      rootName: root?.name ?? null,
      // Real geometry, not a backdrop image: count the triangles standing.
      surfaces: meshes.length,
      vertices: meshes.reduce((total: number, m: any) => total + m.getTotalVertices(), 0),
      practicals: s.scene.lights.filter((l: any) => /^studioRoom_practical/.test(l.name)).length,
      fixtures: [...s.lights.values()].map((d: any) => d.name),
    };
  });

  // The studio opens where it always did.
  const studio = await scene();
  expect(studio.room).toBe('industrial');
  expect(studio.place).toBe('studio');
  await expect(panel.locator('button[data-location="studio"]')).toHaveAttribute('aria-pressed', 'true');

  // A kitchen: walls, counter, window and table, lit the way a kitchen is.
  await panel.locator('button[data-location="kjokken"]').click();
  await expect(panel.locator('.studio-location-status')).toHaveText('Kjøkken', { timeout: PLACE_TIMEOUT });
  const kitchen = await scene();
  expect(kitchen.room).toBe('kitchen');
  expect(kitchen.rootName).toBe('studioRoom_kitchen');
  expect(kitchen.vertices).toBeGreaterThan(2000);
  expect(kitchen.practicals).toBeGreaterThan(0);
  // The place brought its own light, not the studio portrait rig.
  expect(kitchen.look).toBe('kjokken-morgen');
  expect(kitchen.fixtures).not.toEqual(studio.fixtures);
  await expect(panel.locator('button[data-location="studio"]')).toHaveAttribute('aria-pressed', 'false');

  await page.locator('button[data-studio-view="camera"]').click();
  await page.screenshot({ path: testInfo.outputPath('kitchen.png') });

  // A treatment room, for the case this was built for.
  await panel.locator('button[data-location="sykehusrom"]').click();
  await expect(panel.locator('.studio-location-status')).toHaveText('Sykehusrom', { timeout: PLACE_TIMEOUT });
  const ward = await scene();
  expect(ward.room).toBe('hospital');
  expect(ward.vertices).toBeGreaterThan(2000);
  expect(ward.look).toBe('sykehus');
  // The old room is gone rather than standing inside the new one.
  expect(ward.rootName).toBe('studioRoom_hospital');
  expect(await page.evaluate(() =>
    (window as any).virtualStudio.scene.transformNodes.filter((n: any) => /^studioRoom_/.test(n.name) && !n.parent).length))
    .toBe(1);
  await page.screenshot({ path: testInfo.outputPath('hospital.png') });

  // A pizzeria, with an oven that is alight and throwing warm light forward.
  await panel.locator('button[data-location="pizzeria"]').click();
  await expect(panel.locator('.studio-location-status')).toHaveText('Pizzeria', { timeout: PLACE_TIMEOUT });
  const pizzeria = await scene();
  expect(pizzeria.room).toBe('pizzeria');
  expect(pizzeria.vertices).toBeGreaterThan(2000);
  expect(pizzeria.look).toBe('pizzeria-kveld');
  const oven = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const light = s.scene.lights.find((l: any) => l.name === 'studioRoom_practical_oven');
    const fire = [...s.lights.values()].find((d: any) => d.name === 'Ovnen · motivert');
    return {
      lit: !!light && light.isEnabled(),
      // Firelight is orange: far more red than blue, in the practical and in
      // the fixture playing it.
      warmth: light ? light.diffuse.r / light.diffuse.b : 0,
      keyWarmth: fire ? fire.light.diffuse.r / fire.light.diffuse.b : 0,
    };
  });
  expect(oven.lit).toBe(true);
  expect(oven.warmth).toBeGreaterThan(2);
  expect(oven.keyWarmth).toBeGreaterThan(1.6);
  await page.screenshot({ path: testInfo.outputPath('pizzeria.png') });

  // The place is part of the document, and a reopened scene is in it.
  const saved = await page.evaluate(() => {
    const preset = (window as any).virtualStudio.getCurrentSceneAsPreset();
    return { room: preset.environment?.room?.type, lights: preset.lights.length };
  });
  expect(saved.room).toBe('pizzeria');
  expect(saved.lights).toBeGreaterThan(0);

  // An empty stage takes the room away again and leaves nothing behind.
  await panel.locator('button[data-location="tomt"]').click();
  await expect(panel.locator('.studio-location-status')).toHaveText('Åpent område', { timeout: PLACE_TIMEOUT });
  const empty = await scene();
  expect(empty.room).toBe('none');
  expect(empty.rootName).toBeNull();
  expect(empty.practicals).toBe(0);

  // And the room comes back when asked for.
  await panel.locator('button[data-location="kjokken"]').click();
  await expect(panel.locator('.studio-location-status')).toHaveText('Kjøkken', { timeout: PLACE_TIMEOUT });
  expect((await scene()).vertices).toBeGreaterThan(2000);

  expect(errors).toEqual([]);
});
