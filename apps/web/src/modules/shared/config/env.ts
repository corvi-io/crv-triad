import { z } from "zod"

const publicEnvSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default("CRV Triad"),
  VITE_AUTH_BASE_URL: z.string().url().default("http://localhost:8001/api/auth"),
  VITE_API_BASE_URL: z.string().url().default("http://localhost:8000"),
})

const parsedEnv = publicEnvSchema.parse(import.meta.env)

export const env = {
  appName: parsedEnv.VITE_APP_NAME,
  authBaseUrl: parsedEnv.VITE_AUTH_BASE_URL,
  apiBaseUrl: parsedEnv.VITE_API_BASE_URL,
  isDevServer: import.meta.env.DEV,
} as const

export type PublicEnv = typeof env
