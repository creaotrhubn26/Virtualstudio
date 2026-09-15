import { test, expect } from '@playwright/test';

/**
 * Anything on set can be taken hold of, moved, and saved.
 *
 * The portrait chair is the hard case and the reason this exists: the studio
 * derives it from the seated pose and moves it under the figure every frame.
 * Claiming it has to end that tracking, or the document would own where it
 * stands while the studio kept putting it back.
 */
test.use({ video: 'off' });

test('a studio object can be claimed, moved and saved', async ({ page }, testInfo) => {
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

  // Sitting the figure down is what makes the studio derive a chair.
  await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    s.applyStudioPose('StudioSeated');
    for (let i = 0; i < 6; i++) await new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
  });

  // The chair offers itself by a stable key, not by its Babylon name, which
  // carries the figure's unique id and differs every session.
  const offered = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    return s.studioProps().claimable();
  });
  expect(offered.map((o: any) => o.key)).toContain('portraitChair');
  expect(offered.find((o: any) => o.key === 'portraitChair').claimed).toBe(false);

  const claimed = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    const prop = s.claimStudioObject('portraitChair', 'Portrettstol');
    const node = s.scene.transformNodes.find((n: any) => n.metadata?.studioObjectKey === 'portraitChair');

    // Once claimed, the studio must stop dragging it back under the figure.
    const before = node.position.asArray();
    node.position.x += 0.6;
    node.position.z += 0.35;
    for (let i = 0; i < 4; i++) await settle();
    const after = node.position.asArray();

    return {
      prop, before, after,
      claimedNow: s.studioProps().claimable().find((o: any) => o.key === 'portraitChair').claimed,
      released: [...s.studioSeats.values()].every((seat: any) => seat.isReleased),
      selected: s.studioProps().selected,
    };
  });
  expect(claimed.prop.source).toEqual({ kind: 'scene', mesh: 'portraitChair' });
  expect(claimed.prop.name).toBe('Portrettstol');
  expect(claimed.claimedNow).toBe(true);
  expect(claimed.released).toBe(true);
  // The move stuck: the seat controller is no longer overwriting it.
  expect(claimed.after[0]).toBeCloseTo(claimed.before[0] + 0.6, 4);
  expect(claimed.after[2]).toBeCloseTo(claimed.before[2] + 0.35, 4);

  await page.screenshot({ path: testInfo.outputPath('claimed-chair.png') });

  // Picking the chair in the viewport selects the prop it belongs to, even
  // though the mesh picked is a child several levels down.
  const picked = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const mesh = s.scene.meshes.find((m: any) => m.metadata?.studioPropId);
    return { propId: mesh?.metadata?.studioPropId ?? null, pickable: mesh?.isPickable ?? false };
  });
  expect(picked.propId).toBe(claimed.prop.id);
  expect(picked.pickable).toBe(true);

  // A claimed object travels in the document as a key and a transform, not as
  // geometry, and comes back where it was left.
  const roundTrip = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    const saved = s.getCurrentSceneAsPreset();
    const stored = saved.studioProps;

    await s.applyScenePreset(JSON.parse(JSON.stringify(saved)));
    for (let i = 0; i < 12; i++) await settle();

    const node = s.scene.transformNodes.find((n: any) => n.metadata?.studioObjectKey === 'portraitChair');
    return {
      stored,
      props: s.studioProps().props,
      position: node ? node.position.asArray() : null,
      stillReleased: [...s.studioSeats.values()].every((seat: any) => seat.isReleased),
    };
  });
  expect(roundTrip.stored).toHaveLength(1);
  expect(roundTrip.stored[0].source).toEqual({ kind: 'scene', mesh: 'portraitChair' });
  // The document carries no geometry for a claimed object.
  expect(JSON.stringify(roundTrip.stored[0])).not.toContain('positions');
  expect(roundTrip.props).toHaveLength(1);
  expect(roundTrip.position![0]).toBeCloseTo(claimed.after[0], 3);
  expect(roundTrip.position![2]).toBeCloseTo(claimed.after[2], 3);
  // And it is still the document's to move, not the studio's.
  expect(roundTrip.stillReleased).toBe(true);

  // Handing it back leaves the studio's own geometry alone.
  const released = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const props = s.studioProps();
    props.remove(props.props[0].id);
    const node = s.scene.transformNodes.find((n: any) => n.metadata?.studioObjectKey === 'portraitChair');
    return { count: props.props.length, chairStillThere: !!node, owner: node?.metadata?.studioPropId ?? null };
  });
  expect(released.count).toBe(0);
  expect(released.chairStillThere).toBe(true);
  expect(released.owner).toBeNull();

  expect(errors).toEqual([]);
});
