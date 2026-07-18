import { defineConfig, devices } from "@playwright/test";

// E2E tests assume the API (http://localhost:4000) and web (http://localhost:3000)
// dev servers are running. `reuseExistingServer` reuses them if already up, else
// Playwright starts the web server. Start the API separately: cd ../api && npm run dev
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
