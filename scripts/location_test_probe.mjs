/**
 * Headed-Chrome probe for the standalone Location Scene test page.
 * Loads http://localhost:5003/location-test.html?lat=…&lon=…, waits for
 * the 3D-tiles-renderer to stream geometry into the scene, screenshots,
 * and reports mesh + tile counts so we know the pipeline ran end-to-end.
 *
 *   node scripts/location_test_probe.mjs                       # Empire State default
 *   node scripts/location_test_probe.mjs 51.5007 -0.1246       # Big Ben
 *   node scripts/location_test_probe.mjs 35.6586 139.7454      # Tokyo Tower
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const lat = Number(process.argv[2] ?? 40.7484);
const lon = Number(process.argv[3] ?? -73.9857);
const provider = process.argv[4] ?? '';

const OUT = '/Users/usmanqazi/Virtualstudio/tmp-e2e-probe';
mkdirSync(OUT, { recursive: true });

const VITE = process.env.VITE_URL ?? 'http://localhost:5003';
const url = `${VITE}/location-test.html?lat=${lat}&lon=${lon}${
  provider ? `&provider=${provider}` : ''
}`;
console.log(`[loc-probe] navigating to ${url}`);

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  const t = msg.text();
  if (msg.type() === 'error' || /\berror\b/i.test(t) || /\[Cesium\]|\[3DTilesRenderer\]|\[Babylon\]|\[LocationScene\]/.test(t)) {
    console.log('  [page]', msg.type(), t.slice(0, 300));
    if (msg.type() === 'error') consoleErrors.push(t);
  }
});
page.on('pageerror', (e) => { console.log('  [pageerror]', e.message); consoleErrors.push(e.message); });
page.on('requestfailed', (req) => {
  if (/cesium|tile|googleapis|googleusercontent/.test(req.url())) {
    console.log('  [reqfail]', req.failure()?.errorText, req.url().slice(0, 100));
  }
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

console.log('[loc-probe] waiting for window.locationScene…');
await page.waitForFunction(
  () => Boolean((globalThis).locationScene && (globalThis).locationScene.scene),
  { timeout: 30_000 },
);
console.log('[loc-probe] scene mounted; streaming tiles for 25s…');

// Poll mesh count over the streaming window so we can see whether tiles
// keep arriving. 3D-tiles-renderer attaches loaded meshes as children of
// `tiles.group`, but also leaves them in `scene.meshes`.
const startedAt = Date.now();
let lastReport = 0;
while (Date.now() - startedAt < 25_000) {
  const stats = await page.evaluate(() => {
    const h = (globalThis).locationScene;
    const s = h?.scene;
    const t = h?.tiles;
    return {
      totalMeshes: s?.meshes?.length ?? -1,
      activeTiles: t?.visibleTiles?.size ?? null,
      downloadingTiles: t?.downloadingTiles?.size ?? null,
      cameraRadius: s?.activeCamera?.radius ?? null,
    };
  });
  if (Date.now() - lastReport > 3000) {
    console.log(
      `  t=${((Date.now() - startedAt) / 1000).toFixed(1)}s ` +
      `meshes=${stats.totalMeshes} ` +
      `visibleTiles=${stats.activeTiles ?? '?'} ` +
      `downloading=${stats.downloadingTiles ?? '?'}`,
    );
    lastReport = Date.now();
  }
  await new Promise((r) => setTimeout(r, 500));
}

await page.screenshot({ path: `${OUT}/location-after.png`, fullPage: false });
console.log(`[loc-probe] screenshot → ${OUT}/location-after.png`);

const final = await page.evaluate(() => ({
  totalMeshes: (globalThis).locationScene?.scene?.meshes?.length ?? -1,
}));
console.log(`[loc-probe] final mesh count: ${final.totalMeshes}`);
console.log(`[loc-probe] console errors: ${consoleErrors.length}`);
if (consoleErrors.length) {
  consoleErrors.slice(0, 5).forEach((e) => console.log('     ', e.slice(0, 250)));
}

await browser.close();
process.exit(consoleErrors.length === 0 && final.totalMeshes > 5 ? 0 : 1);
