/**
 * End-to-end probe for the director-scene auto-mount path.
 *
 * Hand-crafts a SceneAssembly with:
 *   • locationHint = Empire State coords (real, geocode would resolve)
 *   • environmentPlan.plan.props = [vintage brass typewriter, wooden crate]
 *     (both already cached in R2 from earlier sessions, so resolveProps
 *     hits cache for $0)
 *   • characters = the 5-char cast we built earlier — also cached
 *
 * Loads it into sessionStorage in a Playwright-controlled Chrome and
 * navigates to /director-scene.html. Watches for the page to mount
 * the LocationScene, resolve assets, and report counts.
 *
 * Cost: $0 (every described asset is already in R2 cache).
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const VITE_URL = process.env.VITE_URL ?? 'http://localhost:5003';
const OUT = '/Users/usmanqazi/Virtualstudio/tmp-e2e-probe';
mkdirSync(OUT, { recursive: true });

// All descriptions match prompts we've already paid for and uploaded
// to R2 — so resolveProps + resolveCast both hit cache.
const ASSEMBLY = {
  sceneId: 'probe-director-scene',
  sourceBeat: { location: 'Empire State Building', mood: 'cinematic' },
  environmentPlan: {
    plan: {
      props: [
        { name: 'vintage brass typewriter', description: '', category: 'hero', priority: 'high', placementHint: 'on desk' },
        { name: 'wooden crate', description: '', category: 'set_dressing', priority: 'low', placementHint: 'floor' },
      ],
    },
  },
  environmentPromptUsed: '',
  shot: { type: 'medium', angle: 'eye-level', framing: 'thirds', focalLengthMm: 50, apertureF: 2.8, depthOfField: 'normal', cameraHeightM: 1.65, cameraDistanceM: 2.2, movement: 'static', sensor: 'full-frame', rationale: '' },
  lighting: { pattern: 'loop', presetId: 'loop-soft', hdri: 'daylight-soft', ambientIntensity: 0.6, colorTempKelvin: 5600, keyToFillRatio: '4:1', moodNotes: '', sources: [] },
  characters: [
    { name: 'man-suit', description: 'cinematic humanoid man in dark suit, standing', avatarRef: null, needsGeneration: true, suggestedPlacement: null },
    { name: 'beard', description: 'cinematic man with beard, leather jacket, arms crossed', avatarRef: null, needsGeneration: true, suggestedPlacement: null },
    { name: 'elder', description: 'cinematic elderly man, worn cardigan, reading glasses', avatarRef: null, needsGeneration: true, suggestedPlacement: null },
  ],
  storyboardPrompt: '',
  directorNotes: ['probe-synthetic'],
  referenceAnalysis: null,
  locationHint: {
    query: 'Empire State Building',
    lat: 40.7484405,
    lon: -73.98566439999999,
    displayName: '20 W 34th St., New York, NY 10001, USA',
    placeId: 'ChIJaXQRs6lZwokRY6EFpJnhNNE',
    locationType: 'ROOFTOP',
    types: ['establishment'],
  },
};

console.log('[director-probe] launching Chrome…');
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
  if (m.type() === 'error' || /director-scene|locationScene|resolve|tile|GLB|prop|cast/i.test(t)) {
    console.log('  [page]', m.type(), t.slice(0, 220));
    if (m.type() === 'error') errs.push(t);
  }
});

// Step 1: bootstrap a blank page on the same origin, write to sessionStorage,
// then navigate to /director-scene.html. sessionStorage is per-origin so
// we just need any reachable URL on localhost:5003 first.
console.log('[director-probe] seeding sessionStorage…');
await page.goto(VITE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.evaluate((assembly) => {
  sessionStorage.setItem('vs:lastAssembly', JSON.stringify(assembly));
}, ASSEMBLY);

console.log('[director-probe] navigating to /director-scene.html…');
await page.goto(VITE_URL + '/director-scene.html', { waitUntil: 'domcontentloaded', timeout: 60_000 });

console.log('[director-probe] waiting for handle…');
await page.waitForFunction(
  () => Boolean(globalThis.directorScene?.scene),
  { timeout: 30_000 },
);

// Watch the scene grow over 90s — props are cache hits (fast), but
// the Cesium 3D Tiles still take 10-20s to fill the camera frustum.
console.log('[director-probe] settling 60s — tiles + props + cast hydrating…');
const started = Date.now();
let lastReport = 0;
let finalStats = null;
while (Date.now() - started < 60_000) {
  const stats = await page.evaluate(() => {
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
    const tileMeshes = meshes.length - propMeshes.length;
    return {
      total: meshes.length,
      tiles: tileMeshes,
      assets: propMeshes.length,
      assetRoots: assetsRoot ? assetsRoot.getChildren().length : 0,
      status: document.getElementById('status')?.textContent?.slice(0, 200) ?? '',
    };
  });
  if (Date.now() - lastReport > 4000) {
    console.log(
      `  t=${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `total=${stats?.total} tiles≈${stats?.tiles} assets=${stats?.assets} ` +
      `(roots=${stats?.assetRoots}) status="${stats?.status}"`,
    );
    lastReport = Date.now();
  }
  finalStats = stats;
  await new Promise((r) => setTimeout(r, 800));
}

await page.screenshot({ path: `${OUT}/director-scene.png` });
console.log(`[director-probe] screenshot → ${OUT}/director-scene.png`);
console.log('[director-probe] final:', JSON.stringify(finalStats));
console.log(`[director-probe] errors: ${errs.length}`);

await browser.close();
process.exit(errs.length === 0 && (finalStats?.assetRoots ?? 0) > 0 ? 0 : 1);
