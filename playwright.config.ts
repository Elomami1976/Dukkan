import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 180000,
  use: { baseURL: 'http://127.0.0.1:1420', channel: process.env.PLAYWRIGHT_CHANNEL, viewport: { width: 1440, height: 1000 }, headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --configLoader runner', url: 'http://127.0.0.1:1420', reuseExistingServer: false, timeout: 120000 }
})
