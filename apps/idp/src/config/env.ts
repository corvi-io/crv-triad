import { z } from "zod"

const BETTER_AUTH_SECRET_PLACEHOLDERS = new Set(["replace-with-at-least-32-random-characters"])
const PROVIDER_PLACEHOLDERS = new Set([
  "replace-with-google-oauth-client-id",
  "replace-with-google-oauth-client-secret",
  "replace-with-resend-api-key",
])
const POSTGRES_SCHEMES = ["postgresql://", "postgres://"]

const configuredHttpOrigin = z
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "URL must use http:// or https://.",
  })
  .refine(
    (value) => {
      const url = new URL(value)
      return (
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === "" &&
        url.username === "" &&
        url.password === ""
      )
    },
    { message: "URL must contain an origin only." },
  )
  .transform((value) => new URL(value).origin)

const configuredHttpsUrl = z.url().refine((value) => new URL(value).protocol === "https:", {
  message: "URL must use https://.",
})

const requiredProviderValue = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !PROVIDER_PLACEHOLDERS.has(value), {
    message: "Provider configuration must not use a documented placeholder value.",
  })

const envSchema = z
  .object({
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
      )
      .pipe(z.array(configuredHttpOrigin)),
    AUTH_SESSION_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(2_592_000),
    AUTH_PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).default(12),
    AUTH_PASSWORD_MAX_LENGTH: z.coerce.number().int().min(32).default(256),
    AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3_600),
    AUTH_GOOGLE_CLIENT_ID: requiredProviderValue,
    AUTH_GOOGLE_CLIENT_SECRET: requiredProviderValue,
    IDP_EMAIL_FROM: z.email(),
    IDP_STUDIO_URL: configuredHttpOrigin,
    IDP_RESEND_API_KEY: requiredProviderValue,
    IDP_RESEND_API_URL: configuredHttpsUrl.default("https://api.resend.com"),
  })
  .superRefine((value, context) => {
    if (!value.AUTH_TRUSTED_ORIGINS.includes(value.IDP_STUDIO_URL)) {
      context.addIssue({
        code: "custom",
        message: "IDP_STUDIO_URL must be included in AUTH_TRUSTED_ORIGINS.",
        path: ["IDP_STUDIO_URL"],
      })
    }
  })

export type IdpEnv = z.infer<typeof envSchema>

export function parseEnv(input: NodeJS.ProcessEnv): IdpEnv {
  return envSchema.parse(input)
}

export function loadEnv(): IdpEnv {
  return parseEnv(process.env)
}
