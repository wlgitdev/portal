import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    // Normally unset: scripts/dev-setup/06_playwright.sh installs Chromium
    // where Playwright expects it. Some sandboxes preinstall a browser at a
    // fixed, non-standard path instead; point PW_CHROMIUM_PATH at it there
    // rather than hardcoding a path that would break everyone else.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  // Orders renders as a grid at >=720px and a plain-HTML card list below it
  // (design's own "hand over a phone" breakpoint). The default phone viewport
  // drives the card list; grid tests set a desktop viewport and reach the
  // grid's DOM only through e2e/support/grid.ts.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: [
    {
      command: 'dotnet run --project src/PortalLite.Api',
      url: 'http://localhost:5080/api/customers',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npx ng serve',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
