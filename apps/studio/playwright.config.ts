import { defineConfig, devices } from "@playwright/test"

const port = process.env.STUDIO_E2E_PORT ?? "3100"
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "production-preview.spec.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `VITE_DEPLOY_TARGET=local VITE_BARBERSHOP_SETUP_SOURCE=memory VITE_CLIENT_MANAGEMENT_SOURCE=memory VITE_SCHEDULING_SOURCE=memory VITE_SERVICE_DESK_SOURCE=memory bun --filter studio dev -- --host 127.0.0.1 --port ${port}`,
    cwd: "../..",
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
