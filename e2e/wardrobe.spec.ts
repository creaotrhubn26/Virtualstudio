import { test, expect } from '@playwright/test';

/**
 * Wardrobe as a layer rather than something baked into the body.
 *
 * The figure has to open dressed, change clothes without leaving holes or
 * showing skin through a sleeve, carry its clothes through a pose, and open a
 * saved document wearing what it was cast in.
 */
test.use({ video: 'off' });

test('a figure dresses, changes clothes and keeps them through a pose', async ({ page }, testInfo) => {
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
  await page.waitForFunction(() => (window as any).virtualStudio.getCharacterWardrobe().length >= 2,
    undefined, { timeout: 60_000 });

  const dressed = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const garments = s.characterMesh.getChildMeshes()
      .filter((m: any) => m.metadata?.studioGarment)
      .map((m: any) => ({ id: m.metadata.studioGarment, slot: m.metadata.studioGarmentSlot, triangles: m.getIndices().length / 3 }));
    const skin = s.characterMesh.getChildMeshes().find((m: any) => m.name === 'Skin');
    return {
      wearing: s.getCharacterWardrobe(),
      garments,
      skinTriangles: skin.getIndices().length / 3,
      // Every garment must be driven by the body's own skeleton, or it would
      // stand still while the figure moves.
      sharesSkeleton: s.characterMesh.getChildMeshes()
        .filter((m: any) => m.metadata?.studioGarment)
        .every((m: any) => m.skeleton === skin.skeleton),
      // A garment brings a copy of the rig, which has to be thrown away: the
      // pose editor finds its joints by name.
      duplicateJoints: s.characterMesh.getChildTransformNodes()
        .filter((n: any) => n.name === 'mixamorigHead').length,
    };
  });

  // The body ships with no clothes of its own, so it must have been dressed.
  expect(dressed.wearing.length).toBe(2);
  expect(dressed.garments.map((g: any) => g.slot).sort()).toEqual(['outfit', 'shoes']);
  expect(dressed.garments.every((g: any) => g.triangles > 100)).toBe(true);
  expect(dressed.sharesSkeleton).toBe(true);
  expect(dressed.duplicateJoints).toBe(1);
  // The body is 26756 triangles before anything covers it; an outfit and a pair
  // of shoes take a real bite out of that, and the rest is still drawn.
  expect(dressed.skinTriangles).toBeGreaterThan(10000);
  expect(dressed.skinTriangles).toBeLessThan(20000);

  await page.screenshot({ path: testInfo.outputPath('wardrobe-default.png') });

  // Changing outfit swaps the garment and re-cuts the body underneath it.
  const options = await page.evaluate(() => (window as any).virtualStudio.getWardrobeOptions());
  const outfits = options.filter((o: any) => o.slot === 'outfit');
  expect(outfits.length).toBeGreaterThanOrEqual(3);
  const other = outfits.find((o: any) => !dressed.wearing.includes(o.id))!;

  const changed = await page.evaluate(async (id: string) => {
    const s = (window as any).virtualStudio;
    const shoes = s.getCharacterWardrobe().find((worn: string) => worn !== id && !worn.includes('suit'));
    await s.setCharacterWardrobe([id, shoes]);
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    for (let i = 0; i < 3; i++) await settle();
    const skin = s.characterMesh.getChildMeshes().find((m: any) => m.name === 'Skin');
    return {
      wearing: s.getCharacterWardrobe(),
      ids: s.characterMesh.getChildMeshes().filter((m: any) => m.metadata?.studioGarment)
        .map((m: any) => m.metadata.studioGarment),
      skinTriangles: skin.getIndices().length / 3,
    };
  }, other.id);
  expect(changed.wearing).toContain(other.id);
  expect(changed.wearing).not.toContain(dressed.wearing.find((w: string) => w.includes('suit')));
  // The old garment is gone from the scene, not merely hidden.
  expect(changed.ids.sort()).toEqual([...changed.wearing].sort());
  // A different outfit covers a different amount of body.
  expect(changed.skinTriangles).not.toBe(dressed.skinTriangles);
  expect(changed.skinTriangles).toBeGreaterThan(10000);

  await page.screenshot({ path: testInfo.outputPath('wardrobe-changed.png') });

  // Clothes follow the figure: sitting down has to move the outfit with it.
  const posed = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    const garment = s.characterMesh.getChildMeshes().find((m: any) => m.metadata?.studioGarmentSlot === 'outfit');
    const centre = () => {
      garment.computeWorldMatrix(true);
      garment.refreshBoundingInfo(true);
      return garment.getBoundingInfo().boundingBox.centerWorld.y;
    };
    s.applyStudioPose('StudioStand');
    for (let i = 0; i < 4; i++) await settle();
    const standing = centre();
    s.applyStudioPose('StudioSeated');
    for (let i = 0; i < 4; i++) await settle();
    const seated = centre();
    s.applyStudioPose('StudioStand');
    for (let i = 0; i < 4; i++) await settle();
    return { standing, seated };
  });
  expect(posed.seated).toBeLessThan(posed.standing - 0.05);

  // A saved document has to open with the figure in the same clothes.
  const roundTrip = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    const saved = s.getCurrentSceneAsPreset();
    const stored = saved.actors[0]?.userData?.wardrobe;
    await s.applyScenePreset(JSON.parse(JSON.stringify(saved)));
    for (let i = 0; i < 10; i++) await settle();
    return { stored, wearing: s.getCharacterWardrobe() };
  });
  expect([...(roundTrip.stored ?? [])].sort()).toEqual([...changed.wearing].sort());
  expect([...roundTrip.wearing].sort()).toEqual([...changed.wearing].sort());

  expect(errors).toEqual([]);
});
