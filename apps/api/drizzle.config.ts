import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/modules/**/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://idp:idp@127.0.0.1:5432/idp",
  },
  strict: true,
  verbose: true,
})
