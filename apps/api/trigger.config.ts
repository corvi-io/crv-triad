import { syncEnvVars } from "@trigger.dev/build/extensions/core"
import { defineConfig } from "@trigger.dev/sdk"

const workerEnv = [
  { source: "API__APP_ENV", runtime: "APP_ENV" },
  { source: "API__DATABASE_URL", runtime: "DATABASE_URL", isSecret: true },
  { source: "API__IDP_EMAIL_FROM", runtime: "IDP_EMAIL_FROM" },
  { source: "API__IDP_STUDIO_URL", runtime: "IDP_STUDIO_URL" },
  { source: "API__IDP_RESEND_API_KEY", runtime: "IDP_RESEND_API_KEY", isSecret: true },
  { source: "API__R2_PRIVATE_ENDPOINT", runtime: "R2_PRIVATE_ENDPOINT" },
  {
    source: "API__R2_PRIVATE_ACCESS_KEY_ID",
    runtime: "R2_PRIVATE_ACCESS_KEY_ID",
    isSecret: true,
  },
  {
    source: "API__R2_PRIVATE_SECRET_ACCESS_KEY",
    runtime: "R2_PRIVATE_SECRET_ACCESS_KEY",
    isSecret: true,
  },
  { source: "API__R2_PRIVATE_BUCKET", runtime: "R2_PRIVATE_BUCKET" },
] as const

export default defineConfig({
  project:
    process.env.TRIGGER_PROJECT_REF ??
    process.env.API__TRIGGER_PROJECT_REF ??
    "proj_local_unconfigured",
  dirs: ["./src/trigger"],
  runtime: "bun",
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10_000,
      randomize: true,
    },
  },
  build: {
    external: ["sharp"],
    extensions: [
      syncEnvVars(async () =>
        workerEnv.map(({ source, runtime, ...options }) => {
          const value = process.env[source] ?? process.env[runtime]
          if (!value) throw new Error(`Missing Trigger.dev worker environment variable: ${source}`)
          return { name: runtime, value, ...options }
        }),
      ),
    ],
  },
})
