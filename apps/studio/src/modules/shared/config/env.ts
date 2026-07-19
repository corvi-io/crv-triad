import { z } from "zod"

const publicEnvSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default("TRIAD Studio"),
  VITE_AUTH_BASE_URL: z.string().url().default("http://localhost:8001/api/auth"),
})

const parsedEnv = publicEnvSchema.parse(import.meta.env)
export const isDevelopmentBuild = import.meta.env.DEV

export const env = {
  appName: parsedEnv.VITE_APP_NAME,
  authBaseUrl: parsedEnv.VITE_AUTH_BASE_URL,
  isDevServer: isDevelopmentBuild,
} as const

export type PublicEnv = typeof env
