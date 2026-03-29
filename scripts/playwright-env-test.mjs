import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const APP_URL = 'http://localhost:5000';
const CHROMIUM_PATH = '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium';

const log = (...args) => console.log('[test]', ...args);

const browser = await chromium.launch({
  executablePath: CHROMIUM_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
});

const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const consoleLines = [];
page.on('console', msg => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => consoleLines.push(`[pageerror] ${err.message}`));

async function dismissModals() {
  // Dismiss any "Ikke nå" / "Lukk" / "Cancel" buttons in modals
  for (const label of ['Ikke nå', 'Lukk', 'Avbryt', 'Close']) {
    const btn = page.locator(`button:has-text("${label}")`).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      log(`Dismissed modal with button: "${label}"`);
      await page.waitForTimeout(500);
    }
  }
}

// ── 1. Load app ───────────────────────────────────────────────────────────────
log('Opening app…');
await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(8000);
await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-loaded.jpg` });
log('Screenshot 01: app loaded');

// ── 2. Confirm loader ─────────────────────────────────────────────────────────
const loaderFound = await page.evaluate(() => !!window.__storyLoader);
log(`__storyLoader found: ${loaderFound}`);
if (!loaderFound) { await browser.close(); process.exit(1); }

// ── helper ────────────────────────────────────────────────────────────────────
async function loadAndCapture(presetId, tag, filename) {
  log(`\n--- ${tag}: Loading ${presetId} ---`);
  await page.evaluate((id) => {
    window.__loadDone = false;
    const h = () => { window.__loadDone = true; window.removeEventListener('ch-story-scene-loaded', h); };
    window.addEventListener('ch-story-scene-loaded', h);
    window.__storyLoader.loadById(id);
  }, presetId);

  // Poll every 1s up to 45s
  let done = false;
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000);
    await dismissModals();
    done = await page.evaluate(() => window.__loadDone === true);
    if (done) { log(`${tag}: load completed at ${i+1}s`); break; }
  }
  if (!done) log(`${tag}: still loading after 45s — capturing anyway`);

  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${filename}` });
  log(`${tag}: screenshot → ${filename}`);
}

// ── 3. Load all three acts ────────────────────────────────────────────────────
await loadAndCapture('story-napoli-akt1-restaurant', 'Akt1', '02-akt1-restaurant.jpg');
await loadAndCapture('story-napoli-akt2-produktfoto', 'Akt2', '03-akt2-studio.jpg');
await loadAndCapture('story-napoli-akt3-video',       'Akt3', '04-akt3-videostudio.jpg');

// ── 4. Console summary ────────────────────────────────────────────────────────
log('\n=== Console (environment/scene related) ===');
const relevant = consoleLines.filter(l =>
  /environment|Environment|GLB|glb|napoli|Napoli|miljø|Miljø|story|phase|mesh|warn|error|Error/i.test(l)
);
relevant.forEach(l => log(l));
if (relevant.length === 0) {
  consoleLines.slice(-40).forEach(l => log(l));
}

await browser.close();
log('\nDone. Screenshots in screenshots/');
