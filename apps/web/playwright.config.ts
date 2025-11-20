import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'apps/web/tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'report.xml' }]
  ]
});
