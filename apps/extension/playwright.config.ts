import { defineConfig } from '@playwright/test';

// End-to-end tests run against the built extension in .output/chrome-mv3.
// `pnpm e2e` builds first. Browsers: `pnpm exec playwright install chromium`.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
  },
});
