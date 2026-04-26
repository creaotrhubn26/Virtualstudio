/**
 * End-to-end probe for the "police chases suspect through Times Square
 * at night" action beat. Exercises every wired-up tier:
 *
 *   • Scene Director composes the beat (Claude)
 *   • Geocoder resolves "Times Square, New York"
 *   • LocationScene mounts at the geocoded coords with NIGHT lighting
 *   • Director's split-pattern IES rig applied
 *   • shot.movement="handheld" → camera jitter
 *   • Resolver chain pulls 8 props + 2 characters (mostly fresh Meshy
 *     generations the first time, free cache hits afterwards)
 *
 * Cost ceiling: ~$0.50 in Meshy credits the first run. Subsequent
 * runs of the same beat are free.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const VITE = process.env.VITE_URL ?? 'http://localhost:5003';
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8000';
const OUT = '/Users/usmanqazi/Virtualstudio/tmp-e2e-probe';
mkdirSync(OUT, { recursive: true });

const beat = {
  location: 'Times Square, New York',
  intExt: 'EXT',
  timeOfDay: 'NIGHT',
  action:
    'A police officer in uniform chases a fleeing suspect in a black hoodie through neon-lit traffic. Sirens wail and rain glistens on the asphalt.',
  characters: ['Officer Chen', 'Suspect'],
  mood: 'tense',
};

console.log(`[chase-probe] POST ${BACKEND}/api/scene-director/from-beat`);
const apiResp = await fetch(`${BACKEND}/api/scene-director/from-beat`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(beat),
});
if (!apiResp.ok) {
  console.error(`[chase-probe] director failed: ${apiResp.status}`, await apiResp.text());
  process.exit(2);
}
const { assembly } = await apiResp.json();

const sh = assembly.shot;
const lighting = assembly.lighting;
const props = assembly.environmentPlan?.plan?.props ?? [];
const characters = assembly.characters ?? [];
console.log(`[chase-probe] director composed:`);
console.log(`  scene       : ${assembly.sceneId}`);
console.log(`  shot        : ${sh.type} ${sh.focalLengthMm}mm f/${sh.apertureF}  movement=${sh.movement}  angle=${sh.angle}`);
console.log(`  lighting    : ${lighting.pattern}  ratio=${lighting.keyToFillRatio}  cct=${lighting.colorTempKelvin}K  hdri=${lighting.hdri}`);
console.log(`  iesSources  : ${lighting.sources.length}`);
for (const s of lighting.sources) {
  console.log(`     ${s.role.padEnd(10)} ${s.fixture.padEnd(25)} mod=${s.modifier} cct=${s.colorTempKelvin}K`);
}
console.log(`  characters  : ${characters.length}`);
for (const c of characters) {
  console.log(`     ${c.name.padEnd(20)} needs=${c.needsGeneration} desc="${(c.description || '').slice(0, 50)}"`);
}
console.log(`  props       : ${props.length}`);
for (const p of props) {
  console.log(`     ${(p.name || '?').slice(0, 50)}`);
}
console.log(`  locationHint: ${assembly.locationHint?.displayName} (${assembly.locationHint?.lat.toFixed(4)}, ${assembly.locationHint?.lon.toFixed(4)})`);

if (!assembly.locationHint) {
  console.error('[chase-probe] expected locationHint for Times Square; aborting');
  process.exit(3);
}

console.log(`\n[chase-probe] launching Chrome…`);
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

const errs = [];
page.on('pageerror', (e) => { console.log('  [pageerror]', e.message); errs.push(e.message); });
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' || /director|location|tile|prop|cast|rig|movement|lighting/i.test(t)) {
    console.log('  [page]', m.type(), t.slice(0, 240));
    if (m.type() === 'error') errs.push(t);
  }
});

// Seed sessionStorage on the same origin first, then navigate.
console.log('[chase-probe] seeding sessionStorage…');
await page.goto(`${VITE}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.evaluate((a) => sessionStorage.setItem('vs:lastAssembly', JSON.stringify(a)), assembly);

console.log('[chase-probe] navigating to /director-scene.html…');
await page.goto(`${VITE}/director-scene.html`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForFunction(() => Boolean(globalThis.directorScene?.scene), { timeout: 30_000 });

// Watch for up to 20 min. Resolver concurrency=2 means 10 fresh
// generations take ~10-12 min; cached props/cast finish in seconds.
const TOTAL_WATCH_MS = 20 * 60 * 1000;
const start = Date.now();
let lastReport = 0;
let lastSnap = null;
while (Date.now() - start < TOTAL_WATCH_MS) {
  const snap = await page.evaluate(() => {
    const h = globalThis.directorScene;
    const s = h?.scene;
    if (!s) return null;
    const meshes = s.meshes ?? [];
    const assetsRoot = s.transformNodes?.find((t) => t.name === 'locAssets');
    const isUnder = (node, target) => {
      let p = node?.parent;
      for (let i = 0; i < 12 && p; i++) { if (p === target) return true; p = p.parent; }
      return false;
    };
    const propMeshes = assetsRoot ? meshes.filter((m) => isUnder(m, assetsRoot)) : [];
    return {
      total: meshes.length,
      assets: propMeshes.length,
      assetRoots: assetsRoot ? assetsRoot.getChildren().length : 0,
      lights: s.lights?.length ?? 0,
      exposure: s.imageProcessingConfiguration?.exposure ?? null,
      cameraAlpha: s.activeCamera?.alpha ?? null,
      cameraRadius: s.activeCamera?.radius ?? null,
      status: document.getElementById('status')?.textContent?.slice(0, 200) ?? '',
    };
  });
  if (snap) lastSnap = snap;
  if (snap && Date.now() - lastReport > 6000) {
    console.log(
      `  t=${((Date.now() - start) / 1000).toFixed(0)}s ` +
      `total=${snap.total} assets=${snap.assets}/${snap.assetRoots} lights=${snap.lights} ` +
      `exp=${snap.exposure?.toFixed(2)} cam.α=${snap.cameraAlpha?.toFixed(3)} ` +
      `r=${snap.cameraRadius?.toFixed(0)}m  status="${snap.status}"`,
    );
    lastReport = Date.now();
  }
  // Bail early if status indicates everything's loaded
  if (snap?.status?.match(/props \d+\/\d+, cast \d+\/\d+/)) {
    const m = snap.status.match(/props (\d+)\/(\d+).+cast (\d+)\/(\d+)/);
    if (m && m[1] === m[2] && m[3] === m[4]) {
      console.log(`[chase-probe] all assets resolved at t=${((Date.now() - start)/1000).toFixed(0)}s`);
      // Wait one more 30s for tiles to finish + camera shake to be visible in screenshot
      await new Promise((r) => setTimeout(r, 30_000));
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 2000));
}

await page.screenshot({ path: `${OUT}/action-chase.png` });
console.log(`[chase-probe] screenshot → ${OUT}/action-chase.png`);
console.log('[chase-probe] final:', JSON.stringify(lastSnap));
console.log(`[chase-probe] errors: ${errs.length}`);

await browser.close();
process.exit(errs.length === 0 ? 0 : 1);
