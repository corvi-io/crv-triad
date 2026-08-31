import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    coverage: {
      exclude: [
        "src/server.ts",
        "src/entrypoints/**",
        "src/**/database/client.ts",
        "src/**/database/schema.ts",
        "src/**/database/migrate.ts",
        "src/**/http/routes/**",
        "src/**/scripts/**",
      ],
    },
  },
})
