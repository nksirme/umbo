import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 240000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  workers: 1,
  reporter: 'line',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:5175',
    browserName: 'chromium',
    channel: 'chromium',
    headless: true,
    launchOptions: { args: ['--disable-gpu'] },
    reducedMotion: 'reduce',
    actionTimeout: 30000,
    navigationTimeout: 20000,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
