import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/live",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.STUDIO_LIVE_BASE_URL ?? "http://localhost:3102",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  outputDir: process.env.STUDIO_LIVE_OUTPUT_DIR ?? ".artifacts/initiative22/playwright-live",
  reporter: "list",
})
