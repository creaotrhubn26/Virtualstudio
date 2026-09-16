import { test, expect } from '@playwright/test';

/**
 * Movement that survives being saved.
 *
 * The timeline could only ever move a light: `applyAnimationAtTime` looked its
 * target up in the light table and nothing else could be addressed, so an
 * arriving vehicle was not expressible. And none of it was written to the
 * document, so a scene that depended on movement did not survive reopening.
 */
test.use({ video: 'off' });

test('anything in the scene can be keyframed, and the timeline is saved', async ({ page }) => {
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

  // Claim the chair, so the thing being animated is a prop rather than a light.
  const setup = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    s.applyStudioPose('StudioSeated');
    for (let i = 0; i < 6; i++) await settle();
    const prop = s.claimStudioObject('portraitChair', 'Portrettstol');

    // An arrival: the chair comes in from across the room and sets down.
    s.animationState.duration = 5;
    s.animationState.tracks = [{
      id: 'chair-position', nodeId: prop.id, type: 'position',
      keyframes: [
        { time: 0, value: { x: -4, y: 0, z: -3 } },
        { time: 5, value: { x: 0.5, y: 0, z: 1 } },
      ],
    }, {
      id: 'chair-rotation', nodeId: prop.id, type: 'rotation',
      keyframes: [
        { time: 0, value: { x: 0, y: 0, z: 0 } },
        { time: 5, value: { x: 0, y: Math.PI / 2, z: 0 } },
      ],
    }];

    const node = s.studioProps().nodeFor(prop.id);
    const at = (time: number) => {
      s.applyAnimationAtTime(time);
      node.computeWorldMatrix(true);
      return { position: node.position.asArray(), rotationY: node.rotation.y };
    };
    return { propId: prop.id, start: at(0), middle: at(2.5), end: at(5), beyond: at(99) };
  });

  // A prop is driven by the timeline, which only lights could be before.
  expect(setup.start.position[0]).toBeCloseTo(-4, 6);
  expect(setup.end.position[0]).toBeCloseTo(0.5, 6);
  // Halfway through, halfway there.
  expect(setup.middle.position[0]).toBeCloseTo(-1.75, 6);
  expect(setup.middle.position[2]).toBeCloseTo(-1, 6);
  // Rotation is radians end to end: a quarter turn stays a quarter turn.
  expect(setup.end.rotationY).toBeCloseTo(Math.PI / 2, 6);
  expect(setup.middle.rotationY).toBeCloseTo(Math.PI / 4, 6);
  // Past the end it holds, rather than carrying on through the wall.
  expect(setup.beyond.position).toEqual(setup.end.position);

  // Keyframing from the interface used to demand a selected light, so nothing
  // else could be given a track even after the timeline learned to move
  // anything. Pressing it with a prop selected has to record that prop.
  const recorded = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    const props = s.studioProps();
    const propId = props.props[0].id;
    const node = props.nodeFor(propId);

    s.animationState.tracks = [];
    s.animationState.currentTime = 0;
    props.select(propId);
    s.selectedLightId = null;

    node.position.set(-2, 0, -1);
    node.rotation.set(0, Math.PI / 3, 0);
    s.addKeyframe('position');
    s.addKeyframe('rotation');

    s.animationState.currentTime = 4;
    node.position.set(1, 0, 2);
    s.addKeyframe('position');
    await settle();

    const tracks = s.animationState.tracks;
    // The rotation keyframe has to be in radians, like the rest of the scene:
    // this recorder stored degrees while the per-axis one stored radians.
    const rotation = tracks.find((t: any) => t.type === 'rotation');
    const position = tracks.find((t: any) => t.type === 'position');
    return {
      nodeIds: [...new Set(tracks.map((t: any) => t.nodeId))],
      propId,
      rotationY: rotation.keyframes[0].value.y,
      positionTimes: position.keyframes.map((k: any) => k.time),
      positionEnd: position.keyframes[1].value.x,
    };
  });
  expect(recorded.nodeIds).toEqual([recorded.propId]);
  expect(recorded.rotationY).toBeCloseTo(Math.PI / 3, 9);
  expect(recorded.positionTimes).toEqual([0, 4]);
  expect(recorded.positionEnd).toBeCloseTo(1, 9);

  // Put the hand-written track back for the round trip below.
  await page.evaluate((propId: string) => {
    const s = (window as any).virtualStudio;
    s.animationState.currentTime = 0;
    s.animationState.duration = 5;
    s.animationState.tracks = [{
      id: 'chair-position', nodeId: propId, type: 'position',
      keyframes: [
        { time: 0, value: { x: -4, y: 0, z: -3 } },
        { time: 5, value: { x: 0.5, y: 0, z: 1 } },
      ],
    }, {
      id: 'chair-rotation', nodeId: propId, type: 'rotation',
      keyframes: [
        { time: 0, value: { x: 0, y: 0, z: 0 } },
        { time: 5, value: { x: 0, y: Math.PI / 2, z: 0 } },
      ],
    }];
  }, recorded.propId);

  // The timeline travels with the document, and moves the same object when it
  // comes back.
  const roundTrip = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    const saved = s.getCurrentSceneAsPreset();
    const stored = saved.animation;

    s.animationState.tracks = [];
    s.animationState.duration = 1;
    await s.applyScenePreset(JSON.parse(JSON.stringify(saved)));
    for (let i = 0; i < 12; i++) await settle();

    const props = s.studioProps().props;
    const node = props.length > 0 ? s.studioProps().nodeFor(props[0].id) : null;
    const tracks = s.animationState.tracks;
    // The restored tracks have to address the prop this scene actually has.
    if (node) s.applyAnimationAtTime(5);
    return {
      stored,
      duration: s.animationState.duration,
      trackIds: tracks.map((t: any) => t.id),
      nodeIds: [...new Set(tracks.map((t: any) => t.nodeId))],
      propIds: props.map((p: any) => p.id),
      endPosition: node ? node.position.asArray() : null,
    };
  });
  expect(roundTrip.stored.tracks).toHaveLength(2);
  expect(roundTrip.stored.duration).toBe(5);
  expect(roundTrip.trackIds.sort()).toEqual(['chair-position', 'chair-rotation']);
  expect(roundTrip.duration).toBe(5);
  // The track still names the prop, and the prop still exists to be named.
  expect(roundTrip.nodeIds).toEqual([setup.propId]);
  expect(roundTrip.propIds).toEqual([setup.propId]);
  // And playing it to the end puts the object where it was told to go.
  expect(roundTrip.endPosition![0]).toBeCloseTo(0.5, 4);
  expect(roundTrip.endPosition![2]).toBeCloseTo(1, 4);

  // A document written before movement existed still opens.
  const legacy = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const saved = s.getCurrentSceneAsPreset();
    delete saved.animation;
    await s.applyScenePreset(JSON.parse(JSON.stringify(saved)));
    for (let i = 0; i < 8; i++) await new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    return { tracks: s.animationState.tracks.length };
  });
  expect(legacy.tracks).toBe(0);

  expect(errors).toEqual([]);
});
