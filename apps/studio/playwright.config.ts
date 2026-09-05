import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "production-preview.spec.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "VITE_BARBERSHOP_SETUP_SOURCE=memory VITE_CLIENT_MANAGEMENT_SOURCE=memory VITE_SCHEDULING_SOURCE=memory bun --filter studio dev -- --host 127.0.0.1 --port 3100",
    cwd: "../..",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
