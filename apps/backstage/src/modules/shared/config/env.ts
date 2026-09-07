import { z } from "zod"

const publicEnvSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default("TRIAD Backstage"),
  VITE_AUTH_BASE_URL: z.string().url().default("http://localhost:8000/api/auth"),
  VITE_DEPLOY_TARGET: z.enum(["local", "dev", "hml", "prd"]).default("local"),
})

const parsed = publicEnvSchema.parse(import.meta.env)

export const env = {
  appName: parsed.VITE_APP_NAME,
  authBaseUrl: parsed.VITE_AUTH_BASE_URL,
  deployTarget: parsed.VITE_DEPLOY_TARGET,
  isDevServer: import.meta.env.DEV,
} as const
