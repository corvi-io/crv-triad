// @ts-check

import sitemap from "@astrojs/sitemap"

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { loadEnv } from "vite"

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "")

// https://astro.build/config
export default defineConfig({
  site: env.PUBLIC_SITE_URL || "https://example.com",

  build: {
    inlineStylesheets: "always",
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [sitemap()],
})
