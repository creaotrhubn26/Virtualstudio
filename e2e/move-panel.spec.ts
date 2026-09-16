import { test, expect } from '@playwright/test';

/**
 * Naming a move instead of writing keyframes.
 *
 * A button says what should happen in the words a crew already uses, and adds
 * a beat to the sequence that can be moved, muted or removed afterwards. The
 * detailed timeline edits the very same thing, so nothing has to be rebuilt to
 * go from the simple way in to the precise one.
 */
test.use({ video: 'off' });

test('a named move becomes a beat in the sequence', async ({ page }, testInfo) => {
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
    return s?.workspace && s.characterModelId && s.characterKeyboardState.poseLocked;
  }, undefined, { timeout: 120_000 });

  const panel = page.locator('.studio-sequence-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Ingen bevegelser ennå. Velg en over.')).toBeVisible();

  // Every button carries a plain explanation for anyone who does not know the
  // word, which is the whole point of naming moves rather than keyframes.
  const buttons = panel.locator('.studio-move-buttons button');
  expect(await buttons.count()).toBeGreaterThanOrEqual(16);
  // Camera moves are the common case and are open; everything else waits to
  // be asked for, so the panel opens as a handful of questions, not a wall.
  await expect(panel.locator('.studio-move-group[data-kind="camera"]')).toHaveAttribute('open', '');
  const withoutHint = await buttons.evaluateAll(all =>
    all.filter(button => !(button as HTMLElement).title || (button as HTMLElement).title.length < 9).length);
  expect(withoutHint).toBe(0);

  // Pressing one adds a beat, and it does what its name says: a dolly brings
  // the camera closer to what it is looking at.
  const shot = () => page.evaluate(() => {
    const s = (window as any).virtualStudio;
    return s.camera.position.subtract(s.camera.target).length();
  });
  const before = await shot();

  await panel.getByRole('button', { name: 'Dolly inn', exact: true }).click();
  await expect(panel.locator('.studio-sequence-list li')).toHaveCount(1);
  await expect(panel.locator('.studio-cue-name')).toHaveText('Dolly inn');

  const played = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    s.applyAnimationAtTime(3);
    return s.camera.position.subtract(s.camera.target).length();
  });
  expect(played).toBeLessThan(before - 0.2);

  // A second move joins the sequence rather than replacing the first. Light
  // moves live behind their own summary, so opening it is part of the journey.
  const lightGroup = panel.locator('.studio-move-group[data-kind="light"]');
  await expect(lightGroup.getByRole('button', { name: 'Flimre', exact: true })).toBeHidden();
  await lightGroup.locator('summary').click();
  await panel.getByRole('button', { name: 'Flimre', exact: true }).click();
  await expect(panel.locator('.studio-sequence-list li')).toHaveCount(2);

  await page.screenshot({ path: testInfo.outputPath('move-panel.png') });

  // The photographer says when: moving a beat carries everything in it.
  const cue = (name: string) => page.evaluate(
    (wanted: string) => (window as any).virtualStudio.sequence().find((c: any) => c.name === wanted),
    name);
  const dolly = panel.locator('.studio-sequence-list li', { hasText: 'Dolly inn' });
  await dolly.locator('input[type="number"]').fill('4');
  await dolly.locator('input[type="number"]').dispatchEvent('change');
  expect((await cue('Dolly inn')).start).toBe(4);
  // And the sequence is long enough to contain what was just placed in it.
  expect(await page.evaluate(() => (window as any).virtualStudio.animationState.duration))
    .toBeGreaterThanOrEqual(7);
  // The list reads in playing order, so the retimed beat is now the later one.
  await expect(panel.locator('.studio-cue-name')).toHaveText(['Flimre', 'Dolly inn']);

  // A beat can be muted while the rest is worked on, and brought back.
  await dolly.getByRole('button', { name: 'På' }).click();
  await expect(dolly).toHaveClass(/muted/);
  expect((await cue('Dolly inn')).enabled).toBe(false);
  await dolly.getByRole('button', { name: 'Av' }).click();
  expect((await cue('Dolly inn')).enabled).toBe(true);

  // What the buttons build is an ordinary part of the document.
  const saved = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const preset = s.getCurrentSceneAsPreset();
    return { cues: preset.animation.cues.length, names: preset.animation.cues.map((c: any) => c.name) };
  });
  expect(saved.cues).toBe(2);
  expect(saved.names.sort()).toEqual(['Dolly inn', 'Flimre']);

  // Removing a beat takes it out of the sequence and out of the document.
  await dolly.getByRole('button', { name: 'Fjern' }).click();
  await expect(panel.locator('.studio-sequence-list li')).toHaveCount(1);
  expect(await cue('Dolly inn')).toBeUndefined();

  expect(errors).toEqual([]);
});
