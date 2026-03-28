import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
const managedServerEnabled = process.env.PLAYWRIGHT_MANAGED_SERVER !== '0';
const apiProxyTarget = process.env.PLAYWRIGHT_API_PROXY_TARGET || 'http://127.0.0.1:8001';
const viteUrl = new URL(baseURL);
const viteHost = process.env.PLAYWRIGHT_VITE_HOST || viteUrl.hostname || '127.0.0.1';
const vitePort = process.env.PLAYWRIGHT_VITE_PORT || viteUrl.port || '5173';

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
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: managedServerEnabled
    ? [
        {
          command: `python -m uvicorn backend.main:app --host 127.0.0.1 --port ${new URL(apiProxyTarget).port || '8001'}`,
          url: apiProxyTarget,
          timeout: 180_000,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: `VITE_API_PROXY_TARGET=${apiProxyTarget} VITE_E2E_EAGER_PANELS=1 VITE_PLAYWRIGHT_LIGHT_MODE=1 VITE_FORCE_OPTIMIZE_DEPS=1 PLAYWRIGHT_VITE_HOST=${viteHost} PLAYWRIGHT_VITE_PORT=${vitePort} node scripts/start-playwright-vite.mjs`,
          url: baseURL,
          timeout: 180_000,
          reuseExistingServer: !process.env.CI,
        },
      ]
    : undefined,
});
