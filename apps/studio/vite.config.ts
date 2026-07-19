/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), "VITE_")
  const developmentSandboxEntry =
    command === "serve"
      ? "./src/dev/sandbox/entry.ts"
      : "./src/modules/shared/config/development-sandbox-disabled.ts"
  const schedulingPrototypeEnabled =
    publicEnv.VITE_SCHEDULING_SOURCE === "memory" &&
    (publicEnv.VITE_DEPLOY_TARGET === "local" || publicEnv.VITE_DEPLOY_TARGET === "dev")
  const schedulingPrototypeEntry = schedulingPrototypeEnabled
    ? "./src/dev/scheduling/entry.ts"
    : "./src/modules/shared/config/scheduling-prototype-disabled.ts"

  return {
    plugins: [
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
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
    },
  }
})
