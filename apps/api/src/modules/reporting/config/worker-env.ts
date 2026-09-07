import { z } from "zod"

const workerEnvSchema = z.object({
  APP_ENV: z.enum(["local", "development", "staging", "production", "test"]).default("local"),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => /^postgres(?:ql)?:\/\//.test(value), {
      message: "DATABASE_URL must use postgres:// or postgresql://.",
    }),
  IDP_EMAIL_FROM: z.string().email(),
  IDP_STUDIO_URL: z.string().url(),
  IDP_RESEND_API_KEY: z.string().min(1),
  IDP_RESEND_API_URL: z.string().url().default("https://api.resend.com"),
  R2_PRIVATE_ENDPOINT: z.string().url(),
  R2_PRIVATE_ACCESS_KEY_ID: z.string().min(1),
  R2_PRIVATE_SECRET_ACCESS_KEY: z.string().min(1),
  R2_PRIVATE_BUCKET: z.string().min(1),
})

export type ReportWorkerEnv = z.infer<typeof workerEnvSchema>

export function loadReportWorkerEnv(source: NodeJS.ProcessEnv = process.env): ReportWorkerEnv {
  return workerEnvSchema.parse(source)
}
