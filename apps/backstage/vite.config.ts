/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 3003, strictPort: true },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3003" } },
    globals: true,
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    css: true,
    clearMocks: true,
    maxWorkers: 1,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
})
