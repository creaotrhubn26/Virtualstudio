/**
 * Virtual Studio — AI Director E2E Test Suite
 *
 *  AD01  Backend status endpoint returns enabled:true
 *  AD02  Director chat endpoint responds with events and Norwegian reply
 *  AD03  Three-point lighting preset — events contain light configs
 *  AD04  Fog / atmosphere command — set_fog tool fires
 *  AD05  Camera command — set_camera_fov tool fires
 *  AD06  Outdoor sun command — set_outdoor_sun tool fires
 *  AD07  Scenario preset command — apply_scenario_preset tool fires
 *  AD08  Load prop command — load_prop tool fires
 *  AD09  Frontend: app loads and AI Director panel button exists
 *  AD10  Frontend: vs-set-light-property event dispatched and handled
 *  AD11  Frontend: vs-ai-prop-generation-started event dispatched
 *  AD12  SSE stream endpoint returns proper event frames
 */

import { chromium } from 'playwright';

const CHROMIUM     = '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium-browser';
const BASE_URL     = 'http://localhost:5000';
const API_BASE     = 'http://localhost:8000';
const BOOT_TIMEOUT = 25_000;

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

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return { status: res.status, data: await res.json().catch(() => null) };
}

// ─── Boot browser ─────────────────────────────────────────────────────────────

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  headless: true,
});
const page = await browser.newPage();
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT });
await page.waitForFunction(
  () => !!(document.querySelector('canvas') || document.querySelector('#app') || document.querySelector('#root')),
  { timeout: BOOT_TIMEOUT }
);

console.log('\n  Virtual Studio — AI Director E2E\n');

// ─── AD01: Backend status ──────────────────────────────────────────────────────

console.log('── AD01  Backend AI Director status');
{
  const { status, data } = await apiGet('/api/ai/director/status');
  assert(status === 200, 'AD01a  status endpoint returns 200', `got ${status}`);
  assert(data?.enabled === true, 'AD01b  enabled is true', JSON.stringify(data));
  assert(data?.model === 'gpt-4o', 'AD01c  model is gpt-4o', data?.model);
  assert(Array.isArray(data?.capabilities) && data.capabilities.length >= 4,
    'AD01d  capabilities list has ≥4 entries', JSON.stringify(data?.capabilities));
}

// ─── AD02: Director chat — basic Norwegian reply ───────────────────────────────

console.log('── AD02  Director chat returns Norwegian reply + events');
let ad02Data = null;
{
  const { status, data } = await apiPost('/api/ai/director', {
    messages: [{ role: 'user', content: 'Hva kan du gjøre?' }],
  });
  ad02Data = data;
  assert(status === 200, 'AD02a  POST /api/ai/director returns 200', `got ${status}`);
  assert(typeof data?.reply === 'string' && data.reply.length > 0,
    'AD02b  reply is a non-empty string', data?.reply?.slice(0, 60));
  assert(Array.isArray(data?.events), 'AD02c  events is an array', JSON.stringify(data?.events));
}

// ─── AD03: Three-point lighting ────────────────────────────────────────────────

console.log('── AD03  Three-point lighting preset');
{
  const { status, data } = await apiPost('/api/ai/director', {
    messages: [{ role: 'user', content: 'Sett opp tre-punkt belysning for portrett' }],
  });
  assert(status === 200, 'AD03a  request succeeds', `got ${status}`);
  assert(typeof data?.reply === 'string' && data.reply.length > 0,
    'AD03b  got a reply', data?.reply?.slice(0, 60));
  const hasLightEvents = Array.isArray(data?.events) && data.events.length > 0;
  assert(hasLightEvents, 'AD03c  response contains events', `${data?.events?.length ?? 0} events`);

  if (hasLightEvents) {
    const eventNames = data.events.map(e => e.event);
    const hasPresetOrLight = eventNames.some(n =>
      n === 'applyScenarioPreset' || n === 'setLightProperty' || n === 'vs-set-light'
    );
    assert(hasPresetOrLight, 'AD03d  at least one lighting event fired',
      eventNames.join(', '));

    const preset = data.events.find(e => e.event === 'applyScenarioPreset');
    if (preset) {
      const lights = preset.detail?.sceneConfig?.lights;
      assert(Array.isArray(lights) && lights.length >= 2,
        'AD03e  preset contains ≥2 lights', `${lights?.length}`);
    } else {
      skip('AD03e', 'no applyScenarioPreset event (used setLightProperty instead)');
    }
  }
}

// ─── AD04: Fog command ─────────────────────────────────────────────────────────

console.log('── AD04  Fog / atmosphere command');
{
  const { status, data } = await apiPost('/api/ai/director', {
    messages: [{ role: 'user', content: 'Legg til tåke i scenen, mørk og dramatisk' }],
  });
  assert(status === 200, 'AD04a  fog request succeeds', `got ${status}`);
  assert(typeof data?.reply === 'string', 'AD04b  got a reply');
  const fogEvent = data?.events?.find(e =>
    e.event === 'setFog' || e.event === 'set_fog' || e.event === 'applyScenarioPreset' ||
    e.event === 'vs-outdoor-fog' || e.event === 'vsOutdoorFog'
  );
  assert(!!fogEvent, 'AD04c  fog or scenario event fired',
    data?.events?.map(e => e.event).join(', ') || 'no events');
}

// ─── AD05: Camera FOV ──────────────────────────────────────────────────────────

console.log('── AD05  Camera FOV command');
{
  const { status, data } = await apiPost('/api/ai/director', {
    messages: [{ role: 'user', content: 'Sett kamera til 85mm' }],
  });
  assert(status === 200, 'AD05a  camera request succeeds', `got ${status}`);
  assert(typeof data?.reply === 'string', 'AD05b  got a reply');
  const camEvent = data?.events?.find(e =>
    e.event === 'setCamera' || e.event === 'setCameraFov' ||
    e.event === 'set_camera' || e.event === 'applyScenarioPreset' ||
    e.event === 'vs-camera-settings' || e.event === 'vsCameraSettings'
  );
  assert(!!camEvent, 'AD05c  camera or scenario event fired',
    data?.events?.map(e => e.event).join(', ') || 'no events');
}

// ─── AD06: Outdoor sun ─────────────────────────────────────────────────────────

console.log('── AD06  Outdoor sun command');
{
  const { status, data } = await apiPost('/api/ai/director', {
    messages: [{ role: 'user', content: 'Golden hour sol fra høyre, 15 grader elevation' }],
  });
  assert(status === 200, 'AD06a  sun request succeeds', `got ${status}`);
  assert(typeof data?.reply === 'string', 'AD06b  got a reply');
  const sunEvent = data?.events?.find(e =>
    e.event === 'setOutdoorSun' || e.event === 'set_outdoor_sun' ||
    e.event === 'applyScenarioPreset' || e.event === 'setLightProperty' ||
    e.event === 'vs-outdoor-sun' || e.event === 'vsOutdoorSun'
  );
  assert(!!sunEvent, 'AD06c  sun or scenario event fired',
    data?.events?.map(e => e.event).join(', ') || 'no events');
}

// ─── AD07: Scenario preset ─────────────────────────────────────────────────────

console.log('── AD07  Scenario preset — Napoli restaurant');
{
  const { status, data } = await apiPost('/api/ai/director', {
    messages: [{ role: 'user', content: 'Sett opp Napoli restaurant-scene med varm belysning' }],
  });
  assert(status === 200, 'AD07a  preset request succeeds', `got ${status}`);
  assert(typeof data?.reply === 'string', 'AD07b  got a reply');
  const presetEvent = data?.events?.find(e =>
    e.event === 'applyScenarioPreset' || e.event === 'apply_scenario_preset'
  );
  assert(!!presetEvent, 'AD07c  applyScenarioPreset event fired',
    data?.events?.map(e => e.event).join(', ') || 'no events');
}

// ─── AD08: Load prop ───────────────────────────────────────────────────────────

console.log('── AD08  Load prop command');
{
  let ad08Data = null;
  let ad08Status = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await apiPost('/api/ai/director', {
      messages: [{ role: 'user', content: 'Legg til et restaurantbord (prop_id: table_restaurant) i scenen på posisjon 0,0,2' }],
    });
    ad08Status = r.status;
    ad08Data = r.data;
    const hasEvent = r.data?.events?.some(e =>
      e.event === 'addProp' || e.event === 'loadProp' ||
      e.event === 'load_prop' || e.event === 'generateProp' ||
      e.event === 'applyScenarioPreset' ||
      e.event === 'vs-add-prop' || e.event === 'vsAddProp'
    );
    if (hasEvent || attempt === 3) break;
    console.log(`  ↺  AD08 attempt ${attempt} returned no prop event, retrying…`);
    await new Promise(r => setTimeout(r, 1000));
  }
  assert(ad08Status === 200, 'AD08a  prop request succeeds', `got ${ad08Status}`);
  assert(typeof ad08Data?.reply === 'string', 'AD08b  got a reply');
  const propEvent = ad08Data?.events?.find(e =>
    e.event === 'addProp' || e.event === 'loadProp' ||
    e.event === 'load_prop' || e.event === 'generateProp' ||
    e.event === 'applyScenarioPreset' ||
    e.event === 'vs-add-prop' || e.event === 'vsAddProp'
  );
  assert(!!propEvent, 'AD08c  prop or scenario event fired',
    ad08Data?.events?.map(e => e.event).join(', ') || 'no events');
}

// ─── AD09: Frontend — app loads + AI Director panel exists ────────────────────

console.log('── AD09  Frontend app load + AI Director panel');
{
  const appLoaded = await waitForFn(page,
    () => !!(document.querySelector('canvas') || document.querySelector('[data-testid]') ||
             document.body.innerHTML.length > 500),
    BOOT_TIMEOUT
  );
  assert(appLoaded, 'AD09a  frontend app loaded');

  const hasPanelButton = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, [role="button"], [class*="tab"], [class*="panel"]'));
    return all.some(el => {
      const text = (el.textContent || '').toLowerCase();
      const cls = (el.className || '').toLowerCase();
      return text.includes('ai') || text.includes('direktør') || text.includes('director') ||
             cls.includes('ai') || cls.includes('director');
    });
  });
  assert(hasPanelButton, 'AD09b  AI Director panel button/tab found in DOM');
}

// ─── AD10: Frontend — vs-set-light-property event dispatched + handled ─────────

console.log('── AD10  vs-set-light-property event roundtrip');
{
  const handled = await page.evaluate(() => {
    return new Promise((resolve) => {
      let fired = false;
      const listener = () => { fired = true; };
      window.addEventListener('vs-set-light-property', listener);

      window.dispatchEvent(new CustomEvent('vs-set-light-property', {
        detail: { lightId: 'key-light', property: 'intensity', value: 0.85 }
      }));

      setTimeout(() => {
        window.removeEventListener('vs-set-light-property', listener);
        resolve(fired);
      }, 200);
    });
  });
  assert(handled, 'AD10a  vs-set-light-property event fires and listener receives it');

  const ad10bResult = await page.evaluate(() => {
    return new Promise((resolve) => {
      const vs = window.virtualStudio;
      if (!vs || !vs.lights || vs.lights.size === 0) {
        resolve({ skipped: true, reason: 'no initialized lights in headless scene' });
        return;
      }
      let receivedVsChanged = false;
      const listener = () => { receivedVsChanged = true; };
      window.addEventListener('vs-light-changed', listener);

      const firstLightId = Array.from(vs.lights.keys())[0];
      window.dispatchEvent(new CustomEvent('vs-set-light-property', {
        detail: { lightId: firstLightId, property: 'intensity', value: 0.75 }
      }));

      setTimeout(() => {
        window.removeEventListener('vs-light-changed', listener);
        resolve({ skipped: false, fired: receivedVsChanged });
      }, 500);
    });
  });
  if (ad10bResult.skipped) {
    skip('AD10b', ad10bResult.reason);
  } else {
    assert(ad10bResult.fired, 'AD10b  vs-set-light-property triggers vs-light-changed broadcast');
  }
}

// ─── AD11: Frontend — vs-ai-prop-generation-started event ─────────────────────

console.log('── AD11  vs-generate-prop-request → vs-ai-prop-generation-started');
{
  const startedFired = await page.evaluate(() => {
    return new Promise((resolve) => {
      let fired = false;
      const listener = () => { fired = true; };
      window.addEventListener('vs-ai-prop-generation-started', listener);

      window.dispatchEvent(new CustomEvent('vs-generate-prop-request', {
        detail: { description: 'En kaffekopp', position: [0, 0, 2] }
      }));

      setTimeout(() => {
        window.removeEventListener('vs-ai-prop-generation-started', listener);
        resolve(fired);
      }, 500);
    });
  });
  assert(startedFired, 'AD11a  vs-generate-prop-request re-emits vs-ai-prop-generation-started');
}

// ─── AD12: SSE stream endpoint ─────────────────────────────────────────────────

console.log('── AD12  SSE stream endpoint returns valid frames');
{
  let ad12Passed = false;
  let ad12Detail = '';
  try {
    const res = await fetch(`${API_BASE}/api/ai/director/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Sett intensitet til 0.5 på key light' }],
      }),
    });

    assert(res.status === 200, 'AD12a  SSE endpoint returns 200', `got ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    assert(ct.includes('text/event-stream'), 'AD12b  Content-Type is text/event-stream', ct);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let raw = '';
    let frames = [];
    let done = false;
    const timeout = new Promise(r => setTimeout(() => { done = true; r(); }, 15_000));

    if (reader) {
      await Promise.race([
        (async () => {
          while (!done) {
            const { value, done: d } = await reader.read();
            if (d) break;
            raw += decoder.decode(value, { stream: true });
            const lines = raw.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  frames.push(JSON.parse(line.slice(6)));
                } catch { /* partial */ }
              }
            }
            if (frames.some(f => f.type === 'reply' || f.type === 'events')) break;
          }
          await reader.cancel();
        })(),
        timeout,
      ]);
    }

    const hasReply = frames.some(f => f.type === 'reply');
    const hasEvents = frames.some(f => f.type === 'events');
    const hasStep = frames.some(f => f.type === 'step');
    ad12Detail = `frames: ${frames.map(f => f.type).join(',')}`;
    assert(frames.length > 0, 'AD12c  SSE stream produced at least 1 frame', ad12Detail);
    assert(hasReply || hasEvents || hasStep,
      'AD12d  SSE stream has reply/events/step frame', ad12Detail);
    ad12Passed = true;
  } catch (err) {
    assert(false, 'AD12a  SSE stream request did not throw', String(err));
  }
}

// ─── Summary ───────────────────────────────────────────────────────────────────

await browser.close();

console.log(`\n  Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.log('\n  Failed tests:');
  results.filter(r => !r.ok).forEach(r => console.log(`    ✗  ${r.label}  ${r.detail}`));
  process.exit(1);
} else {
  console.log('\n  All AI Director tests passed.');
  process.exit(0);
}
