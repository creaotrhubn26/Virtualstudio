import { test, expect } from '@playwright/test';

/**
 * Reference lighting scene.
 *
 * Three Aputure fixtures whose published lux@1m is 20000 / 45000 / 86000 are
 * placed at the same spot. Their rendered output must keep the catalogue
 * ratio, use true 1/d² falloff, and cast a penumbra whose width follows the
 * modifier's emitting size. Tolerances are in stops, not in pixels.
 */
test.use({ video: 'off' });

const STOP_TOLERANCE = 0.05;

test('fixture output, falloff and shadow softness follow the catalogue', async ({ page }, testInfo) => {
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

  const rig = await page.evaluate(async () => {
    const s = (window as any).virtualStudio;
    // Babylon isn't exported on window; reuse the camera's Vector3 class.
    const Vector3 = s.camera.position.constructor as any;
    const FALLOFF_PHYSICAL = 1; // BABYLON.Light.FALLOFF_PHYSICAL
    const ids = ['aputure-120d', 'aputure-300d', 'aputure-600d', 'shaper-octabox-150', 'shaper-snoot'];
    const placed: Record<string, any> = {};
    for (const [index, id] of ids.entries()) {
      const lightId = await s.addLight(id, new Vector3(-3 + index * 1.5, 2.2, 2.5));
      const data = s.lights.get(lightId);
      placed[id] = {
        intensity: data.light.intensity,
        physicalFalloff: data.light.falloffType === FALLOFF_PHYSICAL,
        contactHardening: !!data.shadowGenerator?.useContactHardeningShadow,
        lightSizeUV: data.shadowGenerator?.contactHardeningLightSizeUVRatio ?? null,
        shadowMaxZ: data.light.shadowMaxZ,
        spotAngle: data.light.angle,
      };
    }
    return placed;
  });

  const stops = (from: number, to: number) => Math.log2(to / from);

  // Published lux@1m 20000 → 45000 → 86000. Before this calibration every
  // fixture above 8000 cd hit a shared ceiling and rendered identically.
  expect(stops(rig['aputure-120d'].intensity, rig['aputure-300d'].intensity)).toBeCloseTo(Math.log2(45000 / 20000), 2);
  expect(stops(rig['aputure-120d'].intensity, rig['aputure-600d'].intensity)).toBeCloseTo(Math.log2(86000 / 20000), 2);
  expect(Math.abs(stops(rig['aputure-120d'].intensity, rig['aputure-600d'].intensity) - 2.1)).toBeLessThan(0.1);

  for (const id of Object.keys(rig)) {
    expect(rig[id].physicalFalloff, `${id} must use 1/d² falloff`).toBe(true);
    expect(rig[id].contactHardening, `${id} must use contact-hardening shadows`).toBe(true);
    expect(rig[id].shadowMaxZ).toBe(20);
  }

  // PCSS reads the light size in shadow-map UV, and the map spans the spot
  // cone — so the UV ratio alone says nothing across different beam angles.
  // Convert it back to metres: that is the emitting surface the penumbra is
  // actually built from, and it must match the modifier's real dimensions.
  const sourceMetres = (id: string) =>
    rig[id].lightSizeUV * 2 * rig[id].shadowMaxZ * Math.tan(rig[id].spotAngle / 2);
  expect(sourceMetres('shaper-octabox-150')).toBeCloseTo(1.5, 2);
  expect(sourceMetres('shaper-snoot')).toBeCloseTo(0.1, 2);
  expect(sourceMetres('shaper-octabox-150')).toBeGreaterThan(sourceMetres('shaper-snoot') * 10);

  // Camera exposure is image processing only: changing ISO must not touch
  // any fixture's physical output.
  const exposure = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    s.updateSceneBrightness();
    const before = [...s.lights.values()].map((d: any) => d.light.intensity);
    const e = s.renderingPipeline.imageProcessing.exposure;
    s.cameraSettings.aperture = 8;
    s.updateSceneBrightness();
    const after = [...s.lights.values()].map((d: any) => d.light.intensity);
    const ratio = s.renderingPipeline.imageProcessing.exposure / e;
    s.cameraSettings.aperture = 2.8;
    s.updateSceneBrightness();
    return { before, after, ratio };
  });
  expect(exposure.after).toEqual(exposure.before);
  // f/2.8 → f/8 is (2.8/8)² of the light, ~3.0 stops.
  expect(Math.abs(Math.log2(exposure.ratio) + 3)).toBeLessThan(STOP_TOLERANCE + 0.05);

  await page.screenshot({ path: testInfo.outputPath('reference-lighting.png') });
  expect(errors).toEqual([]);
});
