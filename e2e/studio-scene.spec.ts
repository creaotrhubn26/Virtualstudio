import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ video: 'off' });

test('anatomical studio models, posing, navigation, exposure and camera export', async ({ page }, testInfo) => {
  test.setTimeout(480_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); console.log('Browser error:', error.message); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Limit the software framebuffer before the first heavy scene frame is compiled.
  if (process.env.PLAYWRIGHT_SOFTWARE_GL === '1') {
    await page.waitForFunction(() => !!(window as any).virtualStudio?.engine);
    await page.evaluate(() => (window as any).virtualStudio.engine.setHardwareScalingLevel(2));
  }
  await page.waitForFunction(() => {
    const s = (window as any).virtualStudio;
    return s?.workspace && s.characterModelId && s.characterKeyboardState.poseLocked;
  }, undefined, { timeout: 120_000 });
  await expect(page.locator('#studioRoomSelect')).toHaveValue('industrial');
  const roomMeshes = await page.evaluate(() => (window as any).virtualStudio.scene.meshes.filter((m: any) => m.metadata?.studioRoom).length);
  expect(roomMeshes).toBeGreaterThan(10);
  expect(roomMeshes).toBeLessThan(40); // static geometry is batched by material
  await page.locator('#studioFurnishings').uncheck();
  expect(await page.evaluate(() => (window as any).virtualStudio.scene.getTransformNodeByName('studioRoom_furnishings').isEnabled())).toBe(false);
  await page.locator('#studioPracticals').uncheck();
  expect(await page.evaluate(() => (window as any).virtualStudio.scene.lights.filter((l: any) => l.name.startsWith('studioRoom_practical')).every((l: any) => !l.isEnabled()))).toBe(true);
  await page.locator('#studioRoomSelect').selectOption('none');
  expect(await page.evaluate(() => (window as any).virtualStudio.scene.meshes.filter((m: any) => m.metadata?.studioRoom).length)).toBe(0);
  await page.locator('#studioRoomSelect').selectOption('industrial');
  await page.locator('#studioFurnishings').check();
  await page.locator('#studioPracticals').check();
  expect(await page.evaluate(() => (window as any).virtualStudio.scene.meshes.filter((m: any) => m.metadata?.studioRoom).length)).toBe(roomMeshes);
  const initial = await page.evaluate(() => {
    const s = (window as any).virtualStudio, root = s.characterMesh;
    const meshes = root.getChildMeshes().filter((m: any) => m.getTotalVertices() > 0);
    return {
      root: root.uniqueId, primary: s.getPrimaryCharacterMesh().uniqueId,
      surfaces: meshes.map((m: any) => m.name),
      textures: meshes.map((m: any) => m.material.getActiveTextures().length),
      bones: meshes[0].skeleton.bones.length,
      source: root.metadata.sourceModelUrl,
      shot: [s.camera.alpha, s.camera.beta, s.camera.radius, ...s.camera.target.asArray(), s.camera.fov],
    };
  });
  expect(initial.primary).toBe(initial.root);
  expect(initial.source).toContain('studio-woman.glb');
  expect(initial.surfaces).toEqual(['Skin', 'female_casualsuit01', 'shoes01', 'Eyes', 'Hair']);
  expect(initial.textures).toEqual([1, 3, 2, 1, 1]);
  expect(initial.bones).toBe(53);
  await expect(page.locator('.viewport-2d')).toBeHidden();
  for (const view of ['top', 'front', 'side', 'studio']) {
    await page.locator(`button[data-studio-view="${view}"]`).click();
    expect(await page.evaluate(() => {
      const s = (window as any).virtualStudio;
      return [s.camera.alpha, s.camera.beta, s.camera.radius, ...s.camera.target.asArray(), s.camera.fov];
    })).toEqual(initial.shot);
  }
  // Model movement resolves the common wrapper, leaving all five surfaces aligned.
  expect(await page.evaluate(() => {
    const s = (window as any).virtualStudio, root = s.getPrimaryCharacterMesh();
    root.position.x += .25;
    root.computeWorldMatrix(true);
    const coherent = root.getChildMeshes().every((m: any) => m.position.length() === 0);
    root.position.x -= .25;
    return coherent;
  })).toBe(true);
  await page.locator('#studioPoseSelect').selectOption('StudioPortrait');
  await expect(page.locator('.studio-model-status')).toHaveText('Poseringen er oppdatert');
  expect(await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const head = s.characterMesh.getChildTransformNodes().find((n: any) => n.name === 'mixamorigHead');
    return Math.abs(head.rotationQuaternion.y);
  })).toBeGreaterThan(.05);
  await page.getByRole('button', { name: 'Portrett', exact: true }).click();
  await expect(page.locator('.studio-workspace')).toHaveAttribute('data-studio-view', 'camera');
  await expect(page.locator('.studio-camera-preview')).toBeHidden();
  const aspect = await page.locator('#renderCanvas').evaluate(c => c.clientWidth / c.clientHeight);
  expect(aspect).toBeCloseTo(16 / 9, 2);
  await page.screenshot({ path: testInfo.outputPath('woman-portrait.png') });
  const exposure = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    s.updateSceneBrightness();
    const before = [...s.lights.values()].map((d: any) => d.light.intensity);
    const e = s.renderingPipeline.imageProcessing.exposure;
    s.cameraSettings.iso *= 2;
    s.updateSceneBrightness();
    const ratio = s.renderingPipeline.imageProcessing.exposure / e;
    const after = [...s.lights.values()].map((d: any) => d.light.intensity);
    s.cameraSettings.iso /= 2;
    s.updateSceneBrightness();
    return { before, after, ratio };
  });
  expect(exposure.after).toEqual(exposure.before);
  expect(exposure.ratio).toBeCloseTo(2);

  const resources = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    return { skeletons: s.scene.skeletons.length, textures: s.scene.textures.length };
  });
  await page.locator('#studioModelSelect').selectOption('man');
  await expect(page.locator('.studio-model-status')).toHaveText('Modellen er klar for lyssetting', { timeout: 90_000 });
  const male = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    return { source: s.characterMesh.metadata.sourceModelUrl, primary: s.getPrimaryCharacterMesh().uniqueId,
      root: s.characterMesh.uniqueId, skeletons: s.scene.skeletons.length, textures: s.scene.textures.length,
      groups: s.scene.animationGroups.filter((g: any) => g.name.startsWith('Studio')).length };
  });
  expect(male.source).toContain('studio-man.glb');
  expect(male.primary).toBe(male.root);
  expect(male.skeletons).toBe(resources.skeletons);
  expect(male.textures).toBeLessThanOrEqual(resources.textures + 1);
  expect(male.groups).toBe(3);
  await page.locator('#studioPoseSelect').selectOption('StudioSeated');
  await page.waitForTimeout(500);
  await expect.poll(() => page.evaluate(() => {
    const s = (window as any).virtualStudio;
    return s.characterMesh.getChildMeshes().find((m: any) => m.name === 'Eyes').getBoundingInfo().boundingBox.maximumWorld.y;
  }), { timeout: 30_000 }).toBeLessThan(1.6);
  await expect.poll(() => page.evaluate(() => (window as any).virtualStudio.scene.transformNodes.filter((n: any) => n.metadata?.studioSeat).length)).toBe(1);
  const seat = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const chair = s.scene.transformNodes.find((n: any) => n.metadata?.studioSeat);
    const cushion = chair.getChildMeshes().find((m: any) => m.name === 'studioPortraitChair_cushion');
    cushion.computeWorldMatrix(true);
    const shoes = s.characterMesh.getChildMeshes().find((m: any) => m.name === 'shoes01');
    shoes.computeWorldMatrix(true); shoes.refreshBoundingInfo(true);
    return { height: cushion.getBoundingInfo().boundingBox.maximumWorld.y,
      contact: chair.metadata.contact[1], footY: shoes.getBoundingInfo().boundingBox.minimumWorld.y };
  });
  expect(seat.height).toBeGreaterThan(.3);
  expect(seat.height).toBeLessThan(.65);
  expect(seat.height).toBeCloseTo(seat.contact, 2);
  expect(seat.footY).toBeCloseTo(.016, 2);
  // Move and rotate the seated model: the chair must follow the same contact point.
  const chairBefore = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const chair = s.scene.transformNodes.find((n: any) => n.metadata?.studioSeat);
    const previous = chair.position.x;
    s.characterMesh.position.x += .6;
    return previous;
  });
  await expect.poll(() => page.evaluate(() => (window as any).virtualStudio.scene.transformNodes.find((n: any) => n.metadata?.studioSeat).position.x)).toBeCloseTo(chairBefore + .6, 3);
  await page.evaluate(() => (window as any).virtualStudio.characterMesh.position.x -= .6);
  await page.getByRole('button', { name: 'Hel figur', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('man-seated.png') });
  await page.locator('#studioPoseSelect').selectOption('StudioStand');
  await expect.poll(() => page.evaluate(() => (window as any).virtualStudio.scene.transformNodes.filter((n: any) => n.metadata?.studioSeat).length)).toBe(0);
  await page.getByRole('button', { name: 'Hel figur', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('man-full.png') });

  // A missing file reports failure and retains the last valid model.
  const failure = await page.evaluate(async () => {
    const s = (window as any).virtualStudio, id = s.characterMesh.uniqueId;
    let rejected = false;
    try { await s.loadCharacterModel('/models/does-not-exist.glb', 'Missing model', '', 1); }
    catch { rejected = true; }
    return { rejected, retained: s.characterMesh.uniqueId === id && !s.characterMesh.isDisposed() };
  });
  expect(failure).toEqual({ rejected: true, retained: true });
  await page.locator('button[data-studio-view="studio"]').click();
  await expect.poll(async () => page.locator('.studio-camera-preview canvas').evaluate(c => {
    const pixels = (c as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 384, 216).data;
    let lit = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 90) lit++;
    return lit;
  }), { timeout: 30_000 }).toBeGreaterThan(1000);
  await page.screenshot({ path: testInfo.outputPath('studio-workspace.png') });
  // Snapshot always uses the taking camera, even while arranging the studio.
  const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
  await page.evaluate(() => (window as any).virtualStudio.takeScreenshot());
  const download = await downloadPromise;
  const exported = testInfo.outputPath('camera-export.png');
  await download.saveAs(exported);
  const png = await readFile(exported);
  expect(png.readUInt32BE(16)).toBe(1920);
  expect(png.readUInt32BE(20)).toBe(1080);
  expect(png.byteLength).toBeGreaterThan(30_000);
  expect(await page.evaluate(() => (window as any).virtualStudio.workspace.getView())).toBe('studio');
  // Save and reopen a local studio document, without requiring the API backend.
  await page.locator('#studioFurnishings').uncheck();
  await page.locator('#studioPracticals').uncheck();
  await page.locator('#studioPoseSelect').selectOption('StudioSeated');
  await expect.poll(() => page.evaluate(() => (window as any).virtualStudio.scene.transformNodes.filter((n: any) => n.metadata?.studioSeat).length)).toBe(1);
  const savedState = await page.evaluate(() => (window as any).virtualStudio.getCurrentSceneAsPreset());
  const documentDownload = page.waitForEvent('download');
  await page.locator('[data-document="save"]').click();
  const saved = await documentDownload;
  const documentPath = testInfo.outputPath('studio-oppsett.json');
  await saved.saveAs(documentPath);
  await page.locator('#studioRoomSelect').selectOption('none');
  await page.locator('[data-studio-document]').setInputFiles(documentPath);
  await expect(page.locator('.studio-document-status')).toHaveText('Oppsettet er åpnet', { timeout: 120_000 });
  await expect(page.locator('#studioRoomSelect')).toHaveValue('industrial');
  await expect(page.locator('#studioFurnishings')).not.toBeChecked();
  await expect(page.locator('#studioPracticals')).not.toBeChecked();
  await expect(page.locator('#studioPoseSelect')).toHaveValue('StudioSeated');
  expect(await page.evaluate(() => (window as any).virtualStudio.scene.transformNodes.filter((n: any) => n.metadata?.studioSeat).length)).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as any).virtualStudio.getCurrentSceneAsPreset().actors.length), { timeout: 10_000 }).toBe(1);
  const restored = await page.evaluate(() => (window as any).virtualStudio.getCurrentSceneAsPreset());
  expect(restored.environment.room).toEqual(savedState.environment.room);
  expect(restored.cameraSettings).toEqual(savedState.cameraSettings);
  expect(restored.actors[0].userData).toEqual(savedState.actors[0].userData);
  restored.lights.forEach((light: any, index: number) => {
    const saved = savedState.lights[index];
    expect(light.fixtureId).toBe(saved.fixtureId);
    expect(light.intensity).toBeCloseTo(saved.intensity, 5);
    light.position.forEach((value: number, axis: number) => expect(value).toBeCloseTo(saved.position[axis], 5));
    light.aimTarget?.forEach((value: number, axis: number) => expect(value).toBeCloseTo(saved.aimTarget![axis], 5));
  });
  // Invalid input must fail before clearing the current scene.
  const modelIdBefore = await page.evaluate(() => (window as any).virtualStudio.characterModelId);
  await page.locator('[data-studio-document]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"virtualstudio.scene","version":2,"scene":{"actors":[],"lights":[]}}') });
  await expect(page.locator('.studio-document-status')).toHaveText('Filen er ikke et gyldig studiooppsett');
  expect(await page.evaluate(() => (window as any).virtualStudio.characterModelId)).toBe(modelIdBefore);
  await page.locator('#studioFurnishings').check();
  await page.locator('#studioPracticals').check();
  await page.screenshot({ path: testInfo.outputPath('industrial-studio.png') });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.locator('button[data-studio-view="studio"]').click();
  const overlapping = await page.evaluate(() => {
    const panels = ['.studio-environment-panel', '.studio-camera-preview', '.studio-view-toolbar', '.studio-model-panel:not(.studio-environment-panel)'];
    const bounds = panels.map(selector => document.querySelector(selector)!.getBoundingClientRect());
    return bounds.some((a, i) => bounds.slice(i + 1).some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
  });
  expect(overlapping).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('tablet-landscape.png') });
  expect(errors).toEqual([]);
});
