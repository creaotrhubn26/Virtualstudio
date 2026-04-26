// One-off Playwright probe: boot the app, apply a live SceneAssembly,
// and report what actually landed in the Babylon scene.
//
// Run:  node scripts/e2e_babylon_probe.mjs
// Requires: backend on :8000 and Vite on VITE_URL (default http://localhost:5003)

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VITE_URL = process.env.VITE_URL || 'http://localhost:5003';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const OUT_DIR = resolve(__dirname, '../tmp-e2e-probe');
mkdirSync(OUT_DIR, { recursive: true });

const BEATS = {
  melancholy: {
    location: 'Oslo Café',
    intExt: 'INT',
    timeOfDay: 'DUSK',
    action:
      'Anna sits alone at a rain-streaked window reading a letter. A single pendant lamp glows overhead.',
    characters: ['Anna'],
    mood: 'melancholy',
  },
  beauty: {
    location: 'Studio',
    intExt: 'INT',
    timeOfDay: 'DAY',
    action:
      'Polished beauty portrait — elegant, clean, luminous. Subject faces camera with confident smile.',
    characters: ['Subject'],
    mood: 'grand',
  },
  horror: {
    location: 'Abandoned house',
    intExt: 'INT',
    timeOfDay: 'NIGHT',
    action: 'A figure crouches in the corner, turned away from a single bare bulb.',
    characters: ['Figure'],
    mood: 'horror',
  },
};
const beatKey = process.argv[2] || 'melancholy';
const beat = BEATS[beatKey] ?? BEATS.melancholy;

// CLI flags — kept permissive so invocations stay short.
//   --skip-props        : don't call the prop resolver (zero $ risk)
//   --meshy-timeout=N   : cap Meshy cache-miss wait (default 30 for smokes
//                         so we only get cache hits + BlenderKit, no spend)
const FLAGS = new Set(process.argv.slice(3));
const SKIP_PROPS = FLAGS.has('--skip-props');
const MESHY_TIMEOUT = Number(
  process.argv.slice(3).find((a) => a.startsWith('--meshy-timeout='))?.split('=')[1] ?? 30,
);
// --max-props=N truncates plan.props before we hand the assembly to
// applySceneAssembly. Default null = use whatever Claude authored. In
// smoke tests we cap this to contain Meshy credit spend — every prop
// that BlenderKit misses costs ~$0.10.
const MAX_PROPS_RAW = process.argv.slice(3).find((a) => a.startsWith('--max-props='))?.split('=')[1];
const MAX_PROPS = MAX_PROPS_RAW != null ? Number(MAX_PROPS_RAW) : null;
console.log(`[probe] beat = ${beatKey}  skipProps=${SKIP_PROPS}  meshyTimeout=${MESHY_TIMEOUT}s  maxProps=${MAX_PROPS ?? 'none'}`);

async function main() {
  console.log(`[probe] fetching assembly from ${BACKEND_URL}...`);
  const apiResp = await fetch(`${BACKEND_URL}/api/scene-director/from-beat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(beat),
  });
  if (!apiResp.ok) {
    console.error('[probe] backend returned', apiResp.status, await apiResp.text());
    process.exit(1);
  }
  const { assembly } = await apiResp.json();
  if (MAX_PROPS != null && assembly?.environmentPlan?.plan?.props) {
    const original = assembly.environmentPlan.plan.props.length;
    assembly.environmentPlan.plan.props = assembly.environmentPlan.plan.props.slice(0, MAX_PROPS);
    console.log(`[probe] truncated props ${original} → ${assembly.environmentPlan.plan.props.length}`);
  }
  // --cached-props-only replaces whatever Claude authored with a known-
  // cached set. Guarantees zero provider spend while still proving the
  // full pipeline (resolve → R2 → presigned URL → Babylon load).
  if (FLAGS.has('--cached-props-only') && assembly?.environmentPlan?.plan) {
    assembly.environmentPlan.plan.props = [
      {
        name: 'vintage brass typewriter',
        description: '',
        category: 'hero',
        priority: 'high',
        placementHint: 'on desk',
      },
      {
        name: 'Marble-topped café table, small round, white marble',
        description: '',
        category: 'hero',
        priority: 'medium',
        placementHint: 'center of floor',
      },
    ];
    console.log(`[probe] forced props to known-cached set (${assembly.environmentPlan.plan.props.length})`);
  }
  const sh = assembly.shot;
  const tri = (sh.shutterSpeedSec && sh.iso)
    ? ` 1/${Math.round(1 / sh.shutterSpeedSec)} ISO${sh.iso}`
    : ' (no shutter/iso)';
  console.log(
    `[probe] got assembly ${assembly.sceneId} — ${assembly.lighting.sources.length} lights, ` +
    `shot ${sh.focalLengthMm}mm f/${sh.apertureF}${tri}`,
  );
  writeFileSync(`${OUT_DIR}/assembly.json`, JSON.stringify(assembly, null, 2));

  console.log(`[probe] launching Chromium...`);
  const browser = await chromium.launch({
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    const t = msg.text();
    if (
      t.includes('[ERROR]') ||
      t.toLowerCase().includes('error') ||
      t.includes('[applySceneAssembly') ||
      t.includes('[probe]') ||
      t.startsWith('[Constructor]') ||
      t.startsWith('[Init]') ||
      t.startsWith('[applyScenarioPreset]')
    ) {
      console.log('  [page]', t);
    }
  });
  page.on('pageerror', (err) => console.log('  [pageerror]', err.message));

  console.log(`[probe] opening ${VITE_URL}`);
  await page.goto(VITE_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  console.log(`[probe] waiting for window.virtualStudio...`);
  await page.waitForFunction(
    () => !!window.virtualStudio && typeof window.virtualStudio.addLight === 'function',
    { timeout: 60_000 },
  );
  console.log(`[probe] virtualStudio ready`);

  // Give Babylon a moment to set up default HDRI + fit the camera
  await page.waitForTimeout(1500);

  // Snapshot "before"
  await page.screenshot({ path: `${OUT_DIR}/before.png`, fullPage: false });

  // Import and run applySceneAssembly from the app's module graph. Vite
  // exposes modules at /src/... during dev, so we dynamically import the
  // real source.
  const result = await page.evaluate(async ({ assembly, skipProps, meshyTimeout }) => {
    const mod = await import('/src/services/applySceneAssembly.ts');
    const snap = (label) => {
      const s = window.virtualStudio?.scene;
      const cam = window.virtualStudio?.camera;
      const cc = s?.clearColor;
      const ac = s?.ambientColor;
      // Count only meshes that are likely Director-placed props — the
      // external-GLB loader names root nodes "external_<timestamp>" and
      // their child meshes end up under that transform. We report total
      // meshes + the subset rooted at external_ prefixes so the delta
      // unambiguously shows props landing.
      const meshes = s?.meshes || [];
      const externalMeshes = meshes.filter((m) =>
        (m?.name || '').startsWith('external_') || (m?.id || '').startsWith('external_'),
      );
      return {
        label,
        sceneLights: s?.lights?.length ?? null,
        cameraPos: [cam?.position?.x, cam?.position?.y, cam?.position?.z],
        envTexture: s?.environmentTexture?.name ?? null,
        envIntensity: s?.environmentIntensity,
        clearColor: cc ? [cc.r, cc.g, cc.b] : null,
        ambientColor: ac ? [ac.r, ac.g, ac.b] : null,
        fogMode: s?.fogMode,
        fogDensity: s?.fogDensity,
        activePreset: window.environmentService?.getState?.().activePresetId ?? null,
        totalMeshes: meshes.length,
        externalMeshes: externalMeshes.length,
        externalMeshNames: externalMeshes.map((m) => m.name).slice(0, 8),
      };
    };
    const before = snap('before');
    const out = await mod.applySceneAssembly(assembly, {
      skipProps,
      propMeshyTimeoutSec: meshyTimeout,
    });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    // Wait up to 30s for external GLBs to fully hydrate — the 39 MB
    // typewriter takes several seconds over the presigned R2 URL + gzip.
    // We poll scene.meshes rather than sleeping a fixed duration so the
    // probe exits as soon as all expected props land.
    const expectedExternal = (out.props?.loaded ?? 0);
    if (expectedExternal > 0) {
      const start = performance.now();
      while (performance.now() - start < 30_000) {
        const now = snap('polling');
        if (now.externalMeshes >= expectedExternal) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    const after = snap('after');
    const diag = {
      hasEnvService: typeof window.environmentService === 'object',
      hasApplyPreset: typeof window.environmentService?.applyPreset === 'function',
      planPresetId: assembly.environmentPlan?.plan?.recommendedPresetId ?? null,
    };
    const scene = window.virtualStudio?.scene;
    const lightStates = (scene?.lights ?? []).map((l) => ({
      name: l.name,
      intensity: l.intensity,
      diffuse: l.diffuse ? [l.diffuse.r, l.diffuse.g, l.diffuse.b] : null,
      falloff: l.falloffType,
    }));
    return { out, before, after, diag, lightStates };
  }, { assembly, skipProps: SKIP_PROPS, meshyTimeout: MESHY_TIMEOUT });

  console.log('[probe] result:');
  console.log('  diag  :', result.diag);
  console.log('  before:', result.before);
  console.log('  after :', result.after);
  console.log('  envPresetApplied:', result.out.environmentPresetApplied);
  console.log('  atmosphereApplied:', result.out.atmosphereApplied);
  console.log('  warnings:', result.out.warnings);
  console.log('  scene light intensities:');
  for (const l of result.lightStates ?? []) {
    const c = l.diffuse ? `rgb(${l.diffuse.map((n) => n.toFixed(2)).join(',')})` : 'n/a';
    console.log(`    ${l.name.padEnd(24)} I=${l.intensity?.toFixed?.(2)} color=${c}`);
  }
  const iesHits = result.out.placedLights.filter((p) => p.ies?.applied).length;
  console.log(`  placedLights: ${result.out.placedLights.length} (${iesHits} with IES)`);
  for (const p of result.out.placedLights) {
    const ies = p.ies?.applied
      ? ` ies=${p.ies.label}`
      : p.ies
      ? ` ies=MISSING(${p.ies.iesUrl})`
      : ' ies=-';
    console.log(
      `    ${p.source.role.padEnd(10)} ${p.source.fixture.padEnd(30)} ` +
      `world=[${p.position.x.toFixed(2)},${p.position.y.toFixed(2)},${p.position.z.toFixed(2)}]${ies}`,
    );
  }
  if (result.out.camera) {
    const c = result.out.camera;
    console.log(
      `  camera.pos=[${c.position.x.toFixed(2)},${c.position.y.toFixed(2)},${c.position.z.toFixed(2)}] ` +
      `target=[${c.target.x.toFixed(2)},${c.target.y.toFixed(2)},${c.target.z.toFixed(2)}] ` +
      `fovRad=${c.fovRad.toFixed(3)}`,
    );
  }
  if (result.out.exposure) {
    const e = result.out.exposure;
    console.log(
      `  exposure: EV100=${e.ev100.toFixed(2)} multiplier=${e.multiplier.toFixed(3)} applied=${e.applied}`,
    );
  } else {
    console.log('  exposure: (no triangle in ShotPlan)');
  }
  if (result.out.hdri) {
    const h = result.out.hdri;
    console.log(
      `  hdri: id=${h.requestedId} → ${h.label} (${h.cctKelvin}K) url=${h.resolvedUrl} ` +
      `applied=${h.applied} fellBack=${h.fellBack}${h.fallbackReason ? ` reason="${h.fallbackReason}"` : ''}`,
    );
  } else {
    console.log('  hdri: (none requested)');
  }
  if (result.out.dof) {
    const d = result.out.dof;
    console.log(
      `  dof : enabled=${d.enabled} f/${d.fStop} ${d.focalLengthMm}mm ` +
      `focus=${d.focusDistanceM.toFixed(2)}m sensor=${d.sensorWidthMm}mm hint=${d.depthHint}`,
    );
  } else {
    console.log('  dof : (not applied)');
  }
  if (result.out.props) {
    const p = result.out.props;
    console.log(
      `  props: ${p.loaded}/${p.total} loaded, ${p.failed.length} failed, ${p.resolved} resolved`,
    );
    for (const item of p.items) {
      const tag = item.dispatched ? 'OK ' : 'MISS';
      const cache = item.cacheHit ? 'cache' : (item.provider ?? '—');
      const size = item.sizeKb != null ? `${item.sizeKb}KB` : '—';
      const t = item.elapsedSec != null ? `${item.elapsedSec.toFixed(1)}s` : '—';
      console.log(`    ${tag} [${cache.padEnd(10)}] ${t.padStart(6)} ${size.padStart(6)}  "${item.description.slice(0, 60)}"`);
    }
    for (const f of p.failed) {
      console.log(`    FAIL "${f.description.slice(0, 60)}" — ${f.error}`);
    }
  } else {
    console.log('  props: (skipped or none requested)');
  }

  // Wait a little longer when props were loaded — Babylon is still
  // fetching GLBs and hydrating meshes after dispatch returns.
  const settleMs = result.out.props?.loaded ? 6000 : 1500;
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: `${OUT_DIR}/after.png`, fullPage: false });
  console.log(`[probe] saved screenshots to ${OUT_DIR}`);

  // Keep open so the user can inspect — close after 25s
  await page.waitForTimeout(25_000);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
