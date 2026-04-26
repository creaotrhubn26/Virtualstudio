/**
 * API-key collector — opens every signup page we need in tabs so you can
 * fill them in one go. Prints clear instructions per service in this
 * terminal so you know exactly what to copy back.
 *
 * Usage:
 *   node scripts/open_api_signups.mjs
 *
 * Browser stays open. Close it when you're done; this script then exits.
 *
 * Already in .env (no action needed):
 *   ANTHROPIC_API_KEY      — Claude (director + vision)
 *   MESHY_API_KEY          — Meshy text-to-3D + rigging
 *   BLENDERKIT_API_KEY     — BlenderKit search + download
 *   REPLICATE_API_TOKEN    — Tripo / TripoSR / FLUX / Trellis
 *   CLOUDFLARE_R2_*        — R2 storage
 *   DATABASE_URL           — Neon Postgres
 *
 * Missing keys (this script opens):
 *   BLOCKADE_API_KEY       — Skybox env generation (REQUIRED next step)
 *   GOOGLE_MAP_TILES_KEY   — Google Photoreal 3D Tiles (phase 2 NYC etc.)
 *   CESIUM_ION_TOKEN       — alternative geometric truth tier (fallback)
 *   OPENAI_API_KEY         — optional, gpt-image-1 + DALL-E
 *   GEMINI_API_KEY         — optional, fallback planner
 */

import { chromium } from 'playwright';

const KEYS = [
  {
    env: 'BLOCKADE_API_KEY',
    name: 'Blockade Labs Skybox',
    blocking: true,
    url: 'https://skybox.blockadelabs.com/api',
    instructions: [
      '1. Sign in / create account (Google login works)',
      '2. Go to API → API key section',
      '3. Free tier gives ~10 generations/day; paid $9.99/mo for ~120',
      '4. Copy the API key — paste into chat',
    ],
  },
  {
    env: 'GOOGLE_MAP_TILES_KEY',
    name: 'Google Photorealistic 3D Tiles',
    blocking: false,
    url: 'https://console.cloud.google.com/apis/library/tile.googleapis.com',
    instructions: [
      '1. Create / select a Google Cloud project',
      '2. ENABLE the Map Tiles API',
      '3. Credentials → Create credentials → API key',
      '4. Restrict to Map Tiles API + your domain in production',
      '5. Free tier: ~28k tile requests/day',
    ],
  },
  {
    env: 'CESIUM_ION_TOKEN',
    name: 'Cesium ion (3D Tiles fallback)',
    blocking: false,
    url: 'https://ion.cesium.com/tokens',
    instructions: [
      '1. Sign up at cesium.com/ion (free tier exists)',
      '2. Tokens → Create token (read-only is fine for streaming)',
      '3. Free tier: 5 GB streamed/month',
    ],
  },
  {
    env: 'OPENAI_API_KEY',
    name: 'OpenAI (optional — image gen alt)',
    blocking: false,
    url: 'https://platform.openai.com/api-keys',
    instructions: [
      '1. Skip if you only use Replicate FLUX',
      '2. Otherwise: Create new secret key',
    ],
  },
  {
    env: 'GEMINI_API_KEY',
    name: 'Google Gemini (optional fallback planner)',
    blocking: false,
    url: 'https://aistudio.google.com/apikey',
    instructions: [
      '1. Free tier exists',
      '2. Used as Claude fallback only',
    ],
  },
];

const banner = (txt) => `\n[36m${'='.repeat(70)}\n${txt}\n${'='.repeat(70)}[0m`;
const yellow = (txt) => `[33m${txt}[0m`;
const green = (txt) => `[32m${txt}[0m`;

async function main() {
  console.log(banner('API KEY COLLECTOR'));
  console.log('Opening tabs for all keys we still need.\n');
  console.log(yellow(`BLOCKING (need now to proceed):`));
  for (const k of KEYS.filter((k) => k.blocking)) {
    console.log(`  • ${k.env}  → ${k.name}`);
  }
  console.log(yellow(`\nOPTIONAL (can do later, in priority order):`));
  for (const k of KEYS.filter((k) => !k.blocking)) {
    console.log(`  • ${k.env}  → ${k.name}`);
  }

  const browser = await chromium.launch({
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    args: ['--no-sandbox', '--start-maximized'],
  });
  const ctx = await browser.newContext({ viewport: null });

  for (const k of KEYS) {
    const page = await ctx.newPage();
    await page.goto(k.url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
    console.log(banner(`${k.env}  —  ${k.name}`));
    console.log(`URL: ${k.url}`);
    for (const line of k.instructions) {
      console.log(`   ${line}`);
    }
    if (k.blocking) console.log(green(`\n   ↳ paste key into chat when ready`));
  }

  console.log(banner('Browser is open. Sign up to each service in its own tab.'));
  console.log('When done with the BLOCKING keys, paste them into chat.');
  console.log('Close the browser to exit this script.\n');

  // Wait until the user closes the browser.
  await new Promise((resolve) => {
    browser.on('disconnected', resolve);
  });
  console.log('Browser closed. Bye.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
