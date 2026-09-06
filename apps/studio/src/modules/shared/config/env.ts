import { z } from "zod"

const publicEnvSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default("TRIAD Studio"),
  VITE_AUTH_BASE_URL: z.string().url().default("http://localhost:8000/api/auth"),
  VITE_BARBERSHOP_SETUP_SOURCE: z.enum(["disabled", "http", "memory"]).default("disabled"),
  VITE_CLIENT_MANAGEMENT_SOURCE: z.enum(["disabled", "http", "memory"]).default("disabled"),
  VITE_DEPLOY_TARGET: z.enum(["local", "dev", "hml", "prd"]).default("local"),
  VITE_REVENUE_OPERATIONS_SOURCE: z.enum(["disabled", "http", "memory"]).default("http"),
  VITE_SCHEDULING_SOURCE: z.enum(["disabled", "http", "memory"]).default("http"),
  VITE_SERVICE_DESK_SOURCE: z.enum(["disabled", "http", "memory"]).default("http"),
})

const parsedEnv = publicEnvSchema.parse(import.meta.env)
const isDevelopmentBuild = import.meta.env.DEV

export const env = {
  appName: parsedEnv.VITE_APP_NAME,
  authBaseUrl: parsedEnv.VITE_AUTH_BASE_URL,
  barbershopSetupSource: parsedEnv.VITE_BARBERSHOP_SETUP_SOURCE,
  clientManagementSource: parsedEnv.VITE_CLIENT_MANAGEMENT_SOURCE,
  deployTarget: parsedEnv.VITE_DEPLOY_TARGET,
  isDevServer: isDevelopmentBuild,
  isTest: import.meta.env.MODE === "test",
  revenueOperationsSource: parsedEnv.VITE_REVENUE_OPERATIONS_SOURCE,
  schedulingSource: parsedEnv.VITE_SCHEDULING_SOURCE,
  serviceDeskSource: parsedEnv.VITE_SERVICE_DESK_SOURCE,
} as const

export type PublicEnv = typeof env
