import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3103", trace: "on-first-retry" },
  webServer: {
    command: "bun --filter backstage dev -- --host 127.0.0.1 --port 3103",
    cwd: "../..",
    url: "http://127.0.0.1:3103",
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
