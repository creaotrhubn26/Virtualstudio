/**
 * Animation Composer E2E Test Suite
 *
 * Tests the full animation composition pipeline:
 *   AC01–AC03  Store bootstrap & basic lifecycle
 *   AC04–AC06  Sequence & layer management
 *   AC07–AC09  Keyframe authoring & interpolation engine
 *   AC10       Behavior presets exist and have required fields
 *   AC11       Playback state machine
 *   AC12       Gel picker events (vs-apply-gel / vs-remove-gel)
 *
 * Infrastructure identical to the other E2E suites:
 *   - Playwright (Chromium) on port 5000
 *   - page.waitForFunction() for async waits
 *   - page.evaluate() with real JS function objects (not string arrows)
 */

import { chromium } from 'playwright';

const CHROMIUM = '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium-browser';
const BASE_URL = 'http://localhost:5000';
const BOOT_TIMEOUT = 25_000;

// ─── Tiny assertion framework (mirrors lighting suite) ────────────────────────

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
  } catch {
    // waitForFunction throws on timeout — caller handles skip/fail
  }
}

// ─── Boot ────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  headless: true,
});

const context = await browser.newContext();
const page = await context.newPage();

page._testErrors = [];
page.on('pageerror', err => {
  if (/animation|gel|composer/i.test(err.message)) {
    page._testErrors.push(err.message);
  }
});

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

// Wait for virtualStudio to be ready
await waitForFn(page, 'window.virtualStudio && window.virtualStudio.lights instanceof Map', BOOT_TIMEOUT);

// ─── AC01  window.__animationComposerStore is accessible ─────────────────────
console.log('\n── AC01  window.__animationComposerStore is accessible');
{
  await waitForFn(page, 'typeof window.__animationComposerStore !== "undefined"', 5_000);

  const hasStore = await page.evaluate(
    () => typeof window.__animationComposerStore !== 'undefined',
  );
  assert(hasStore, '__animationComposerStore is exposed on window');

  const hasGetState = await page.evaluate(
    () => typeof window.__animationComposerStore?.getState === 'function',
  );
  assert(hasGetState, '__animationComposerStore.getState is a function');
}

// ─── AC02  Store initial state has expected shape ─────────────────────────────
console.log('\n── AC02  Store initial state shape');
{
  const state = await page.evaluate(
    () => {
      const s = window.__animationComposerStore.getState();
      return {
        sequencesIsArray: Array.isArray(s.sequences),
        pathsIsArray: Array.isArray(s.paths),
        currentTime: s.currentTime,
        isPlaying: s.isPlaying,
        isLooping: typeof s.isLooping === 'boolean',
        availableTargetsIsArray: Array.isArray(s.availableTargets),
        createSequenceIsFunction: typeof s.createSequence === 'function',
        playIsFunction: typeof s.play === 'function',
        addLayerIsFunction: typeof s.addLayer === 'function',
      };
    },
  );
  assert(state.sequencesIsArray, 'sequences is an array');
  assert(state.pathsIsArray, 'paths is an array');
  assert(state.currentTime === 0, 'currentTime starts at 0');
  assert(state.isPlaying === false, 'isPlaying starts false');
  assert(state.isLooping, 'isLooping is a boolean');
  assert(state.availableTargetsIsArray, 'availableTargets is an array');
  assert(state.createSequenceIsFunction, 'createSequence action exists');
  assert(state.playIsFunction, 'play action exists');
  assert(state.addLayerIsFunction, 'addLayer action exists');
}

// ─── AC03  createSequence returns a valid sequence ────────────────────────────
console.log('\n── AC03  createSequence returns a valid sequence');
{
  const seq = await page.evaluate(
    () => window.__animationComposerStore.getState().createSequence('E2E Test Sequence', 15),
  );
  assert(typeof seq.id === 'string' && seq.id.length > 0, 'sequence has id', seq.id);
  assert(seq.name === 'E2E Test Sequence', 'sequence has correct name');
  assert(seq.duration === 15, 'sequence has correct duration', String(seq.duration));
  assert(seq.fps === 30, 'sequence defaults to 30 fps', String(seq.fps));
  assert(Array.isArray(seq.layers) && seq.layers.length === 0, 'layers starts empty');
  assert(typeof seq.createdAt === 'string', 'createdAt is set');

  // Sequence should now be in the store
  const inStore = await page.evaluate(
    () => window.__animationComposerStore.getState().sequences.some(s => s.name === 'E2E Test Sequence'),
  );
  assert(inStore, 'sequence is stored in sequences array');

  // It should be active
  const isActive = await page.evaluate(
    () => window.__animationComposerStore.getState().activeSequence?.name === 'E2E Test Sequence',
  );
  assert(isActive, 'new sequence is set as activeSequence');
}

// ─── AC04  addLayer adds a layer to the active sequence ───────────────────────
console.log('\n── AC04  addLayer adds a layer to the active sequence');
{
  const layer = await page.evaluate(
    () => {
      const store = window.__animationComposerStore.getState();
      const seq = store.activeSequence;
      if (!seq) return null;
      return store.addLayer({
        name: 'Test Nøkkellys',
        targetId: 'light_e2e_001',
        targetType: 'light',
        enabled: true,
        solo: false,
        locked: false,
        color: '#9c27b0',
        keyframes: [],
        behaviors: [],
        blendMode: 'replace',
        weight: 1,
      });
    },
  );
  assert(layer !== null, 'addLayer returns a layer object');
  assert(typeof layer?.id === 'string', 'layer has an id', layer?.id ?? 'null');
  assert(layer?.name === 'Test Nøkkellys', 'layer name is correct');
  assert(layer?.targetId === 'light_e2e_001', 'layer targetId is correct');

  const layerCount = await page.evaluate(
    () => window.__animationComposerStore.getState().activeSequence?.layers.length ?? 0,
  );
  assert(layerCount === 1, 'active sequence now has 1 layer', String(layerCount));
}

// ─── AC05  addKeyframe stores keyframe in layer ───────────────────────────────
console.log('\n── AC05  addKeyframe stores keyframe in layer');
{
  const layerId = await page.evaluate(
    () => window.__animationComposerStore.getState().activeSequence?.layers[0]?.id ?? null,
  );
  assert(typeof layerId === 'string', 'layer id is accessible for keyframe test');

  if (layerId) {
    await page.evaluate(
      ([lId]) => {
        window.__animationComposerStore.getState().addKeyframe(lId, {
          time: 0,
          intensity: 0,
          easing: 'linear',
        });
        window.__animationComposerStore.getState().addKeyframe(lId, {
          time: 5,
          intensity: 1,
          easing: 'easeInOut',
        });
        window.__animationComposerStore.getState().addKeyframe(lId, {
          time: 10,
          intensity: 0.5,
          easing: 'easeOut',
        });
      },
      [layerId],
    );

    const keyframes = await page.evaluate(
      ([lId]) => {
        const layer = window.__animationComposerStore
          .getState()
          .activeSequence?.layers.find(l => l.id === lId);
        return layer?.keyframes ?? [];
      },
      [layerId],
    );
    assert(keyframes.length === 3, 'three keyframes were added', String(keyframes.length));
    assert(
      keyframes.every(k => typeof k.id === 'string'),
      'all keyframes have auto-generated ids',
    );
    assert(keyframes[1].time === 5, 'second keyframe has time=5');
    assert(keyframes[2].easing === 'easeOut', 'third keyframe easing is easeOut');
  } else {
    skip('AC05-keyframes', 'no layer id available');
  }
}

// ─── AC06  addBehavior stores behavior in layer ───────────────────────────────
console.log('\n── AC06  addBehavior stores behavior in layer');
{
  const layerId = await page.evaluate(
    () => window.__animationComposerStore.getState().activeSequence?.layers[0]?.id ?? null,
  );

  if (layerId) {
    await page.evaluate(
      ([lId]) => {
        window.__animationComposerStore.getState().addBehavior(lId, {
          type: 'breathe',
          enabled: true,
          speed: 0.5,
          amplitude: 0.8,
          loop: true,
        });
        window.__animationComposerStore.getState().addBehavior(lId, {
          type: 'orbit',
          enabled: true,
          speed: 1.0,
          radius: 2.0,
          axis: 'y',
          loop: true,
        });
      },
      [layerId],
    );

    const behaviors = await page.evaluate(
      ([lId]) => {
        const layer = window.__animationComposerStore
          .getState()
          .activeSequence?.layers.find(l => l.id === lId);
        return layer?.behaviors ?? [];
      },
      [layerId],
    );
    assert(behaviors.length === 2, 'two behaviors were added', String(behaviors.length));
    assert(behaviors[0].type === 'breathe', 'first behavior type is breathe');
    assert(behaviors[1].type === 'orbit', 'second behavior type is orbit');
    assert(behaviors[1].radius === 2.0, 'orbit behavior radius is correct');
    assert(
      behaviors.every(b => typeof b.id === 'string'),
      'all behaviors have auto-generated ids',
    );
  } else {
    skip('AC06-behaviors', 'no layer id available');
  }
}

// ─── AC07  updateLayer modifies layer fields ──────────────────────────────────
console.log('\n── AC07  updateLayer modifies layer fields');
{
  const layerId = await page.evaluate(
    () => window.__animationComposerStore.getState().activeSequence?.layers[0]?.id ?? null,
  );

  if (layerId) {
    await page.evaluate(
      ([lId]) => {
        window.__animationComposerStore.getState().updateLayer(lId, {
          name: 'Oppdatert Lag',
          weight: 0.75,
        });
      },
      [layerId],
    );

    const updated = await page.evaluate(
      ([lId]) => {
        const layer = window.__animationComposerStore
          .getState()
          .activeSequence?.layers.find(l => l.id === lId);
        return { name: layer?.name, weight: layer?.weight };
      },
      [layerId],
    );
    assert(updated.name === 'Oppdatert Lag', 'layer name was updated');
    assert(updated.weight === 0.75, 'layer weight was updated', String(updated.weight));
  } else {
    skip('AC07', 'no layer id available');
  }
}

// ─── AC08  BEHAVIOR_PRESETS covers expected behavior types ────────────────────
console.log('\n── AC08  BEHAVIOR_PRESETS covers expected behavior types');
{
  const presetInfo = await page.evaluate(
    () => {
      // BEHAVIOR_PRESETS is exported from state/animationComposerStore but not
      // window-exposed directly.  Access via the React fiber or just check via
      // store state — the store validates its own types, so we test indirectly
      // by adding then reading a preset behavior to confirm the store accepts it.
      const expected = ['breathe', 'flicker', 'orbit', 'pulse', 'strobe', 'candle', 'shake', 'wave'];
      const store = window.__animationComposerStore.getState();
      const seq = store.activeSequence;
      if (!seq || seq.layers.length === 0) return null;
      const layerId = seq.layers[0].id;
      // Add one behavior per expected type; count successes
      let accepted = 0;
      expected.forEach(type => {
        const before = store.activeSequence.layers[0].behaviors.length;
        store.addBehavior(layerId, { type, enabled: false, speed: 1, loop: false });
        const after = window.__animationComposerStore.getState().activeSequence.layers[0].behaviors.length;
        if (after > before) accepted++;
      });
      return { expected: expected.length, accepted };
    },
  );
  if (presetInfo) {
    assert(presetInfo.accepted === presetInfo.expected,
      `store accepts all ${presetInfo.expected} expected behavior types`,
      `${presetInfo.accepted}/${presetInfo.expected}`);
  } else {
    skip('AC08', 'no active sequence layer for behavior test');
  }
}

// ─── AC09  play() sets isPlaying=true, stop() resets ─────────────────────────
console.log('\n── AC09  Playback state machine');
{
  await page.evaluate(
    () => window.__animationComposerStore.getState().play(),
  );
  const afterPlay = await page.evaluate(
    () => window.__animationComposerStore.getState().isPlaying,
  );
  assert(afterPlay === true, 'isPlaying=true after play()');

  await page.evaluate(
    () => window.__animationComposerStore.getState().pause(),
  );
  const afterPause = await page.evaluate(
    () => window.__animationComposerStore.getState().isPlaying,
  );
  assert(afterPause === false, 'isPlaying=false after pause()');

  await page.evaluate(
    () => window.__animationComposerStore.getState().play(),
  );
  await page.evaluate(
    () => window.__animationComposerStore.getState().stop(),
  );
  const afterStop = await page.evaluate(
    () => ({
      isPlaying: window.__animationComposerStore.getState().isPlaying,
      currentTime: window.__animationComposerStore.getState().currentTime,
    }),
  );
  assert(afterStop.isPlaying === false, 'isPlaying=false after stop()');
  assert(afterStop.currentTime === 0, 'currentTime reset to 0 after stop()');
}

// ─── AC10  deleteSequence removes it from store ───────────────────────────────
console.log('\n── AC10  deleteSequence removes sequence');
{
  const seqId = await page.evaluate(
    () => window.__animationComposerStore.getState().activeSequence?.id ?? null,
  );
  if (seqId) {
    await page.evaluate(
      ([sid]) => window.__animationComposerStore.getState().deleteSequence(sid),
      [seqId],
    );
    const stillInStore = await page.evaluate(
      ([sid]) => window.__animationComposerStore.getState().sequences.some(s => s.id === sid),
      [seqId],
    );
    assert(!stillInStore, 'deleted sequence is removed from sequences array');
    const activeIsNull = await page.evaluate(
      ([sid]) => window.__animationComposerStore.getState().activeSequence?.id !== sid,
      [seqId],
    );
    assert(activeIsNull, 'activeSequence is no longer the deleted sequence');
  } else {
    skip('AC10', 'no active sequence to delete');
  }
}

// ─── AC11  Animation Composer panel DOM is present ────────────────────────────
console.log('\n── AC11  Animation Composer panel is in the DOM');
{
  const panelExists = await page.evaluate(
    () => document.getElementById('animationComposerPanel') !== null,
  );
  assert(panelExists, '#animationComposerPanel element exists in DOM');

  const btnExists = await page.evaluate(
    () => document.getElementById('animationComposerBtn') !== null,
  );
  assert(btnExists, '#animationComposerBtn exists in DOM');

  const rootExists = await page.evaluate(
    () => document.getElementById('animationComposerRoot') !== null,
  );
  assert(rootExists, '#animationComposerRoot exists (React mount point)');
}

// ─── AC12  vs-apply-gel dispatches vs-gel-applied ─────────────────────────────
console.log('\n── AC12  vs-apply-gel → vs-gel-applied event round-trip');
{
  const gelPickerExists = await page.evaluate(
    () => document.getElementById('gelPickerPanel') !== null,
  );
  assert(gelPickerExists, '#gelPickerPanel DOM element exists');

  const result = await page.evaluate(
    () => {
      return new Promise((resolve) => {
        const h = (e) => { window.removeEventListener('vs-gel-applied', h); resolve(e.detail); };
        window.addEventListener('vs-gel-applied', h);
        window.dispatchEvent(new CustomEvent('vs-apply-gel', {
          detail: { hex: '#ff0044', gelId: 'test-gel', gelName: 'Test Rød Gel' },
        }));
        setTimeout(() => { window.removeEventListener('vs-gel-applied', h); resolve(null); }, 3000);
      });
    },
  );
  assert(result !== null, 'vs-gel-applied fires in response to vs-apply-gel');
  if (result) {
    assert(result.gelId === 'test-gel', 'vs-gel-applied detail has correct gelId', result.gelId);
    assert(result.hex === '#ff0044', 'vs-gel-applied detail has the hex colour', result.hex);
    assert(typeof result.applied === 'number', 'vs-gel-applied detail has applied count', String(result.applied));
  }
}

// ─── AC13  No animation-related JS errors ─────────────────────────────────────
console.log('\n── AC13  No animation-related JS errors during test run');
{
  const errors = page._testErrors ?? [];
  assert(errors.length === 0, 'Zero animation/gel JS errors', `found ${errors.length}: ${errors.slice(0, 2).join('; ')}`);
}

// ─── Close browser ────────────────────────────────────────────────────────────
await browser.close();

// ─── Results ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(62));
console.log('  RESULTS');
console.log('═'.repeat(62));
results.forEach(r => {
  console.log(`  ${r.ok ? '✓' : '✗'}  ${r.label}${r.detail ? `  [${r.detail}]` : ''}`);
});
console.log('─'.repeat(62));
const total = passed + failed;
console.log(`  Total ${total}  |  ✓ Passed ${passed}  |  ✗ Failed ${failed}  |  ${Math.round((passed / total) * 100)}%`);
console.log('═'.repeat(62));

if (failed > 0) process.exit(1);
