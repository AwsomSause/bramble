import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PW_CHROMIUM_PATH;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/bramble/',
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
  ],
  webServer: {
    command: 'npm run build:e2e && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/bramble/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
