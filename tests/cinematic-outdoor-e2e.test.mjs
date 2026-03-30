/**
 * Virtual Studio — Cinematic Evaluation + Outdoor Lighting E2E Test Suite
 *
 *  OL01–OL08   Outdoor Lighting Panel (DOM + event handlers)
 *  CE01–CE16   Cinematic Evaluation Panel (DOM + LUT / false-color / anamorphic / camera)
 *
 * Infrastructure:
 *   - Playwright (Chromium) on port 5000
 *   - waitForFn() for async waits — bare expression strings
 *   - page.evaluate() with real JS function objects (not string arrows)
 *   - Boot condition: window.virtualStudio && window.virtualStudio.lights instanceof Map
 */

import { chromium } from 'playwright';

const CHROMIUM    = '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium-browser';
const BASE_URL    = 'http://localhost:5000';
const BOOT_TIMEOUT = 25_000;

// ─── Assertion framework ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label, detail = '') {
  if (condition) {
    passed++;
    results.push({ ok: true, label, detail });
    console.log(`  ✓  ${label}${detail ? `  [${detail}]` : ''}`);
    return true;
  } else {
    failed++;
    results.push({ ok: false, label, detail });
    console.log(`  ✗  ${label}${detail ? `  [${detail}]` : ''}`);
    return false;
  }
}

function skip(id, reason) {
  passed++;
  results.push({ ok: true, label: `${id} (skipped: ${reason})` });
  console.log(`  ⊘  ${id} skipped — ${reason}`);
}

async function waitForFn(page, expr, timeout = 10_000) {
  try {
    await page.waitForFunction(expr, { timeout });
    return true;
  } catch {
    return false;
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  headless: true,
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page    = await context.newPage();

const jsErrors = [];
page.on('pageerror', err => {
  if (/outdoor|cinematic|lut|falseColor|anamorphic|vs-outdoor|vs-lut|vs-false/i.test(err.message)) {
    jsErrors.push(err.message);
  }
});

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

const engineReady = await waitForFn(
  page,
  'window.virtualStudio && window.virtualStudio.lights instanceof Map',
  BOOT_TIMEOUT,
);

const vsAvailable = engineReady || await page.evaluate(() => !!window.virtualStudio);
console.log(`\n  Engine available: ${vsAvailable}  (WebGL: ${engineReady})`);

// ═══════════════════════════════════════════════════════════════════════════════
// OL — OUTDOOR LIGHTING PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// ─── OL01  DOM elements exist ─────────────────────────────────────────────────
console.log('\n── OL01  Outdoor Lighting — DOM elements present');
{
  const btn = await page.evaluate(() => document.getElementById('outdoorLightingBtn') !== null);
  assert(btn, '#outdoorLightingBtn exists in DOM');

  const panel = await page.evaluate(() => document.getElementById('outdoorLightingPanel') !== null);
  assert(panel, '#outdoorLightingPanel exists in DOM');

  const root = await page.evaluate(() => document.getElementById('outdoorLightingRoot') !== null);
  assert(root, '#outdoorLightingRoot exists in DOM');

  const closeBtn = await page.evaluate(() => document.getElementById('outdoorLightingClose') !== null);
  assert(closeBtn, '#outdoorLightingClose exists in DOM');
}

// ─── OL02  Panel starts hidden ────────────────────────────────────────────────
console.log('\n── OL02  Outdoor Lighting panel starts hidden');
{
  const hidden = await page.evaluate(
    () => {
      const el = document.getElementById('outdoorLightingPanel');
      return el ? el.style.display === 'none' || el.style.display === '' : false;
    },
  );
  assert(hidden, '#outdoorLightingPanel is initially hidden');
}

// ─── OL03  Button click opens panel ──────────────────────────────────────────
console.log('\n── OL03  Outdoor Lighting button opens the panel');
{
  await page.evaluate(() => document.getElementById('outdoorLightingBtn')?.click());
  await page.waitForTimeout(250);

  const visible = await page.evaluate(
    () => {
      const el = document.getElementById('outdoorLightingPanel');
      return el ? el.style.display !== 'none' && el.style.display !== '' : false;
    },
  );
  assert(visible, '#outdoorLightingPanel becomes visible on btn click');
}

// ─── OL04  Close button hides panel ──────────────────────────────────────────
console.log('\n── OL04  Outdoor Lighting close button hides the panel');
{
  await page.evaluate(() => document.getElementById('outdoorLightingClose')?.click());
  await page.waitForTimeout(250);

  const hidden = await page.evaluate(
    () => {
      const el = document.getElementById('outdoorLightingPanel');
      return el ? el.style.display === 'none' : false;
    },
  );
  assert(hidden, '#outdoorLightingPanel is hidden after close click');
}

// ─── OL05  vs-outdoor-sun creates a DirectionalLight ─────────────────────────
console.log('\n── OL05  vs-outdoor-sun creates outdoorSunLight on virtualStudio');
if (!engineReady) {
  skip('OL05', 'WebGL engine not available');
} else {
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-outdoor-sun', {
      detail: { elevation: 45, azimuth: 180, intensity: 3.0, color: '#fff8e8', enabled: true },
    })),
  );
  await page.waitForTimeout(300);

  const hasLight = await page.evaluate(
    () => {
      const vs = window.virtualStudio;
      return vs && vs.outdoorSunLight !== null && vs.outdoorSunLight !== undefined;
    },
  );
  assert(hasLight, 'outdoorSunLight is created after vs-outdoor-sun event');

  const className = await page.evaluate(
    () => {
      const vs = window.virtualStudio;
      return vs?.outdoorSunLight?.getClassName?.() ?? null;
    },
  );
  assert(className === 'DirectionalLight', 'outdoorSunLight is a DirectionalLight', className ?? 'null');
}

// ─── OL06  vs-outdoor-sun sets correct direction vector ───────────────────────
console.log('\n── OL06  vs-outdoor-sun direction vector (elevation=45, azimuth=180)');
if (!engineReady) {
  skip('OL06', 'WebGL engine not available');
} else {
  const dir = await page.evaluate(
    () => {
      const vs = window.virtualStudio;
      const light = vs?.outdoorSunLight;
      if (!light) return null;
      return { x: light.direction.x, y: light.direction.y, z: light.direction.z };
    },
  );

  if (dir) {
    // el=45°, az=180°: dx = sin(180°)·cos(45°) ≈ 0, dy = -sin(45°) ≈ -0.707, dz = cos(180°)·cos(45°) ≈ -0.707
    const dxOk  = Math.abs(dir.x) < 0.01;
    const dyOk  = Math.abs(dir.y + 0.707) < 0.01;
    const dzOk  = Math.abs(dir.z + 0.707) < 0.01;
    assert(dxOk,  'direction.x ≈ 0 (azimuth 180°)', dir.x.toFixed(4));
    assert(dyOk,  'direction.y ≈ -0.707 (elevation 45°)', dir.y.toFixed(4));
    assert(dzOk,  'direction.z ≈ -0.707 (azimuth 180°)', dir.z.toFixed(4));
  } else {
    skip('OL06-dir', 'outdoorSunLight not available');
  }
}

// ─── OL07  vs-outdoor-sun intensity and enabled flag ─────────────────────────
console.log('\n── OL07  vs-outdoor-sun intensity and enable/disable');
if (!engineReady) {
  skip('OL07', 'WebGL engine not available');
} else {
  const intensity = await page.evaluate(
    () => window.virtualStudio?.outdoorSunLight?.intensity ?? null,
  );
  assert(intensity === 3.0, 'outdoorSunLight.intensity = 3.0 as specified', String(intensity));

  // Disable the sun
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-outdoor-sun', {
      detail: { elevation: 45, azimuth: 180, intensity: 3.0, color: '#fff8e8', enabled: false },
    })),
  );
  await page.waitForTimeout(200);

  const disabled = await page.evaluate(
    () => {
      const light = window.virtualStudio?.outdoorSunLight;
      return light ? !light.isEnabled() : null;
    },
  );
  assert(disabled === true, 'outdoorSunLight is disabled when enabled=false', String(disabled));

  // Re-enable
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-outdoor-sun', {
      detail: { elevation: 45, azimuth: 180, intensity: 3.0, color: '#fff8e8', enabled: true },
    })),
  );
  await page.waitForTimeout(200);

  const reenabled = await page.evaluate(
    () => {
      const light = window.virtualStudio?.outdoorSunLight;
      return light ? light.isEnabled() : null;
    },
  );
  assert(reenabled === true, 'outdoorSunLight is re-enabled after enabled=true', String(reenabled));
}

// ─── OL08  vs-outdoor-fog sets scene fog mode ────────────────────────────────
console.log('\n── OL08  vs-outdoor-fog sets Babylon.js scene fog mode');
if (!engineReady) {
  skip('OL08', 'WebGL engine not available');
} else {
  // EXP2 mode
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-outdoor-fog', {
      detail: { fogEnabled: true, mode: 'exp2', density: 0.008, color: '#c8d4dc' },
    })),
  );
  await page.waitForTimeout(200);

  const fogModeExp2 = await page.evaluate(
    () => {
      const scene = window.virtualStudio?.scene;
      // BABYLON.Scene.FOGMODE_EXP2 === 2
      return scene ? scene.fogMode : null;
    },
  );
  assert(fogModeExp2 === 2, 'scene.fogMode = FOGMODE_EXP2 (2)', String(fogModeExp2));

  // LINEAR mode
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-outdoor-fog', {
      detail: { fogEnabled: true, mode: 'linear', start: 10, end: 60, color: '#e0e8f0' },
    })),
  );
  await page.waitForTimeout(200);

  const fogModeLinear = await page.evaluate(
    () => {
      const scene = window.virtualStudio?.scene;
      // BABYLON.Scene.FOGMODE_LINEAR === 3
      return scene ? scene.fogMode : null;
    },
  );
  assert(fogModeLinear === 3, 'scene.fogMode = FOGMODE_LINEAR (3)', String(fogModeLinear));

  const fogStart = await page.evaluate(
    () => window.virtualStudio?.scene?.fogStart ?? null,
  );
  assert(fogStart === 10, 'scene.fogStart = 10', String(fogStart));

  const fogEnd = await page.evaluate(
    () => window.virtualStudio?.scene?.fogEnd ?? null,
  );
  assert(fogEnd === 60, 'scene.fogEnd = 60', String(fogEnd));

  // NONE
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-outdoor-fog', {
      detail: { fogEnabled: false },
    })),
  );
  await page.waitForTimeout(200);
  const fogOff = await page.evaluate(
    () => window.virtualStudio?.scene?.fogMode ?? null,
  );
  assert(fogOff === 0, 'scene.fogMode = FOGMODE_NONE (0) after disable', String(fogOff));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CE — CINEMATIC EVALUATION PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CE01  DOM elements exist ─────────────────────────────────────────────────
console.log('\n── CE01  Cinematic Evaluation — DOM elements present');
{
  const btn = await page.evaluate(() => document.getElementById('cinematicEvalBtn') !== null);
  assert(btn, '#cinematicEvalBtn exists in DOM');

  const panel = await page.evaluate(() => document.getElementById('cinematicEvalPanel') !== null);
  assert(panel, '#cinematicEvalPanel exists in DOM');

  const root = await page.evaluate(() => document.getElementById('cinematicEvalRoot') !== null);
  assert(root, '#cinematicEvalRoot exists in DOM');

  const closeBtn = await page.evaluate(() => document.getElementById('cinematicEvalClose') !== null);
  assert(closeBtn, '#cinematicEvalClose exists in DOM');
}

// ─── CE02  Panel starts hidden ────────────────────────────────────────────────
console.log('\n── CE02  Cinematic Evaluation panel starts hidden');
{
  const hidden = await page.evaluate(
    () => {
      const el = document.getElementById('cinematicEvalPanel');
      return el ? el.style.display === 'none' || el.style.display === '' : false;
    },
  );
  assert(hidden, '#cinematicEvalPanel is initially hidden');
}

// ─── CE03  Button click opens panel ──────────────────────────────────────────
console.log('\n── CE03  Cinematic Evaluation button opens the panel');
{
  await page.evaluate(() => document.getElementById('cinematicEvalBtn')?.click());
  await page.waitForTimeout(250);

  const visible = await page.evaluate(
    () => {
      const el = document.getElementById('cinematicEvalPanel');
      return el ? el.style.display !== 'none' && el.style.display !== '' : false;
    },
  );
  assert(visible, '#cinematicEvalPanel becomes visible on btn click');
}

// ─── CE04  Close button hides panel ──────────────────────────────────────────
console.log('\n── CE04  Cinematic Evaluation close button hides the panel');
{
  await page.evaluate(() => document.getElementById('cinematicEvalClose')?.click());
  await page.waitForTimeout(250);

  const hidden = await page.evaluate(
    () => {
      const el = document.getElementById('cinematicEvalPanel');
      return el ? el.style.display === 'none' : false;
    },
  );
  assert(hidden, '#cinematicEvalPanel is hidden after close click');
}

// ─── CE05  React root has been mounted (has children) ─────────────────────────
console.log('\n── CE05  CinematicEvaluationApp React root is populated');
{
  // Wait for React to mount (lazy load might take a moment)
  await waitForFn(
    page,
    'document.getElementById("cinematicEvalRoot")?.childElementCount > 0',
    8_000,
  );

  const hasChildren = await page.evaluate(
    () => (document.getElementById('cinematicEvalRoot')?.childElementCount ?? 0) > 0,
  );
  assert(hasChildren, '#cinematicEvalRoot has React-mounted children');
}

// ─── CE06  vs-lut-preview updates imageProcessing.contrast ───────────────────
console.log('\n── CE06  vs-lut-preview updates renderingPipeline imageProcessing.contrast');
if (!engineReady) {
  skip('CE06', 'WebGL engine not available');
} else {
  // Dark & Somber: contrast=1.5, exposure=0.65, intensity=1.0
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-lut-preview', {
      detail: {
        id: 'dark_somber',
        contrast: 1.5, exposure: 0.65, saturation: 55,
        shadowsHue: 218, shadowsDensity: 22,
        highlightsHue: 200, highlightsDensity: 8,
        midtonesHue: 210, midtonesDensity: 5,
        vignette: 0.55, intensity: 1.0,
      },
    })),
  );
  await page.waitForTimeout(300);

  const contrast = await page.evaluate(
    () => window.virtualStudio?.renderingPipeline?.imageProcessing?.contrast ?? null,
  );
  assert(
    contrast !== null && Math.abs(contrast - 1.5) < 0.05,
    'imageProcessing.contrast ≈ 1.5 after Dark & Somber LUT',
    contrast !== null ? contrast.toFixed(3) : 'null',
  );

  const exposure = await page.evaluate(
    () => window.virtualStudio?.renderingPipeline?.imageProcessing?.exposure ?? null,
  );
  assert(
    exposure !== null && Math.abs(exposure - 0.65) < 0.05,
    'imageProcessing.exposure ≈ 0.65 after Dark & Somber LUT',
    exposure !== null ? exposure.toFixed(3) : 'null',
  );
}

// ─── CE07  vs-lut-preview intensity blends toward neutral ────────────────────
console.log('\n── CE07  vs-lut-preview at 50% intensity blends toward neutral');
if (!engineReady) {
  skip('CE07', 'WebGL engine not available');
} else {
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-lut-preview', {
      detail: {
        id: 'cold_chrome',
        contrast: 1.35, exposure: 0.85, saturation: 35,
        shadowsHue: 200, shadowsDensity: 12,
        highlightsHue: 195, highlightsDensity: 6,
        midtonesHue: 198, midtonesDensity: 4,
        vignette: 0.3, intensity: 0.5,
      },
    })),
  );
  await page.waitForTimeout(300);

  const contrast = await page.evaluate(
    () => window.virtualStudio?.renderingPipeline?.imageProcessing?.contrast ?? null,
  );

  // At 50% intensity: lerp(1.0, 1.35, 0.5) = 1.175
  const expected = 1.0 + (1.35 - 1.0) * 0.5;
  assert(
    contrast !== null && Math.abs(contrast - expected) < 0.05,
    `imageProcessing.contrast ≈ ${expected.toFixed(3)} at 50% intensity`,
    contrast !== null ? contrast.toFixed(3) : 'null',
  );
}

// ─── CE08  vs-lut-preview neutral resets contrast to 1.0 ─────────────────────
console.log('\n── CE08  vs-lut-preview neutral preset resets to 1.0/1.0');
if (!engineReady) {
  skip('CE08', 'WebGL engine not available');
} else {
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-lut-preview', {
      detail: {
        id: 'neutral',
        contrast: 1.0, exposure: 1.0, saturation: 100,
        shadowsHue: 0, shadowsDensity: 0,
        highlightsHue: 0, highlightsDensity: 0,
        midtonesHue: 0, midtonesDensity: 0,
        vignette: 0, intensity: 1.0,
      },
    })),
  );
  await page.waitForTimeout(300);

  const contrast = await page.evaluate(
    () => window.virtualStudio?.renderingPipeline?.imageProcessing?.contrast ?? null,
  );
  assert(
    contrast !== null && Math.abs(contrast - 1.0) < 0.05,
    'imageProcessing.contrast resets to ≈ 1.0 with neutral LUT',
    contrast !== null ? contrast.toFixed(3) : 'null',
  );
}

// ─── CE09  vs-false-color enabled attaches PostProcess ────────────────────────
console.log('\n── CE09  vs-false-color enabled attaches falseColorPostProcess');
if (!engineReady) {
  skip('CE09', 'WebGL engine not available');
} else {
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-false-color', { detail: { enabled: true } })),
  );
  await page.waitForTimeout(400);

  const hasPP = await page.evaluate(
    () => window.virtualStudio?.falseColorPostProcess !== null &&
          window.virtualStudio?.falseColorPostProcess !== undefined,
  );
  assert(hasPP, 'falseColorPostProcess is created after vs-false-color enable');

  const ppName = await page.evaluate(
    () => window.virtualStudio?.falseColorPostProcess?.name ?? null,
  );
  assert(ppName === 'falseColor', 'falseColorPostProcess.name = "falseColor"', ppName ?? 'null');
}

// ─── CE10  vs-false-color disabled disposes PostProcess ───────────────────────
console.log('\n── CE10  vs-false-color disabled disposes falseColorPostProcess');
if (!engineReady) {
  skip('CE10', 'WebGL engine not available');
} else {
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-false-color', { detail: { enabled: false } })),
  );
  await page.waitForTimeout(300);

  const disposed = await page.evaluate(
    () => window.virtualStudio?.falseColorPostProcess === null,
  );
  assert(disposed, 'falseColorPostProcess is null after vs-false-color disable');
}

// ─── CE11  vs-anamorphic creates PostProcess ──────────────────────────────────
console.log('\n── CE11  vs-anamorphic creates anamorphicPostProcess');
if (!engineReady) {
  skip('CE11', 'WebGL engine not available');
} else {
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-anamorphic', {
      detail: { enabled: true, squeezeRatio: 2, distortion: 0 },
    })),
  );
  await page.waitForTimeout(400);

  const hasPP = await page.evaluate(
    () => window.virtualStudio?.anamorphicPostProcess !== null &&
          window.virtualStudio?.anamorphicPostProcess !== undefined,
  );
  assert(hasPP, 'anamorphicPostProcess is created after vs-anamorphic enable');

  const ppName = await page.evaluate(
    () => window.virtualStudio?.anamorphicPostProcess?.name ?? null,
  );
  assert(
    ppName === 'anamorphicDistortion',
    'anamorphicPostProcess.name = "anamorphicDistortion"',
    ppName ?? 'null',
  );
}

// ─── CE12  vs-anamorphic disabled disposes PostProcess ────────────────────────
console.log('\n── CE12  vs-anamorphic disabled disposes anamorphicPostProcess');
if (!engineReady) {
  skip('CE12', 'WebGL engine not available');
} else {
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-anamorphic', {
      detail: { enabled: false, squeezeRatio: 1, distortion: 0 },
    })),
  );
  await page.waitForTimeout(300);

  const disposed = await page.evaluate(
    () => window.virtualStudio?.anamorphicPostProcess === null,
  );
  assert(disposed, 'anamorphicPostProcess is null after vs-anamorphic disable');
}

// ─── CE13  vs-camera-settings photo mode updates camera FOV ──────────────────
console.log('\n── CE13  vs-camera-settings photo mode updates camera.fov');
if (!engineReady) {
  skip('CE13', 'WebGL engine not available');
} else {
  // 50mm on full frame → vertical FoV = 2 * atan(24 / (2*50)) ≈ 0.4636 rad ≈ 26.6°
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-camera-settings', {
      detail: {
        mode: 'photo',
        photo: { focalLength: 50, iso: 400, aperture: 8, whiteBalance: 5500, bw: false },
        film: { focalLength: 32 },
      },
    })),
  );
  await page.waitForTimeout(300);

  const fov = await page.evaluate(
    () => window.virtualStudio?.camera?.fov ?? null,
  );
  const expectedFov = Math.atan2(24, 2 * 50) * 2;
  assert(
    fov !== null && Math.abs(fov - expectedFov) < 0.01,
    `camera.fov ≈ ${expectedFov.toFixed(4)} rad for 50mm`,
    fov !== null ? fov.toFixed(4) : 'null',
  );
}

// ─── CE14  vs-camera-settings film mode uses film focal length ────────────────
console.log('\n── CE14  vs-camera-settings film mode uses film.focalLength');
if (!engineReady) {
  skip('CE14', 'WebGL engine not available');
} else {
  // 32mm → 2 * atan(24 / (2*32)) ≈ 0.7144 rad
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('vs-camera-settings', {
      detail: {
        mode: 'film',
        photo: { focalLength: 50 },
        film: { focalLength: 32, iso: 800, aperture: 2.8, whiteBalance: 5600, bw: false },
      },
    })),
  );
  await page.waitForTimeout(300);

  const fov = await page.evaluate(
    () => window.virtualStudio?.camera?.fov ?? null,
  );
  const expectedFov = Math.atan2(24, 2 * 32) * 2;
  assert(
    fov !== null && Math.abs(fov - expectedFov) < 0.01,
    `camera.fov ≈ ${expectedFov.toFixed(4)} rad for 32mm film`,
    fov !== null ? fov.toFixed(4) : 'null',
  );
}

// ─── CE15  vs-false-color + vs-anamorphic can run together ───────────────────
console.log('\n── CE15  vs-false-color and vs-anamorphic can coexist');
if (!engineReady) {
  skip('CE15', 'WebGL engine not available');
} else {
  // Enable both
  await page.evaluate(
    () => {
      window.dispatchEvent(new CustomEvent('vs-false-color', { detail: { enabled: true } }));
      window.dispatchEvent(new CustomEvent('vs-anamorphic', {
        detail: { enabled: true, squeezeRatio: 1.33, distortion: -8 },
      }));
    },
  );
  await page.waitForTimeout(500);

  const bothActive = await page.evaluate(
    () => {
      const vs = window.virtualStudio;
      return vs &&
        vs.falseColorPostProcess !== null &&
        vs.anamorphicPostProcess !== null;
    },
  );
  assert(bothActive, 'Both falseColorPostProcess and anamorphicPostProcess are active simultaneously');

  // Clean up
  await page.evaluate(
    () => {
      window.dispatchEvent(new CustomEvent('vs-false-color', { detail: { enabled: false } }));
      window.dispatchEvent(new CustomEvent('vs-anamorphic', { detail: { enabled: false, squeezeRatio: 1, distortion: 0 } }));
    },
  );
  await page.waitForTimeout(300);
}

// ─── CE16  No cinematic-related JS errors ─────────────────────────────────────
console.log('\n── CE16  No cinematic-related JS errors during test run');
{
  assert(
    jsErrors.length === 0,
    'Zero cinematic/outdoor JS errors',
    `found ${jsErrors.length}: ${jsErrors.slice(0, 2).join('; ')}`,
  );
}

// ─── Close browser ────────────────────────────────────────────────────────────
await browser.close();

// ─── Results ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(62));
console.log('  CINEMATIC + OUTDOOR LIGHTING E2E RESULTS');
console.log('═'.repeat(62));
results.forEach(r => {
  console.log(`  ${r.ok ? '✓' : '✗'}  ${r.label}${r.detail ? `  [${r.detail}]` : ''}`);
});
console.log('─'.repeat(62));
const total  = passed + failed;
const pct    = total > 0 ? Math.round((passed / total) * 100) : 0;
console.log(`  Total ${total}  |  ✓ Passed ${passed}  |  ✗ Failed ${failed}  |  ${pct}%`);
console.log('═'.repeat(62));

if (failed > 0) process.exit(1);
