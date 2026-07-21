import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "production-preview.spec.ts",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun --filter studio preview -- --host 127.0.0.1 --port 4173",
    cwd: "../..",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium-production",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
