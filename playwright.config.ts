import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
const managedServerEnabled = process.env.PLAYWRIGHT_MANAGED_SERVER !== '0';

// Replit NixOS: use system Chromium; bundled chrome-headless-shell is missing glib
const SYSTEM_CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    headless: process.env.PLAYWRIGHT_HEADLESS === '0' ? false : true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: SYSTEM_CHROMIUM,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        },
      },
    },
  ],
  webServer: managedServerEnabled
    ? {
        command: 'npm run dev -- --port 5173 --strictPort',
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
