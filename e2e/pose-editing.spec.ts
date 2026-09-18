import { test, expect } from '@playwright/test';

/**
 * Constrained joint editing on the 53-joint rig.
 *
 * The three bundled clips stay the reset states, a joint cannot be driven past
 * what a body can do, the feet stay on the floor, and an edited pose survives a
 * save and reopen.
 */
test.use({ video: 'off' });

const DEG = Math.PI / 180;

test('joints move within their range, stay grounded and survive a round trip', async ({ page }, testInfo) => {
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
    // The studio is ready when the figure is posed *and* the rig is up:
    // lighting is built around the subject, so it comes after her.
    return s?.workspace && s.characterModelId && s.characterKeyboardState.poseLocked
      && s.lights.size >= 3;
  }, undefined, { timeout: 120_000 });

  // Joint limits are expressed as Rz·Ry·Rx, so read them back the same way;
  // yaw-pitch-roll would gimbal-lock a folded elbow to something else.
  await page.evaluate(() => {
    (window as any).jointAngles = (q: any) => {
      const pitch = Math.min(1, Math.max(-1, 2 * (q.w * q.y - q.z * q.x)));
      return {
        x: Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)),
        y: Math.asin(pitch),
        z: Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z)),
      };
    };
  });

  // The toggle in the model panel is the way in.
  await page.locator('#studioPoseEdit').check();
  await expect(page.locator('.studio-model-status')).toContainText('Klikk et ledd');

  const rig = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const editor = s.poseEditing;
    const jointHandles = s.scene.meshes.filter((m: any) => m.name.startsWith('poseHandle_'));
    const reachHandles = s.scene.meshes.filter((m: any) => m.name.startsWith('poseReach_'));
    const all = [...jointHandles, ...reachHandles];
    return {
      joints: editor.jointCount,
      limbs: editor.limbCount,
      handles: jointHandles.length,
      reachHandles: reachHandles.length,
      // Handles are editor furniture: they must never reach the shot or the preview.
      helperLayer: all.every((m: any) => m.layerMask === 0x10000000 && m.metadata?.studioHelper === true),
      pickable: all.every((m: any) => m.isPickable),
      visible: all.every((m: any) => m.isEnabled()),
    };
  });
  // Head, neck, three spine joints, two shoulder blades, two shoulders,
  // two elbows, two hands, two hips and two knees.
  expect(rig.joints).toBe(17);
  expect(rig.handles).toBe(17);
  expect(rig.limbs).toBe(4);
  expect(rig.reachHandles).toBe(4);
  expect(rig.helperLayer).toBe(true);
  expect(rig.pickable).toBe(true);
  expect(rig.visible).toBe(true);

  // Selecting a hinge must offer one ring, and a ball joint all three.
  const gizmoAxes = await page.evaluate(() => {
    const editor = (window as any).virtualStudio.poseEditing;
    const read = (id: string) => {
      editor.select(id);
      const g = (editor as any).gizmo;
      return { x: g.xGizmo.isEnabled, y: g.yGizmo.isEnabled, z: g.zGizmo.isEnabled, selected: editor.selectedJointId };
    };
    return { knee: read('leftKnee'), head: read('head') };
  });
  expect(gizmoAxes.knee).toEqual({ x: true, y: false, z: false, selected: 'leftKnee' });
  expect(gizmoAxes.head).toEqual({ x: true, y: true, z: true, selected: 'head' });

  // A joint driven past its range is clamped, not obeyed.
  const limits = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const editor = s.poseEditing;
    const node = (id: string) => s.characterMesh.getChildTransformNodes().find((n: any) => n.name === id);
    editor.setJointRotation('head', { x: 0, y: Math.PI, z: 0 });
    const head = (window as any).jointAngles(node('mixamorigHead').rotationQuaternion);
    editor.setJointRotation('leftElbow', { x: 0.8, y: 0.5, z: 0.5 });
    const elbow = (window as any).jointAngles(node('mixamorigLeftForeArm').rotationQuaternion);
    editor.setJointRotation('leftKnee', { x: 0.6, y: 0, z: 0 });
    const knee = (window as any).jointAngles(node('mixamorigLeftLeg').rotationQuaternion);
    return { head: { x: head.x, y: head.y, z: head.z }, elbow: { x: elbow.x, y: elbow.y, z: elbow.z }, knee: { x: knee.x, y: knee.y, z: knee.z } };
  });
  // The head turns 70°, not all the way round.
  expect(limits.head.y).toBeCloseTo(70 * DEG, 4);
  // An elbow cannot bend backwards, and has no sideways play at all.
  expect(limits.elbow.x).toBeCloseTo(0, 4);
  expect(limits.elbow.y).toBeCloseTo(0, 4);
  expect(limits.elbow.z).toBeCloseTo(0, 4);
  // A knee within range is obeyed exactly.
  expect(limits.knee.x).toBeCloseTo(0.6, 4);

  // A hand can be placed directly, with the limb solved behind it.
  const reach = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(r => s.scene.onAfterRenderObservable.addOnce(() => r(null)));
    const editor = s.poseEditing;
    s.applyStudioPose('StudioStand');
    for (let i = 0; i < 3; i++) await settle();

    const node = (id: string) => s.characterMesh.getChildTransformNodes().find((n: any) => n.name === id);
    const shoulder = node('mixamorigLeftArm');
    const elbow = node('mixamorigLeftForeArm');
    const hand = node('mixamorigLeftHand');
    const gap = (a: any, b: any) => a.absolutePosition.subtract(b.absolutePosition).length();
    const upper = gap(elbow, shoulder);
    const lower = gap(hand, elbow);

    // An easy target: hanging arm, hand brought a little forward and in.
    const p = shoulder.absolutePosition;
    const easy = { x: p.x, y: p.y - (upper + lower) * 0.75, z: p.z + (upper + lower) * 0.3 };
    editor.reachFor('leftArm');
    editor.reachTo('leftArm', easy);
    for (let i = 0; i < 3; i++) await settle();
    [shoulder, elbow, hand].forEach((n: any) => n.computeWorldMatrix(true));
    const easyHand = hand.absolutePosition;
    const easyMiss = Math.hypot(easyHand.x - easy.x, easyHand.y - easy.y, easyHand.z - easy.z);

    // A wide one: forward and up, far enough round that the shoulder's own
    // range starts to have a say.
    const target = { x: p.x, y: p.y - 0.1, z: p.z + (upper + lower) * 0.7 };
    editor.reachTo('leftArm', target);
    for (let i = 0; i < 3; i++) await settle();
    [shoulder, elbow, hand].forEach((n: any) => n.computeWorldMatrix(true));

    const reached = hand.absolutePosition;
    const out = {
      limbs: editor.limbCount,
      selected: editor.reachingLimbId,
      // The segments must keep their lengths: a solve that stretches the arm
      // has moved the skeleton rather than posed it.
      upperAfter: gap(elbow, shoulder),
      lowerAfter: gap(hand, elbow),
      upper, lower, easyMiss,
      missed: Math.hypot(reached.x - target.x, reached.y - target.y, reached.z - target.z),
      elbowBend: (window as any).jointAngles(elbow.rotationQuaternion).x,
    };

    // Out of reach: the hand stops at the arm's limit instead of detaching.
    const far = { x: p.x, y: p.y, z: p.z + 4 };
    editor.reachTo('leftArm', far);
    for (let i = 0; i < 3; i++) await settle();
    [shoulder, elbow, hand].forEach((n: any) => n.computeWorldMatrix(true));
    editor.reachFor(null);
    return { ...out, stretched: gap(hand, shoulder), span: upper + lower };
  });
  expect(reach.limbs).toBe(4);
  expect(reach.selected).toBe('leftArm');
  expect(reach.upperAfter).toBeCloseTo(reach.upper, 5);
  expect(reach.lowerAfter).toBeCloseTo(reach.lower, 5);
  // Both targets are inside what the arm can do, so the hand lands on them.
  // A solve that merely gets close would hide a rig assumption going wrong:
  // deriving the elbow angle analytically left the hand four centimetres out,
  // because this rig's hinge axis is not perpendicular to the limb.
  expect(reach.easyMiss).toBeLessThan(0.002);
  expect(reach.missed).toBeLessThan(0.002);
  // And the elbow it found is a real elbow: bent the way an elbow bends.
  expect(reach.elbowBend).toBeLessThanOrEqual(1e-6);
  expect(reach.elbowBend).toBeGreaterThan(-150 * DEG - 1e-6);
  // An unreachable target never stretches the arm past its own span.
  expect(reach.stretched).toBeLessThanOrEqual(reach.span);
  expect(reach.stretched).toBeGreaterThan(reach.span * 0.9);

  // Bending a knee lifts a foot; the figure has to end up back on the floor.
  const grounded = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(resolve => s.scene.onAfterRenderObservable.addOnce(() => resolve(null)));
    const floor = () => {
      const surfaces = [s.characterMesh, ...s.characterMesh.getChildMeshes()].filter((m: any) => m.getTotalVertices() > 0);
      surfaces.forEach((m: any) => { m.computeWorldMatrix(true); m.refreshBoundingInfo?.(true); });
      return Math.min(...surfaces.map((m: any) => m.getBoundingInfo().boundingBox.minimumWorld.y));
    };
    // Grounding waits for the render that rebuilds the skin matrices, so give
    // it a few frames — measuring sooner reads the previous pose.
    s.poseEditing.setJointRotation('leftKnee', { x: 1.2, y: 0, z: 0 });
    for (let i = 0; i < 4; i++) await settle();
    const bent = floor();
    s.poseEditing.setJointRotation('rightHip', { x: -0.9, y: 0, z: 0 });
    for (let i = 0; i < 4; i++) await settle();
    return { bent, afterHip: floor() };
  });
  for (const bottom of [grounded.bent, grounded.afterHip]) {
    expect(bottom).toBeGreaterThan(-0.005);
    expect(bottom).toBeLessThan(0.05);
  }

  await page.screenshot({ path: testInfo.outputPath('posed-figure.png') });

  // Re-applying a clip is the reset: every edited joint goes back.
  const reset = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(resolve => s.scene.onAfterRenderObservable.addOnce(() => resolve(null)));
    s.applyStudioPose('StudioStand');
    await settle(); await settle();
    const node = (id: string) => s.characterMesh.getChildTransformNodes().find((n: any) => n.name === id);
    const knee = (window as any).jointAngles(node('mixamorigLeftLeg').rotationQuaternion);
    const head = (window as any).jointAngles(node('mixamorigHead').rotationQuaternion);
    return { kneeX: knee.x, headY: head.y };
  });
  expect(reset.kneeX).toBeCloseTo(0, 3);
  expect(reset.headY).toBeCloseTo(0, 3);

  // An edited pose has to survive a save and reopen.
  const roundTrip = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    const settle = () => new Promise(resolve => s.scene.onAfterRenderObservable.addOnce(() => resolve(null)));
    s.poseEditing.setJointRotation('head', { x: 0, y: 0.5, z: 0 });
    s.poseEditing.setJointRotation('leftElbow', { x: -0.7, y: 0, z: 0 });
    await settle(); await settle();

    const saved = s.getCurrentSceneAsPreset();
    const stored = saved.actors[0]?.userData?.jointRotations;

    // Move the joints somewhere else, then reload the document over the top.
    s.poseEditing.setJointRotation('head', { x: 0, y: -0.3, z: 0 });
    s.poseEditing.setJointRotation('leftElbow', { x: -0.1, y: 0, z: 0 });
    await settle();

    await s.applyScenePreset(JSON.parse(JSON.stringify(saved)));
    for (let i = 0; i < 6; i++) await settle();

    const node = (id: string) => s.characterMesh.getChildTransformNodes().find((n: any) => n.name === id);
    const head = (window as any).jointAngles(node('mixamorigHead').rotationQuaternion);
    const elbow = (window as any).jointAngles(node('mixamorigLeftForeArm').rotationQuaternion);
    return { stored, headY: head.y, elbowX: elbow.x };
  });
  // Only the edited joints are written, not the whole skeleton.
  expect(Object.keys(roundTrip.stored ?? {}).sort()).toEqual(['head', 'leftElbow']);
  expect(roundTrip.headY).toBeCloseTo(0.5, 3);
  expect(roundTrip.elbowX).toBeCloseTo(-0.7, 3);

  // Opening a document replaces the figure, so the old handles must be gone
  // and the toggle must not claim the editor is still running.
  const afterLoad = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    return {
      editor: s.poseEditing,
      handles: s.scene.meshes.filter((m: any) => m.name.startsWith('poseHandle_')).length,
    };
  });
  expect(afterLoad.editor).toBeNull();
  expect(afterLoad.handles).toBe(0);
  await expect(page.locator('#studioPoseEdit')).not.toBeChecked();

  // Re-enabling builds handles for the figure that is actually on set now.
  await page.locator('#studioPoseEdit').check();
  expect(await page.evaluate(() =>
    (window as any).virtualStudio.scene.meshes.filter((m: any) => m.name.startsWith('poseHandle_')).length)).toBe(17);

  // Turning the editor off removes the handles from the shot.
  await page.evaluate(() => (window as any).virtualStudio.poseEditing.select('head'));
  await page.locator('#studioPoseEdit').uncheck();
  const afterOff = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const handles = s.scene.meshes.filter((m: any) => m.name.startsWith('poseHandle_'));
    return { hidden: handles.every((m: any) => !m.isEnabled()), selected: s.poseEditing.selectedJointId };
  });
  expect(afterOff.hidden).toBe(true);
  expect(afterOff.selected).toBeNull();

  expect(errors).toEqual([]);
});
