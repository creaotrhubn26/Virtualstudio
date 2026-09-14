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
    const ids = ['aputure-120d', 'aputure-300d', 'aputure-600d', 'profoto-b10', 'shaper-octabox-150', 'shaper-snoot'];
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
        isFlash: !!data.isFlash,
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

  // A 250 Ws strobe is several stops above a 300 W LED. Its catalogue lux@1m
  // of 10000 describes the modelling lamp; the guide number describes the flash.
  expect(rig['profoto-b10'].isFlash).toBe(true);
  expect(rig['aputure-300d'].isFlash).toBe(false);
  expect(stops(rig['aputure-300d'].intensity, rig['profoto-b10'].intensity)).toBeCloseTo(Math.log2(36), 1);

  // Shutter speed changes continuous exposure but never flash exposure: the
  // strobe's rendered contribution has to come out identical at every shutter.
  const shutterResponse = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const sample = () => {
      s.updateSceneBrightness();
      const exposure = s.renderingPipeline.imageProcessing.exposure;
      const byName: Record<string, number> = {};
      for (const d of s.lights.values()) byName[d.name] = d.light.intensity * exposure;
      return byName;
    };
    s.cameraSettings.shutter = '1/125';
    const at125 = sample();
    s.cameraSettings.shutter = '1/250';
    const at250 = sample();
    s.cameraSettings.shutter = '1/125';
    s.updateSceneBrightness();
    return { at125, at250 };
  });
  const flashName = 'Profoto B10';
  const ledName = 'Aputure LS 300d II';
  expect(shutterResponse.at250[flashName] / shutterResponse.at125[flashName]).toBeCloseTo(1, 5);
  // One stop of shutter is one stop of continuous light.
  expect(shutterResponse.at250[ledName] / shutterResponse.at125[ledName]).toBeCloseTo(0.5, 5);

  // Blowing out the frame offers the scope that shows it, and changes nothing
  // about the exposure or the lights on its own.
  const prompt = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    s.setScopeMode('histogram');
    s.highlightClipping = 24;
    s.clippingPromptArmed = true;
    s.offerClippingScope();
    const toast = document.querySelector('.vs-toast.warn');
    const actions = [...document.querySelectorAll('.vs-toast-action')].map(b => b.textContent);
    const apertureBefore = s.cameraSettings.aperture;
    const intensitiesBefore = [...s.lights.values()].map((d: any) => d.light.intensity);
    (document.querySelectorAll('.vs-toast-action')[0] as HTMLButtonElement).click();
    return {
      message: toast?.textContent ?? '',
      actions,
      mode: s.currentScopeMode,
      apertureUnchanged: s.cameraSettings.aperture === apertureBefore,
      lightsUnchanged: [...s.lights.values()].every((d: any, i: number) => d.light.intensity === intensitiesBefore[i]),
    };
  });
  expect(prompt.message).toContain('overeksponert');
  expect(prompt.actions).toEqual(['Zebra', 'Histogram']);
  expect(prompt.mode).toBe('zebra');
  expect(prompt.apertureUnchanged).toBe(true);
  expect(prompt.lightsUnchanged).toBe(true);

  await page.evaluate(() => (window as any).virtualStudio.setScopeMode('histogram'));

  // Camera exposure is image processing only: changing aperture must not touch
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

  // The default rig is now built from placement and output percentage on
  // fixtures carrying their catalogue output, instead of intensities typed
  // into three identical heads. The light reaching the subject must be
  // unchanged: the previous rig metered 520 / 178 / 500 at its distances.
  const rigReadings = await page.evaluate(() => {
    const s = (window as any).virtualStudio;
    const aims: Record<string, number[]> = {
      'Hovedlys · Softbox': [0, 1.3, 0],
      'Utfylling · Softbox': [0, 1.2, 0],
      'Kantlys · Stripbox': [0, 1.5, 0],
    };
    const out: Record<string, { illuminance: number; power: number; base: number }> = {};
    for (const d of s.lights.values()) {
      const aim = aims[d.name];
      if (!aim) continue;
      const p = d.light.position;
      const dx = p.x - aim[0], dy = p.y - aim[1], dz = p.z - aim[2];
      out[d.name] = {
        illuminance: d.light.intensity / (dx * dx + dy * dy + dz * dz),
        power: d.powerMultiplier,
        base: d.baseIntensity,
      };
    }
    return out;
  });
  expect(rigReadings['Hovedlys · Softbox'].illuminance).toBeCloseTo(520 / 19.86, 4);
  expect(rigReadings['Utfylling · Softbox'].illuminance).toBeCloseTo(178 / 20.24, 4);
  expect(rigReadings['Kantlys · Stripbox'].illuminance).toBeCloseTo(500 / 24.75, 4);
  // Key to fill stays the classic portrait ratio, close to 3:1.
  expect(
    rigReadings['Hovedlys · Softbox'].illuminance / rigReadings['Utfylling · Softbox'].illuminance,
  ).toBeCloseTo(2.98, 1);
  // Every head carries its own catalogue output and is never driven past 100%.
  expect(rigReadings['Hovedlys · Softbox'].base).toBeCloseTo(450, 6);
  expect(rigReadings['Utfylling · Softbox'].base).toBeCloseTo(450, 6);
  expect(rigReadings['Kantlys · Stripbox'].base).toBeCloseTo(380, 6);
  for (const name of Object.keys(rigReadings)) {
    expect(rigReadings[name].power).toBeGreaterThan(0);
    expect(rigReadings[name].power).toBeLessThanOrEqual(1);
  }

  await page.screenshot({ path: testInfo.outputPath('reference-lighting.png') });
  expect(errors).toEqual([]);
});
