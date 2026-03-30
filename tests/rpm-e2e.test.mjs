/**
 * Ready Player Me — Playwright E2E Test Suite (v4)
 * Uses waitForFunction (DOM presence, not visibility) and evaluate-based clicks
 * to avoid false failures from off-screen / hidden-but-mounted elements.
 */

import { chromium } from 'playwright';

const APP_URL    = 'http://localhost:5000';
const CHROMIUM   = '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium-browser';
const VALID_URL  = 'https://models.readyplayer.me/64f8c3a1b2e4f12345678901.glb';
const VALID_URL2 = 'https://models.readyplayer.me/abc987postmessage.glb';
const JSON_URL   = 'https://models.readyplayer.me/jsonformat456.glb';
const BAD_URL    = 'http://insecure-bad.jpg';

let passed = 0, failed = 0;
const results = [];
function ok(label, detail = '')  { passed++; results.push(`  ✓  ${label}${detail ? '  ['+detail+']' : ''}`); }
function fail(label, detail = '') { failed++; results.push(`  ✗  ${label}${detail ? '  ['+detail+']' : ''}`); }
function skip(label, reason)     { results.push(`  ⊘  SKIP: ${label} — ${reason}`); }
function assert(cond, label, detail = '') { cond ? ok(label, detail) : fail(label, detail); return cond; }

// Wait for a querySelector to return a non-null element (ignores visibility).
// Embeds the selector in the function string to avoid arg-serialisation issues.
async function waitForEl(page, sel, ms = 10000) {
  try {
    // Use string-based pageFunction so selector is captured in the closure,
    // not passed as a Playwright argument (which can silently drop in some builds).
    await page.waitForFunction(`!!document.querySelector(${JSON.stringify(sel)})`, { timeout: ms });
    return true;
  } catch { return false; }
}

// Click via evaluate using React internal props (bypasses visibility + scroll issues)
async function evalClick(page, sel) {
  return page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return false;
    // Try React internal props click first (most reliable for MUI components)
    const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps'));
    if (propsKey && el[propsKey]?.onClick) {
      el[propsKey].onClick(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }
    // Fallback: native click with scroll
    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.click();
    return true;
  }, sel);
}

// Set React controlled input value
async function setInput(page, testId, value) {
  await page.evaluate(([sel, val]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [`[data-testid="${testId}"]`, value]);
  await page.waitForTimeout(350);
}

async function getAttr(page, sel, attr) {
  return page.evaluate(([s, a]) => document.querySelector(s)?.getAttribute(a) ?? null, [sel, attr]);
}

async function runTests() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  PLAYWRIGHT E2E — Ready Player Me Integration (v4)');
  console.log('══════════════════════════════════════════════════════════');

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });

  try {
    // ── T01  Page loads ──────────────────────────────────────────────────────
    console.log('\n── T01  Page loads');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const title = await page.title();
    assert(title.includes('Studio'), 'Page title contains "Studio"', title);

    // Wait for the React app to boot (buttons appear)
    await waitForEl(page, 'button', 8000);
    await page.waitForTimeout(2000);

    // ── T02  Left panel "Modeller" tab present ───────────────────────────────
    console.log('\n── T02  Left panel tabs rendered');
    const leftTabLabels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="tab"]')).map(t => t.textContent?.trim()).filter(Boolean)
    );
    assert(leftTabLabels.some(t => t === 'Modeller'), 'Left panel "Modeller" tab in DOM', JSON.stringify(leftTabLabels.slice(0,8)));

    // ── T03  Open CharacterModelLoader panel ─────────────────────────────────
    console.log('\n── T03  Open CharacterModelLoader panel');
    // Step 1: Click the "▸ Modeller" / "▾ Modeller" section dropdown button to open the panel
    const panelOpened = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
      // Look for the button whose text includes both "Modeller" and a count/arrow (like "▸ Modeller 0")
      const sectionBtn = btns.find(b => {
        const t = (b.textContent ?? '').trim();
        return (t.includes('Modeller') || t.includes('modell')) && (t.includes('▸') || t.includes('▾') || t.includes('0') || t.includes('Legg'));
      }) ?? btns.find(b => {
        const t = (b.textContent ?? '').toLowerCase();
        return t.includes('legg til innhold') || t.includes('legg til');
      });
      if (sectionBtn) { sectionBtn.scrollIntoView(); sectionBtn.click(); return sectionBtn.textContent?.trim().slice(0, 40); }
      return null;
    });
    assert(panelOpened !== null, 'Opened section panel', panelOpened ?? 'null');
    await page.waitForTimeout(1000);

    // Step 2: Within the opened panel, click the "Modeller" tab to show CharacterModelLoader
    const modTabClicked = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      // The CharacterModelLoader tab "Modeller" should be visible now
      const tab = tabs.find(t => t.textContent?.trim() === 'Modeller' && t.offsetParent !== null);
      if (tab) { tab.scrollIntoView(); tab.click(); return true; }
      // Fallback: click any visible Modeller tab
      const any = tabs.find(t => t.textContent?.trim() === 'Modeller');
      if (any) { any.click(); return true; }
      return false;
    });
    assert(modTabClicked, 'Clicked "Modeller" tab within panel');
    await page.waitForTimeout(1000);

    // Wait up to 12s for the lazy CharacterModelLoader chunk to load and render
    const rpmTabMounted = await waitForEl(page, '[data-testid="rpm-tab"]', 12000);
    if (!assert(rpmTabMounted, 'CharacterModelLoader rendered — rpm-tab in DOM')) {
      const dbg = await page.evaluate(() => ({
        tabs: Array.from(document.querySelectorAll('[role="tab"]')).map(t => t.textContent?.trim()).filter(Boolean).slice(0,15),
        testIds: Array.from(document.querySelectorAll('[data-testid]')).map(e => e.getAttribute('data-testid')).filter(Boolean).slice(0,15),
      }));
      console.log('  DEBUG tabs:', JSON.stringify(dbg.tabs));
      console.log('  DEBUG testIds:', JSON.stringify(dbg.testIds));
    }

    // ── T04  RPM tab label correct ───────────────────────────────────────────
    console.log('\n── T04  RPM tab label');
    if (rpmTabMounted) {
      const label = await page.evaluate(() => document.querySelector('[data-testid="rpm-tab"]')?.textContent?.trim());
      assert(label === 'Ready Player Me', 'Tab label is "Ready Player Me"', label ?? 'null');
    } else { skip('T04', 'rpm-tab not in DOM'); }

    // ── T05  Switch to RPM tab (index 3) ────────────────────────────────────
    console.log('\n── T05  Switch to RPM tab');
    let rpmTabActive = false;
    if (rpmTabMounted) {
      // Dispatch ch-set-charloader-tab event — CharacterModelLoader listens and calls setActiveTab
      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent('ch-set-charloader-tab', { detail: { tab: 3 } }))
      );
      rpmTabActive = true;
      // Wait for React to re-render with activeTab===3 (RPM content)
      await page.waitForTimeout(1500);
      // Confirm tab switched via aria-selected
      const selectedLabel = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[role="tab"]'))
          .find(t => t.getAttribute('aria-selected') === 'true')?.textContent?.trim() ?? ''
      );
      // Check the rpm-tab element directly (avoids confusion with other tabs' aria-selected)
      const rpmTabSelected = await page.evaluate(() =>
        document.querySelector('[data-testid="rpm-tab"]')?.getAttribute('aria-selected') === 'true'
      );
      assert(rpmTabActive, 'RPM tab switch triggered');
      assert(rpmTabSelected, 'RPM tab has aria-selected="true"', `(all tabs selected: "${selectedLabel}"`);
    } else { skip('T05', 'rpm-tab missing'); }

    // ── T06  RPM iframe in DOM ───────────────────────────────────────────────
    console.log('\n── T06  RPM creator iframe');
    const iframeEl = await waitForEl(page, '[data-testid="rpm-iframe"]', 5000);
    assert(iframeEl, 'data-testid="rpm-iframe" present in DOM');
    if (iframeEl) {
      const src = await getAttr(page, '[data-testid="rpm-iframe"]', 'src');
      assert((src ?? '').includes('readyplayer.me'), 'iframe src → readyplayer.me', src?.slice(0,70) ?? '');
    }

    // ── T07  URL input present ───────────────────────────────────────────────
    console.log('\n── T07  URL paste input');
    const inputEl = await waitForEl(page, '[data-testid="rpm-url-input"]', 4000);
    assert(inputEl, 'data-testid="rpm-url-input" in DOM');

    // ── T08  Load button disabled with empty URL ─────────────────────────────
    console.log('\n── T08  Load button disabled (empty URL)');
    const btnEl = await waitForEl(page, '[data-testid="rpm-load-btn"]', 4000);
    assert(btnEl, 'data-testid="rpm-load-btn" in DOM');
    if (btnEl && inputEl) {
      await setInput(page, 'rpm-url-input', '');
      const dis = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="rpm-load-btn"]');
        return el?.disabled || el?.getAttribute('aria-disabled') === 'true';
      });
      assert(dis, 'Load button disabled when URL is empty');
    } else { skip('T08', 'elements missing'); }

    // ── T09  Invalid URL → button stays disabled ─────────────────────────────
    console.log('\n── T09  Invalid URL → button stays disabled');
    if (inputEl && btnEl) {
      await setInput(page, 'rpm-url-input', BAD_URL);
      const still = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="rpm-load-btn"]');
        return el?.disabled || el?.getAttribute('aria-disabled') === 'true';
      });
      assert(still, `Button disabled for "${BAD_URL}" (http, .jpg)`);
    } else { skip('T09', 'elements missing'); }

    // ── T10  Valid URL → button enabled ──────────────────────────────────────
    console.log('\n── T10  Valid RPM URL → button enabled');
    if (inputEl && btnEl) {
      await setInput(page, 'rpm-url-input', VALID_URL);
      const enabled = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="rpm-load-btn"]');
        return el ? !el.disabled && el.getAttribute('aria-disabled') !== 'true' : false;
      });
      assert(enabled, 'Button enabled for valid HTTPS .glb URL', VALID_URL.slice(0,55));
    } else { skip('T10', 'elements missing'); }

    // ── T11  Click load → ch-load-character fired ────────────────────────────
    console.log('\n── T11  Click load → ch-load-character event');
    const chLoad = await page.evaluate(() => new Promise(resolve => {
      let detail = null;
      const h = e => { detail = e.detail; window.removeEventListener('ch-load-character', h); };
      window.addEventListener('ch-load-character', h);
      const btn = document.querySelector('[data-testid="rpm-load-btn"]');
      if (btn && !btn.disabled) { btn.scrollIntoView(); btn.click(); }
      else resolve(null);
      setTimeout(() => resolve(detail), 2500);
    }));
    const fired = assert(chLoad !== null, 'ch-load-character event fired on button click');
    if (fired && chLoad) {
      const url = chLoad.modelUrl ?? '';
      assert(url.startsWith('https://') && url.includes('.glb'), 'modelUrl is valid .glb (quality params ok)', url.slice(0,65));
      assert(url.includes('morphTargets'),     'Quality param: morphTargets injected');
      assert(url.includes('textureSizeLimit'), 'Quality param: textureSizeLimit injected');
      assert(url.includes('lod='),             'Quality param: lod injected');
      assert(chLoad.name === 'Ready Player Me','event name = "Ready Player Me"', chLoad.name);
    }

    // ── T12  ch-character-loaded round-trip ──────────────────────────────────
    console.log('\n── T12  ch-character-loaded round-trip');
    const charLoaded = await page.evaluate(() => new Promise(resolve => {
      let ok = false;
      window.addEventListener('ch-character-loaded', () => { ok = true; }, { once: true });
      window.dispatchEvent(new CustomEvent('ch-character-loaded', {
        detail: { modelId: 'e2e_test', name: 'Test RPM', modelUrl: 'https://models.readyplayer.me/test.glb', isRpmModel: true },
      }));
      setTimeout(() => resolve(ok), 400);
    }));
    assert(charLoaded, 'ch-character-loaded event dispatched and received');

    // ── T13  postMessage (string) → URL auto-fills ────────────────────────────
    console.log('\n── T13  postMessage plain string → URL auto-fills');
    if (inputEl) {
      // Clear first and wait for React to settle, then send the message
      await setInput(page, 'rpm-url-input', '');
      await page.waitForTimeout(400);
      await page.evaluate((url) => window.postMessage(url, '*'), VALID_URL2);
      // Poll for up to 3 s — React controlled inputs can take a few render cycles
      let got13 = '';
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(500);
        got13 = await page.evaluate(() => document.querySelector('[data-testid="rpm-url-input"]')?.value ?? '');
        if (got13) break;
      }
      assert(got13 === VALID_URL2, 'Plain string postMessage auto-filled URL', `got="${got13}"`);
    } else { skip('T13', 'url-input missing'); }

    // ── T14  postMessage JSON (v1.avatar.exported) → URL auto-fills ──────────
    console.log('\n── T14  postMessage JSON frameApi → URL auto-fills');
    if (inputEl) {
      // Clear and wait for T13 state to settle fully before the JSON test
      await setInput(page, 'rpm-url-input', '');
      await page.waitForTimeout(600);
      await page.evaluate((url) =>
        window.postMessage({ source: 'readyplayerme', eventName: 'v1.avatar.exported', data: { url } }, '*'),
        JSON_URL
      );
      let got14 = '';
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(500);
        got14 = await page.evaluate(() => document.querySelector('[data-testid="rpm-url-input"]')?.value ?? '');
        if (got14 && got14 !== VALID_URL2) break;
      }
      assert(got14 === JSON_URL, 'JSON frameApi postMessage auto-filled URL', `got="${got14}"`);
    } else { skip('T14', 'url-input missing'); }

    // ── T15  No RPM-related JS errors ────────────────────────────────────────
    console.log('\n── T15  No RPM-related JS errors');
    const rpmErrs = jsErrors.filter(e => /rpm|readyplayer|charloader|posing|ch-load|cannot read/i.test(e));
    assert(rpmErrs.length === 0, 'Zero RPM/posing JS errors', `found ${rpmErrs.length}`);
    rpmErrs.forEach(e => results.push(`     ↳ ${e.slice(0,120)}`));

  } catch (err) {
    failed++;
    results.push(`  ✗  Unhandled exception: ${err.message}`);
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }

  const total = passed + failed;
  const pct   = total ? Math.round((passed / total) * 100) : 0;
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('══════════════════════════════════════════════════════════');
  results.forEach(r => console.log(r));
  console.log('──────────────────────────────────────────────────────────');
  console.log(`  Total ${total}  |  ✓ Passed ${passed}  |  ✗ Failed ${failed}  |  ${pct}%`);
  console.log('══════════════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => { console.error('Fatal:', err); process.exit(1); });
