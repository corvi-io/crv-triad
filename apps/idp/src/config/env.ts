import { z } from "zod"

const BETTER_AUTH_SECRET_PLACEHOLDERS = new Set(["replace-with-at-least-32-random-characters"])
const POSTGRES_SCHEMES = ["postgresql://", "postgres://"]

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "development", "staging", "production", "test"]).default("local"),
  IDP_HOST: z.string().min(1).default("127.0.0.1"),
  IDP_PORT: z.coerce.number().int().positive().default(8001),
  DATABASE_URL: z
    .url()
    .refine((value) => POSTGRES_SCHEMES.some((scheme) => value.startsWith(scheme)), {
      message: "DATABASE_URL must use postgres:// or postgresql://.",
    }),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .refine((value) => !BETTER_AUTH_SECRET_PLACEHOLDERS.has(value), {
      message: "BETTER_AUTH_SECRET must not use a documented placeholder value.",
    }),
  BETTER_AUTH_URL: z.url(),
  AUTH_TRUSTED_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  AUTH_SESSION_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(2_592_000),
  AUTH_PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).default(12),
  AUTH_PASSWORD_MAX_LENGTH: z.coerce.number().int().min(32).default(256),
  AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3_600),
  IDP_INVITATION_EMAILS_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  IDP_INVITATION_EMAIL_FROM: z.email().optional(),
  IDP_INVITATION_APP_URL: z.url().default("http://localhost:3000"),
  IDP_RESEND_API_KEY: z.string().min(1).optional(),
  IDP_RESEND_API_URL: z.url().default("https://api.resend.com"),
})

export type IdpEnv = z.infer<typeof envSchema>

export function parseEnv(input: NodeJS.ProcessEnv): IdpEnv {
  return envSchema.parse(input)
}

export function loadEnv(): IdpEnv {
  return parseEnv(process.env)
}
