/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"
import { isMemorySourceEnabled, serviceDeskSourceKind } from "./vite-source-boundary.js"

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_")
  const publicEnv = {
    ...fileEnv,
    VITE_BARBERSHOP_SETUP_SOURCE:
      process.env.VITE_BARBERSHOP_SETUP_SOURCE ?? fileEnv.VITE_BARBERSHOP_SETUP_SOURCE,
    VITE_CLIENT_MANAGEMENT_SOURCE:
      process.env.VITE_CLIENT_MANAGEMENT_SOURCE ?? fileEnv.VITE_CLIENT_MANAGEMENT_SOURCE,
    VITE_DEPLOY_TARGET: process.env.VITE_DEPLOY_TARGET ?? fileEnv.VITE_DEPLOY_TARGET,
    VITE_REVENUE_OPERATIONS_SOURCE:
      process.env.VITE_REVENUE_OPERATIONS_SOURCE ?? fileEnv.VITE_REVENUE_OPERATIONS_SOURCE,
    VITE_SCHEDULING_SOURCE: process.env.VITE_SCHEDULING_SOURCE ?? fileEnv.VITE_SCHEDULING_SOURCE,
    VITE_SERVICE_DESK_SOURCE:
      process.env.VITE_SERVICE_DESK_SOURCE ?? fileEnv.VITE_SERVICE_DESK_SOURCE,
  }
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
    : publicEnv.VITE_SCHEDULING_SOURCE === "disabled"
      ? "./src/modules/shared/config/scheduling-prototype-disabled.ts"
      : "./src/modules/scheduling/http-entry.ts"
  const serviceDeskSource = serviceDeskSourceKind(
    publicEnv.VITE_SERVICE_DESK_SOURCE,
    publicEnv.VITE_DEPLOY_TARGET,
  )
  const serviceDeskSourceEntry =
    serviceDeskSource === "memory" && schedulingPrototypeEnabled
      ? "./src/dev/service-desk/entry.ts"
      : serviceDeskSource === "disabled" || serviceDeskSource === "memory"
        ? "./src/modules/shared/config/service-desk-source-disabled.ts"
        : "./src/modules/service-desk/http-entry.ts"
  const revenueOperationsMemoryEnabled = isMemorySourceEnabled(
    publicEnv.VITE_REVENUE_OPERATIONS_SOURCE,
    publicEnv.VITE_DEPLOY_TARGET,
  )
  const revenueOperationsSourceEntry =
    revenueOperationsMemoryEnabled && schedulingPrototypeEnabled
      ? "./src/dev/revenue-operations/entry.ts"
      : publicEnv.VITE_REVENUE_OPERATIONS_SOURCE === "disabled" || revenueOperationsMemoryEnabled
        ? "./src/modules/shared/config/revenue-operations-source-disabled.ts"
        : "./src/modules/revenue-operations/http-entry.ts"
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
