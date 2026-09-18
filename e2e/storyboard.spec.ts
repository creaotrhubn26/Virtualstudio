import { test, expect } from '@playwright/test';

/**
 * Explaining a scene to the person who has to be in it.
 *
 * Everything else in the studio makes a picture. This makes the thing you hand
 * to somebody: a numbered shot with a frame from the taking camera and one
 * sentence per person, in words they can act on without the director standing
 * next to them.
 *
 * The test follows the actual journey: set the scene somewhere, put people on
 * their marks, take a shot, tell each of them what to do, take a second shot,
 * and print the sheet — including the one sheet that goes to one extra.
 */
test.use({ video: 'off' });

const PLACE_TIMEOUT = 180_000;

test('a scene becomes shots, and shots become a sheet somebody can read', async ({ page }, testInfo) => {
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

  // Set the scene and staff it, which is what a shot is a shot *of*.
  await panel.locator('button[data-location="pizzeria"]').click();
  await expect(panel.locator('.studio-location-status')).toHaveText('Pizzeria', { timeout: PLACE_TIMEOUT });
  await panel.locator('[data-staff]').click();
  await expect(panel.locator('[data-staff]')).toContainText('på plass', { timeout: PLACE_TIMEOUT });

  // A shot captures the moment: where, how it is lit, the lens, and a frame.
  const first = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const shot = await s.captureShot('Oversikt over lokalet');
    return {
      number: shot.number,
      name: shot.name,
      locationId: shot.locationId,
      lookId: shot.lookId,
      focalLength: shot.camera.focalLength,
      hasFrame: typeof shot.frame === 'string' && shot.frame.startsWith('data:image'),
      // Everybody standing on a mark is listed, so nobody is forgotten.
      directions: shot.directions.map((d: any) => ({ markId: d.markId, who: d.who, action: d.action })),
    };
  });
  expect(first.number).toBe(1);
  expect(first.name).toBe('Oversikt over lokalet');
  expect(first.locationId).toBe('pizzeria');
  expect(first.lookId).toBe('pizzeria-kveld');
  expect(first.hasFrame).toBe(true);
  // A staffed pizzeria has people on marks; each becomes a line to fill in.
  expect(first.directions.length).toBeGreaterThanOrEqual(3);
  expect(first.directions.map(d => d.markId)).toContain('ovnen');
  // And they start empty, because nobody has been told anything yet.
  expect(first.directions.every(d => d.action === '')).toBe(true);

  // The panel says so, rather than letting an undirected person through.
  await expect(panel.locator('.studio-shot-warning')).toContainText('mangler beskjed');

  // Tell each of them what to do.
  const directed = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    s.directShot(1, 'ovnen', 'Du skyver pizzaen inn i ovnen og ser etter den.');
    s.directShot(1, 'disken', 'Du tørker av disken og ser opp mot døra.');
    for (const mark of s.storyboard().shots[0].directions) {
      if (!mark.action) s.directShot(1, mark.markId, 'Du står stille og ser mot bordet.');
    }
    return s.storyboard().shots[0].directions.map((d: any) => d.action);
  });
  expect(directed.every(action => action.length > 8)).toBe(true);
  await expect(panel.locator('.studio-shot-warning')).toHaveCount(0);

  // A second shot: a different lens on the same scene.
  const second = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    s.setFocalLength(85);
    const shot = await s.captureShot('Nært på hendene');
    s.directShot(shot.number, 'ovnen', 'Du trekker spaden ut i én rolig bevegelse.');
    return { number: shot.number, focalLength: shot.camera.focalLength, shots: s.storyboard().shots.length };
  });
  expect(second.number).toBe(2);
  expect(second.focalLength).toBe(85);
  expect(second.shots).toBe(2);

  await page.screenshot({ path: testInfo.outputPath('storyboard-panel.png') });

  // The board, for the director: every shot, in order, with both frames.
  const board = await page.evaluate(() => (window as any).virtualStudio.boardSheetHtml());
  expect(board).toContain('Opptak 1');
  expect(board).toContain('Opptak 2');
  expect(board).toContain('Du skyver pizzaen inn i ovnen');
  expect(board).toContain('85 mm');
  expect(board).toContain('data:image');

  // One person's sheet: their shots, their lines, and not anybody else's.
  const baker = await page.evaluate(() => (window as any).virtualStudio.personSheetHtml('ovnen'));
  expect(baker).toContain('Du trekker spaden ut i én rolig bevegelse.');
  expect(baker).not.toContain('Du tørker av disken');

  // The board is part of the document, so the plan survives being reopened.
  const saved = await page.evaluate(() => {
    const preset = (window as any).virtualStudio.getCurrentSceneAsPreset();
    return {
      shots: preset.storyboard?.shots?.length ?? 0,
      // Frames are megabytes; the plan is not carried around by them.
      carriesFrames: JSON.stringify(preset.storyboard ?? {}).includes('data:image'),
      firstAction: preset.storyboard?.shots?.[0]?.directions?.[0]?.action ?? null,
    };
  });
  expect(saved.shots).toBe(2);
  expect(saved.carriesFrames).toBe(false);
  expect(saved.firstAction).toContain('Du ');

  expect(errors).toEqual([]);
});
