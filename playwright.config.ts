import 'dotenv/config';

import { defineConfig, devices } from '@playwright/test';

const isLiveProviderRun = process.env.MARKET_DATA_PROVIDER === 'twelvedata';
const serverCommand = isLiveProviderRun ? 'npm run dev:server:e2e:live' : 'npm run dev:server:e2e';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: !isLiveProviderRun,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  workers: isLiveProviderRun ? 1 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command: serverCommand,
      url: 'http://127.0.0.1:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'npm run dev:client:e2e',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
