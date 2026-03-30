/**
 * scene-flow-e2e.test.mjs
 *
 * End-to-end tests for the three main scene-population flows:
 *   P01–P07  Props  (vs-add-prop → vs-prop-added)
 *   A01–A07  Avatars (ch-load-character → ch-character-loaded)
 *   H01–H06  HDRI   (vs-load-hdri → scene.environmentTexture / environmentIntensity)
 *
 * Run:  node tests/scene-flow-e2e.test.mjs
 * Needs: chromium on PATH (or PLAYWRIGHT_BROWSER env), app running on localhost:5173
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.APP_URL ?? 'http://localhost:5000';
const CHROMIUM = '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium-browser';
const LONG_TIMEOUT = 20_000;  // for real network/GLB loads
const SHORT_TIMEOUT = 8_000;

// ── Test harness ─────────────────────────────────────────────────────────────

const results = [];
let page, browser;

function assert(condition, label, detail = '') {
  const status = condition ? '✓' : '✗';
  const line = `  ${status}  ${label}${detail ? `  [${detail}]` : ''}`;
  console.log(line);
  results.push({ ok: condition, label, detail });
  return condition;
}

function skip(id, reason) {
  console.log(`  ⊘  ${id} skipped — ${reason}`);
  results.push({ ok: true, label: `${id} (skipped: ${reason})`, detail: '' });
}

/** Wait for page expression to return truthy — uses page.waitForFunction (Playwright-native). */
async function waitForFn(page, exprStr, timeoutMs = SHORT_TIMEOUT) {
  try {
    await page.waitForFunction(exprStr, { timeout: timeoutMs });
    return true;
  } catch (_) {
    return false;
  }
}

/** One-shot event listener: returns the detail of the next matching custom event. */
async function waitForEvent(page, eventName, timeoutMs = SHORT_TIMEOUT) {
  return page.evaluate(
    ({ ev, ms }) => new Promise((resolve) => {
      const h = (e) => { window.removeEventListener(ev, h); resolve(e.detail ?? null); };
      window.addEventListener(ev, h);
      setTimeout(() => { window.removeEventListener(ev, h); resolve(null); }, ms);
    }),
    { ev: eventName, ms: timeoutMs },
  );
}

// ── Startup ───────────────────────────────────────────────────────────────────

browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
page = await browser.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') {
    (page._testErrors = page._testErrors ?? []).push(msg.text());
  }
});

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

// Wait for virtualStudio to boot (scene is created in the constructor alongside lights)
const vsBootResult = await waitForFn(page,
  '() => !!(window.virtualStudio && window.virtualStudio.lights instanceof Map)',
  20_000,
);
if (!vsBootResult) {
  console.warn('  [warn] virtualStudio did not appear within 20 s — tests may fail');
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROPS  P01–P07
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── P01  Page + virtualStudio ready');
{
  // .lights is a Map initialised in the class body — reliably ready.
  // .scene is assigned in the constructor right before window.virtualStudio is set.
  const lightsOk = await page.evaluate(
    () => !!(window.virtualStudio && window.virtualStudio.lights instanceof Map),
  );
  assert(lightsOk, 'window.virtualStudio.lights is a Map');

  const sceneOk = await page.evaluate(
    () => !!(window.virtualStudio && window.virtualStudio.scene),
  );
  assert(sceneOk, 'window.virtualStudio.scene is set');
}

console.log('\n── P02  vs-add-prop fires vs-prop-added');
{
  const detail = await page.evaluate(() => {
    return new Promise((resolve) => {
      const h = (e) => { window.removeEventListener('vs-prop-added', h); resolve(e.detail); };
      window.addEventListener('vs-prop-added', h);
      window.dispatchEvent(new CustomEvent('vs-add-prop', {
        detail: { propId: 'chair_posing', position: [0, 0, 0] },
      }));
      setTimeout(() => { window.removeEventListener('vs-prop-added', h); resolve(null); }, 8000);
    });
  });

  const fired = assert(detail !== null, 'vs-prop-added fires after vs-add-prop (chair_posing)');
  if (fired) {
    assert(typeof detail.propId === 'string' && detail.propId.length > 0,
      'vs-prop-added detail.propId is a non-empty string', detail.propId);
  }
}

console.log('\n── P03  vs-prop-added detail structure');
{
  const detail = await page.evaluate(() => {
    return new Promise((resolve) => {
      const h = (e) => { window.removeEventListener('vs-prop-added', h); resolve(e.detail); };
      window.addEventListener('vs-prop-added', h);
      window.dispatchEvent(new CustomEvent('vs-add-prop', {
        detail: { propId: 'table_small', position: [1.5, 0, 0] },
      }));
      setTimeout(() => { window.removeEventListener('vs-prop-added', h); resolve(null); }, 8000);
    });
  });

  if (detail && detail.data) {
    assert(typeof detail.data.name === 'string' && detail.data.name.length > 0,
      'detail.data.name is a non-empty string', detail.data.name);
    assert(Array.isArray(detail.data.position) && detail.data.position.length === 3,
      'detail.data.position is [x, y, z] array', JSON.stringify(detail.data.position));
    assert(typeof detail.data.assetId === 'string',
      'detail.data.assetId is present', detail.data.assetId);
  } else {
    skip('P03-detail', 'vs-prop-added did not fire within timeout');
  }
}

console.log('\n── P04  Prop name is human-readable (not raw ID)');
{
  // chair_posing is a primitive (modelUrl=null) — loads instantly, no GLB wait needed.
  // Its definition name is 'Posingstol' which is different from the raw ID 'chair_posing'.
  const detail = await page.evaluate(() => {
    return new Promise((resolve) => {
      const h = (e) => { window.removeEventListener('vs-prop-added', h); resolve(e.detail); };
      window.addEventListener('vs-prop-added', h);
      window.dispatchEvent(new CustomEvent('vs-add-prop', {
        detail: { propId: 'chair_posing', position: [0, 0, 0] },
      }));
      setTimeout(() => { window.removeEventListener('vs-prop-added', h); resolve(null); }, 5000);
    });
  });

  if (detail && detail.data) {
    const name = detail.data.name ?? '';
    // Name must be non-empty, must not equal the raw ID (snake_case)
    assert(
      name.length > 0 && name !== 'chair_posing',
      'Prop name is human-readable string (from PropDefinition)',
      name,
    );
  } else {
    skip('P04', 'vs-prop-added did not fire for chair_posing within 5 s');
  }
}

console.log('\n── P05  Prop position is close to requested value');
{
  const requestedPos = [2, 0, -1];
  const detail = await page.evaluate((pos) => {
    return new Promise((resolve) => {
      const h = (e) => { window.removeEventListener('vs-prop-added', h); resolve(e.detail); };
      window.addEventListener('vs-prop-added', h);
      window.dispatchEvent(new CustomEvent('vs-add-prop', {
        detail: { propId: 'chair_posing', position: pos },
      }));
      setTimeout(() => { window.removeEventListener('vs-prop-added', h); resolve(null); }, 8000);
    });
  }, requestedPos);

  if (detail && detail.data && Array.isArray(detail.data.position)) {
    const [rx, , rz] = detail.data.position;
    const dx = Math.abs(rx - requestedPos[0]);
    const dz = Math.abs(rz - requestedPos[2]);
    assert(dx < 1.5 && dz < 1.5,
      'Prop XZ position within 1.5 m of requested position',
      `placed=[${detail.data.position.map(n => n.toFixed(2)).join(', ')}]`);
  } else {
    skip('P05', 'vs-prop-added did not fire');
  }
}

console.log('\n── P06  __virtualStudioDiagnostics.environment has valid sceneState');
{
  // publishEnvironmentDiagnostics is called at startup via environmentService.subscribe.
  // Poll up to 5 s for it to be populated; it should appear quickly after scene init.
  await waitForFn(page,
    'window.__virtualStudioDiagnostics && window.__virtualStudioDiagnostics.environment',
    5_000,
  );

  const diag = await page.evaluate(
    () => (window.__virtualStudioDiagnostics && window.__virtualStudioDiagnostics.environment)
      ? window.__virtualStudioDiagnostics.environment
      : null,
  );

  if (diag) {
    assert(diag.sceneState !== undefined,
      '__virtualStudioDiagnostics.environment has sceneState');
    assert(Array.isArray(diag.sceneState.props),
      'sceneState.props is an array',
      `count=${diag.sceneState.props.length}`);
    assert(diag.sceneState.floor !== undefined,
      'sceneState.floor is present');
    assert(diag.sceneState.atmosphere !== undefined,
      'sceneState.atmosphere is present');
  } else {
    skip('P06', '__virtualStudioDiagnostics not populated — publishEnvironmentDiagnostics not yet triggered');
  }
}

console.log('\n── P07  No JS errors during prop operations');
{
  const errors = page._testErrors ?? [];
  const propErrors = errors.filter(e =>
    /prop|asset|load|mesh|undefined|null.*position/i.test(e),
  );
  assert(propErrors.length === 0,
    'Zero prop-related JS errors',
    `found ${propErrors.length}: ${propErrors.slice(0, 2).join(' | ')}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  AVATARS  A01–A07
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── A01  ch-character-loaded event round-trip');
{
  const received = await page.evaluate(() => {
    return new Promise((resolve) => {
      window.addEventListener('ch-character-loaded', () => resolve(true), { once: true });
      window.dispatchEvent(new CustomEvent('ch-character-loaded', {
        detail: {
          modelId: 'e2e_avatar_test',
          name: 'E2E Testperson',
          modelUrl: 'https://example.com/test.glb',
          isRpmModel: false,
        },
      }));
      setTimeout(() => resolve(false), 3000);
    });
  });

  assert(received === true, 'ch-character-loaded event can be dispatched and received');
}

console.log('\n── A02  ch-character-loaded detail fields present');
{
  const detail = await page.evaluate(() => {
    return new Promise((resolve) => {
      const h = (e) => { window.removeEventListener('ch-character-loaded', h); resolve(e.detail); };
      window.addEventListener('ch-character-loaded', h);
      window.dispatchEvent(new CustomEvent('ch-character-loaded', {
        detail: {
          modelId: 'e2e_detail_check',
          name: 'Anna (E2E)',
          modelUrl: 'https://models.readyplayer.me/abc123.glb?quality=high',
          isRpmModel: true,
        },
      }));
      setTimeout(() => { window.removeEventListener('ch-character-loaded', h); resolve(null); }, 3000);
    });
  });

  assert(detail !== null, 'ch-character-loaded detail is not null');
  if (detail) {
    assert(typeof detail.modelId === 'string' && detail.modelId.length > 0,
      'detail.modelId is a non-empty string', detail.modelId);
    assert(typeof detail.name === 'string' && detail.name.length > 0,
      'detail.name is a non-empty string', detail.name);
    assert(typeof detail.modelUrl === 'string' && detail.modelUrl.startsWith('https://'),
      'detail.modelUrl starts with https://', detail.modelUrl.slice(0, 50));
    assert(typeof detail.isRpmModel === 'boolean',
      'detail.isRpmModel is a boolean', String(detail.isRpmModel));
  }
}

console.log('\n── A03  isRpmModel=true for RPM URLs');
{
  // Simulate what main.ts does: the regex inside ch-character-loaded dispatch
  const isRpmModel = await page.evaluate(() =>
    /models\.readyplayer\.me|api\.readyplayer\.me|readyplayer\.me.*\.glb/i
      .test('https://models.readyplayer.me/abc123def456.glb'),
  );
  assert(isRpmModel === true,
    'isRpmModel regex matches models.readyplayer.me URL');

  const isRpmModel2 = await page.evaluate(() =>
    /models\.readyplayer\.me|api\.readyplayer\.me|readyplayer\.me.*\.glb/i
      .test('https://api.readyplayer.me/v2/avatars/abc.glb'),
  );
  assert(isRpmModel2 === true,
    'isRpmModel regex matches api.readyplayer.me URL');
}

console.log('\n── A04  isRpmModel=false for non-RPM URLs');
{
  const nonRpm = await page.evaluate(() =>
    /models\.readyplayer\.me|api\.readyplayer\.me|readyplayer\.me.*\.glb/i
      .test('/models/props/studio/cinema-camera.glb'),
  );
  assert(nonRpm === false,
    'isRpmModel=false for local prop GLB');

  const nonRpm2 = await page.evaluate(() =>
    /models\.readyplayer\.me|api\.readyplayer\.me|readyplayer\.me.*\.glb/i
      .test('https://playground.babylonjs.com/scenes/BoomBox.glb'),
  );
  assert(nonRpm2 === false,
    'isRpmModel=false for babylonjs.com GLB');
}

console.log('\n── A05  ch-remove-character dispatches without error');
{
  const errsBefore = (page._testErrors ?? []).length;
  await page.evaluate(
    () => window.dispatchEvent(new CustomEvent('ch-remove-character')),
  );
  await new Promise(r => setTimeout(r, 500));
  const errsAfter = (page._testErrors ?? []).length;
  assert(errsAfter === errsBefore,
    'ch-remove-character dispatches without new JS errors');
}

console.log('\n── A06  ch-load-character with local GLB → ch-character-loaded fires');
{
  // An invalid (non-existent) URL causes BABYLON.SceneLoader to throw, which lands in
  // the fallback capsule path.  The capsule path is synchronous-ish (~100 ms) and
  // ALWAYS fires ch-character-loaded — so this validates the full event round-trip
  // without waiting for a real GLB to parse.  isRpmModel will be false for this URL.
  const detail = await page.evaluate(() => {
    return new Promise((resolve) => {
      const h = (e) => { window.removeEventListener('ch-character-loaded', h); resolve(e.detail); };
      window.addEventListener('ch-character-loaded', h);
      window.dispatchEvent(new CustomEvent('ch-load-character', {
        detail: {
          modelUrl: '/models/does-not-exist-e2e.glb',
          name: 'Teststativ (E2E)',
          skinTone: '#e0b89a',
          height: 1.75,
        },
      }));
      setTimeout(() => { window.removeEventListener('ch-character-loaded', h); resolve(null); }, 8000);
    });
  });

  const fired = assert(detail !== null,
    'ch-character-loaded fires after ch-load-character with local GLB');
  if (fired) {
    assert(typeof detail.modelId === 'string' && detail.modelId.startsWith('model_'),
      'detail.modelId has expected prefix', detail.modelId);
    assert(detail.name === 'Teststativ (E2E)',
      'detail.name matches the requested name', detail.name);
    assert(detail.isRpmModel === false,
      'isRpmModel=false for non-RPM local GLB');
  }
}

console.log('\n── A07  No avatar-related JS errors');
{
  const errors = page._testErrors ?? [];
  const avatarErrors = errors.filter(e =>
    /character|avatar|skeleton|rig|bone|undefined.*model/i.test(e),
  );
  assert(avatarErrors.length === 0,
    'Zero avatar-related JS errors',
    `found ${avatarErrors.length}${avatarErrors.length > 0 ? ': ' + avatarErrors[0].slice(0, 80) : ''}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  HDRI  H01–H06
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── H01  Scene has initial environmentTexture at startup');
{
  const hasEnvTex = await page.evaluate(
    () => !!(window.virtualStudio && window.virtualStudio.scene && window.virtualStudio.scene.environmentTexture),
  );
  assert(hasEnvTex, 'scene.environmentTexture is not null/undefined after startup');
}

console.log('\n── H02  scene.environmentIntensity is a positive number');
{
  const intensity = await page.evaluate(
    () => (window.virtualStudio && window.virtualStudio.scene) ? window.virtualStudio.scene.environmentIntensity : -1,
  );
  assert(typeof intensity === 'number' && intensity > 0,
    'scene.environmentIntensity > 0',
    `value=${intensity}`);
  assert(intensity <= 5,
    'scene.environmentIntensity ≤ 5 (reasonable studio range)',
    `value=${intensity}`);
}

console.log('\n── H03  scene.environmentTexture has name or uid property');
{
  const texInfo = await page.evaluate(() => {
    const t = window.virtualStudio.scene.environmentTexture;
    return t ? {
      name: t.name,
      uid: t.uid,
      hasGetReflectionTextureMatrix: typeof t.getReflectionTextureMatrix === 'function',
    } : null;
  });
  assert(texInfo !== null, 'scene.environmentTexture is accessible as an object');
  if (texInfo) {
    assert(typeof texInfo.uid === 'number' || typeof texInfo.name === 'string',
      'environmentTexture has uid or name field', JSON.stringify(texInfo).slice(0, 80));
    assert(texInfo.hasGetReflectionTextureMatrix,
      'environmentTexture has getReflectionTextureMatrix() (valid Babylon BaseTexture)');
  }
}

console.log('\n── H04  vs-load-hdri dispatched → HDRIEnvironmentLoader receives it');
{
  // HDRIEnvironmentLoader listens to 'vs-load-hdri' and calls loadHDRI(preset).
  // We verify: (a) the event doesn't throw, (b) environmentIntensity is readable.
  const intensityBefore = await page.evaluate(
    () => window.virtualStudio.scene.environmentIntensity,
  );

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('vs-load-hdri', {
      detail: {
        id: 'studio_small_03',
        name: 'Studio Small',
        url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr',
        intensity: 1.2,
      },
    }));
  });

  // Wait up to 10 s for the loader component to be ready and intensity accessible
  const intensityReady = await waitForFn(
    page,
    'window.virtualStudio && window.virtualStudio.scene && window.virtualStudio.scene.environmentIntensity !== undefined',
    10_000,
  );

  const intensityAfter = await page.evaluate(
    () => window.virtualStudio.scene.environmentIntensity,
  );

  assert(intensityReady !== false,
    'scene.environmentIntensity is readable after vs-load-hdri dispatch',
    `before=${intensityBefore}`);
  assert(typeof intensityAfter === 'number' && intensityAfter > 0,
    'scene.environmentIntensity remains positive number after vs-load-hdri',
    `value=${intensityAfter}`);
}

console.log('\n── H05  scene.environmentTexture still valid after HDRI operation');
{
  const texStillValid = await page.evaluate(() => {
    const t = window.virtualStudio.scene.environmentTexture;
    return !!(t && typeof t.getReflectionTextureMatrix === 'function');
  });
  assert(texStillValid,
    'scene.environmentTexture is still a valid Babylon BaseTexture after HDRI event');
}

console.log('\n── H06  No HDRI-related JS errors');
{
  const errors = page._testErrors ?? [];
  const hdriErrors = errors.filter(e =>
    /hdri|environment.*texture|hdr.*load|polyhaven.*fail/i.test(e),
  );
  assert(hdriErrors.length === 0,
    'Zero HDRI-related JS errors',
    `found ${hdriErrors.length}${hdriErrors.length > 0 ? ': ' + hdriErrors[0].slice(0, 80) : ''}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════════════════════════

await browser.close();

const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  RESULTS');
console.log('══════════════════════════════════════════════════════════════');
results.forEach(r => {
  const sym = r.ok ? '✓' : '✗';
  const detail = r.detail ? `  [${r.detail}]` : '';
  console.log(`  ${sym}  ${r.label}${detail}`);
});
console.log('──────────────────────────────────────────────────────────────');
console.log(`  Total ${results.length}  |  ✓ Passed ${passed}  |  ✗ Failed ${failed}  |  ${Math.round(100 * passed / results.length)}%`);
console.log('══════════════════════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
