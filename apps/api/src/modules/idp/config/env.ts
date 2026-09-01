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
    API_HOST: z.string().min(1).default("127.0.0.1"),
    API_PORT: z.coerce.number().int().positive().default(8000),
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
    AUTH_PASSWORD_MIN_LENGTH: z.coerce.number().int().min(15).default(15),
    AUTH_PASSWORD_MAX_LENGTH: z.coerce.number().int().min(256).default(256),
    AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3_600),
    AUTH_GOOGLE_CLIENT_ID: requiredProviderValue,
    AUTH_GOOGLE_CLIENT_SECRET: requiredProviderValue,
    IDP_EMAIL_FROM: z.email(),
    IDP_STUDIO_URL: configuredHttpOrigin,
    IDP_RESEND_API_KEY: requiredProviderValue,
    IDP_RESEND_API_URL: configuredHttpsUrl.default("https://api.resend.com"),
    LEAD_EMAIL_FROM: z.email().default("leads@example.com"),
    LEAD_EMAIL_TO: z
      .string()
      .default("contato@example.com")
      .transform((value) =>
        value
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.email()).min(1))
      .transform((emails) => [...new Set(emails)]),
    LEAD_RESEND_API_KEY: z.string().trim().default(""),
    LEAD_RATE_LIMIT_SECRET: z.string().min(32).default("local-only-rate-limit-secret-32"),
    LEAD_TURNSTILE_SECRET_KEY: z.string().trim().default(""),
    LEAD_TURNSTILE_HOSTNAMES: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    LEAD_HOURLY_LIMIT: z.coerce.number().int().positive().default(5),
    LEAD_DAILY_LIMIT: z.coerce.number().int().positive().default(20),
    POSTHOG_UPSTREAM_URL: z
      .enum(["https://us.i.posthog.com", "https://eu.i.posthog.com"])
      .default("https://us.i.posthog.com"),
    POSTHOG_PROJECT_KEY: z.string().trim().default(""),
  })
  .superRefine((value, context) => {
    if (!value.AUTH_TRUSTED_ORIGINS.includes(value.IDP_STUDIO_URL)) {
      context.addIssue({
        code: "custom",
        message: "IDP_STUDIO_URL must be included in AUTH_TRUSTED_ORIGINS.",
        path: ["IDP_STUDIO_URL"],
      })
    }
    if (value.APP_ENV === "production") {
      for (const key of ["LEAD_RESEND_API_KEY", "LEAD_TURNSTILE_SECRET_KEY"] as const) {
        if (!value[key]) {
          context.addIssue({
            code: "custom",
            message: `${key} is required in production.`,
            path: [key],
          })
        }
      }
      if (value.LEAD_TURNSTILE_HOSTNAMES.length === 0) {
        context.addIssue({
          code: "custom",
          message: "At least one hostname is required in production.",
          path: ["LEAD_TURNSTILE_HOSTNAMES"],
        })
      }
    }
  })

export type IdpEnv = z.infer<typeof envSchema>

export function parseEnv(input: NodeJS.ProcessEnv): IdpEnv {
  return envSchema.parse(input)
}

export function loadEnv(): IdpEnv {
  return parseEnv(process.env)
}
