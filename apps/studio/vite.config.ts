/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"
import { isMemorySourceEnabled } from "./vite-source-boundary.js"

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), "VITE_")
  const developmentSandboxEntry =
    command === "serve"
      ? "./src/dev/sandbox/entry.ts"
      : "./src/modules/shared/config/development-sandbox-disabled.ts"
  const schedulingPrototypeEnabled = isMemorySourceEnabled(
    publicEnv.VITE_SCHEDULING_SOURCE,
    publicEnv.VITE_DEPLOY_TARGET,
  )
  const schedulingPrototypeEntry = schedulingPrototypeEnabled
    ? "./src/dev/scheduling/entry.ts"
    : "./src/modules/shared/config/scheduling-prototype-disabled.ts"
  const serviceDeskSourceEntry = schedulingPrototypeEnabled
    ? "./src/dev/service-desk/entry.ts"
    : "./src/modules/shared/config/service-desk-source-disabled.ts"
  const revenueOperationsSourceEntry = schedulingPrototypeEnabled
    ? "./src/dev/revenue-operations/entry.ts"
    : "./src/modules/shared/config/revenue-operations-source-disabled.ts"
  const barbershopSetupSourceEnabled = isMemorySourceEnabled(
    publicEnv.VITE_BARBERSHOP_SETUP_SOURCE,
    publicEnv.VITE_DEPLOY_TARGET,
  )
  const barbershopSetupSourceEntry = barbershopSetupSourceEnabled
    ? "./src/dev/barbershop-setup/entry.ts"
    : publicEnv.VITE_BARBERSHOP_SETUP_SOURCE === "http"
      ? "./src/modules/barbershop-setup/http-entry.ts"
      : "./src/modules/shared/config/barbershop-setup-source-disabled.ts"
  const clientManagementMemoryEnabled = isMemorySourceEnabled(
    publicEnv.VITE_CLIENT_MANAGEMENT_SOURCE,
    publicEnv.VITE_DEPLOY_TARGET,
  )
  const clientManagementSourceEntry = clientManagementMemoryEnabled
    ? "./src/dev/clients/entry.ts"
    : publicEnv.VITE_CLIENT_MANAGEMENT_SOURCE === "http"
      ? "./src/modules/clients/http-entry.ts"
      : "./src/modules/shared/config/client-management-source-disabled.ts"
  const reportingSourceEntry =
    schedulingPrototypeEnabled && clientManagementMemoryEnabled
      ? "./src/dev/reporting/entry.ts"
      : "./src/modules/shared/config/reporting-source-disabled.ts"
  const operationalNotificationsSourceEntry = schedulingPrototypeEnabled
    ? "./src/dev/operational-notifications/entry.ts"
    : "./src/modules/shared/config/operational-notifications-source-disabled.ts"

  return {
    plugins: [
      ...devtools({ removeDevtoolsOnBuild: true }),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "virtual:studio-development-sandbox": path.resolve(__dirname, developmentSandboxEntry),
        "virtual:studio-scheduling-prototype": path.resolve(__dirname, schedulingPrototypeEntry),
        "virtual:studio-service-desk-source": path.resolve(__dirname, serviceDeskSourceEntry),
        "virtual:studio-revenue-operations-source": path.resolve(
          __dirname,
          revenueOperationsSourceEntry,
        ),
        "virtual:studio-reporting-source": path.resolve(__dirname, reportingSourceEntry),
        "virtual:studio-operational-notifications-source": path.resolve(
          __dirname,
          operationalNotificationsSourceEntry,
        ),
        "virtual:studio-barbershop-setup-source": path.resolve(
          __dirname,
          barbershopSetupSourceEntry,
        ),
        "virtual:studio-client-management-source": path.resolve(
          __dirname,
          clientManagementSourceEntry,
        ),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
    },
    test: {
      environment: "jsdom",
      environmentOptions: {
        jsdom: {
          url: "http://localhost:3000",
        },
      },
      globals: true,
      include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
      setupFiles: ["./tests/setup.ts"],
      css: true,
      clearMocks: true,
      maxWorkers: 1,
      minWorkers: 1,
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
    },
  }
})
