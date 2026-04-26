/**
 * Headed-Chrome probe for the location+prop compositing test.
 * Pass URL via $URL env var. Reports total meshes + prop-rooted mesh
 * count after a 25s settle window, plus a screenshot.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL;
if (!URL) {
  console.error('set URL=… before running');
  process.exit(2);
}

const OUT = '/Users/usmanqazi/Virtualstudio/tmp-e2e-probe';
mkdirSync(OUT, { recursive: true });

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
  if (m.type() === 'error' || /\bload|glb|tile|error|locationscene\b/i.test(t)) {
    console.log('  [page]', m.type(), t.slice(0, 240));
    if (m.type() === 'error') errs.push(t);
  }
});

console.log('navigating →', URL.slice(0, 100), '…');
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForFunction(
  () => Boolean(globalThis.locationScene?.scene),
  { timeout: 30_000 },
);
console.log('mounted; settling 25s…');
await new Promise((r) => setTimeout(r, 25_000));

const stats = await page.evaluate(() => {
  const h = globalThis.locationScene;
  const s = h?.scene;
  if (!s) return { totalMeshes: -1, propMeshes: -1, assetsRootChildren: -1 };
  const meshes = s.meshes ?? [];
  const assetsRoot = s.transformNodes?.find((t) => t.name === 'locAssets');
  const propRoots = assetsRoot ? assetsRoot.getChildren?.() ?? [] : [];
  // Count meshes whose ancestry passes through assetsRoot.
  const isUnder = (node, target) => {
    let p = node?.parent;
    for (let i = 0; i < 12 && p; i++) {
      if (p === target) return true;
      p = p.parent;
    }
    return false;
  };
  const propMeshes = assetsRoot ? meshes.filter((m) => isUnder(m, assetsRoot)) : [];
  return {
    totalMeshes: meshes.length,
    propMeshes: propMeshes.length,
    assetsRootChildren: propRoots.length,
  };
});
console.log('stats:', JSON.stringify(stats));

await page.screenshot({ path: `${OUT}/composite.png` });
console.log(`screenshot → ${OUT}/composite.png`);
console.log(`errors: ${errs.length}`);

await browser.close();
process.exit(stats.propMeshes > 0 ? 0 : 1);
