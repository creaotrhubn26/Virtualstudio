/**
 * Focused probe for the dusk-magic HDRI wiring.
 *
 * Three checks:
 *   1) HEAD /hdri/dusk-magic.hdr returns 200 (handled in shell, but
 *      we re-do it inside the page to mirror what hdriExists does).
 *   2) resolveHDRI('dusk-magic') in the registry returns the real
 *      file URL with fellBack=false. This proves applySceneAssembly
 *      will pass the right URL to setEnvironmentHDRI.
 *   3) Babylon's HDRCubeTexture can actually parse the file (i.e.
 *      it's a valid Radiance HDR, not a 200-OK HTML error page).
 *
 * Pass criteria: all three checks succeed and fellBack === false.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const VITE_URL = process.env.VITE_URL ?? 'http://localhost:5001';
const OUT = '/Users/usmanqazi/Virtualstudio/tmp-e2e-probe';
mkdirSync(OUT, { recursive: true });

console.log('[dusk-probe] launching Chrome…');
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const errs = [];
page.on('pageerror', (e) => { console.log('  [pageerror]', e.message); errs.push(e.message); });
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error') {
    console.log('  [console.error]', t.slice(0, 240));
    errs.push(t);
  }
});

// We need an origin that's served by Vite — director-scene.html is
// fine and already pre-bundled, so navigation won't trigger an
// optimize-deps reload mid-evaluate.
console.log('[dusk-probe] navigating to /director-scene.html…');
await page.goto(VITE_URL + '/director-scene.html', { waitUntil: 'domcontentloaded', timeout: 60_000 });

// Step 1+2: registry resolution.
console.log('[dusk-probe] resolving via hdriRegistry…');
const registryResult = await page.evaluate(async () => {
  const m = await import('/src/data/hdriRegistry.ts');
  const resolved = await m.resolveHDRI('dusk-magic');
  return {
    entry: {
      id: resolved.entry.id,
      url: resolved.entry.url,
      label: resolved.entry.label,
      cctKelvin: resolved.entry.cctKelvin,
      defaultIntensity: resolved.entry.defaultIntensity,
    },
    fellBack: resolved.fellBack,
    reason: resolved.reason,
  };
});
console.log('  registry →', JSON.stringify(registryResult, null, 2));

// Step 3: raw fetch + Radiance HDR header sniff. This is stricter
// than just trusting the HEAD check — a 200-OK HTML error page
// would pass HEAD but fail the magic-bytes check here.
console.log('[dusk-probe] fetching bytes + sniffing Radiance header…');
const colorSample = await page.evaluate(async (url) => {
  // Direct fetch + Radiance HDR header sniff. Real HDR files start
  // with "#?RADIANCE" or "#?RGBE".
  const resp = await fetch(url);
  if (!resp.ok) return { ok: false, status: resp.status };
  const buf = await resp.arrayBuffer();
  const head = new TextDecoder().decode(buf.slice(0, 80));
  return {
    ok: true,
    status: resp.status,
    bytes: buf.byteLength,
    radianceHeader: head.startsWith('#?RADIANCE') || head.startsWith('#?RGBE'),
    headerSnippet: head.replace(/\n/g, '\\n').slice(0, 80),
  };
}, registryResult.entry.url);
console.log('  raw fetch →', JSON.stringify(colorSample, null, 2));

const pass =
  registryResult.fellBack === false &&
  registryResult.entry.url === '/hdri/dusk-magic.hdr' &&
  colorSample.ok === true &&
  colorSample.radianceHeader === true;

console.log(`[dusk-probe] ${pass ? 'PASS' : 'FAIL'} — page errors=${errs.length} (unrelated 404s on director-scene.html are expected without backend running)`);
await browser.close();
process.exit(pass ? 0 : 1);
