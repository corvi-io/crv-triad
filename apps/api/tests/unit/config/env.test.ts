import { describe, expect, it } from "vitest"

import { parseEnv } from "../../../src/modules/idp/config/env.js"

const validEnv = {
  NODE_ENV: "test",
  APP_ENV: "test",
  API_HOST: "127.0.0.1",
  API_PORT: "8000",
  DATABASE_URL: "postgresql://idp:idp@127.0.0.1:5432/idp",
  BETTER_AUTH_SECRET: "0123456789abcdefghijklmnopqrstuvwxyz",
  BETTER_AUTH_URL: "http://127.0.0.1:8000",
  AUTH_TRUSTED_ORIGINS: "http://localhost:3000, http://localhost:3001",
  AUTH_SESSION_EXPIRES_IN_SECONDS: "60",
  AUTH_PASSWORD_MIN_LENGTH: "15",
  AUTH_PASSWORD_MAX_LENGTH: "256",
  AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS: "3600",
  AUTH_GOOGLE_CLIENT_ID: "test-google-client-id",
  AUTH_GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  IDP_EMAIL_FROM: "auth@example.invalid",
  IDP_STUDIO_URL: "http://localhost:3000",
  IDP_RESEND_API_KEY: "test-resend-api-key",
}

describe("parseEnv", () => {
  it("parses and coerces a valid environment", () => {
    const env = parseEnv(validEnv)

    expect(env.API_PORT).toBe(8000)
    expect(env.AUTH_SESSION_EXPIRES_IN_SECONDS).toBe(60)
    expect(env.AUTH_PASSWORD_MIN_LENGTH).toBe(15)
    expect(env.AUTH_TRUSTED_ORIGINS).toEqual(["http://localhost:3000", "http://localhost:3001"])
    expect(env.IDP_RESEND_API_URL).toBe("https://api.resend.com")
    expect(env.IDP_STUDIO_URL).toBe("http://localhost:3000")
    expect(env.LEAD_EMAIL_TO).toEqual(["contato@example.com"])
    expect(env.POSTHOG_UPSTREAM_URL).toBe("https://us.i.posthog.com")
  })

  it("accepts only supported PostHog regional ingestion origins", () => {
    expect(
      parseEnv({ ...validEnv, POSTHOG_UPSTREAM_URL: "https://eu.i.posthog.com" })
        .POSTHOG_UPSTREAM_URL,
    ).toBe("https://eu.i.posthog.com")
    expect(() =>
      parseEnv({ ...validEnv, POSTHOG_UPSTREAM_URL: "https://analytics.example.test" }),
    ).toThrow()
  })

  it("parses, trims, and deduplicates lead email recipients", () => {
    const env = parseEnv({
      ...validEnv,
      LEAD_EMAIL_TO: "owner@example.com, sales@example.com, owner@example.com",
    })

    expect(env.LEAD_EMAIL_TO).toEqual(["owner@example.com", "sales@example.com"])
  })

  it("rejects the lead recipient list when any email is invalid", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        LEAD_EMAIL_TO: "owner@example.com, invalid-email",
      }),
    ).toThrow()
  })

  it("accepts Fly postgres database URLs", () => {
    const env = parseEnv({
      ...validEnv,
      DATABASE_URL: "postgres://idp:idp@triad-idp-db.flycast:5432/idp",
    })

    expect(env.DATABASE_URL).toBe("postgres://idp:idp@triad-idp-db.flycast:5432/idp")
  })

  it("rejects non-Postgres database URLs", () => {
    expect(() =>
      parseEnv({ ...validEnv, DATABASE_URL: "mysql://idp:idp@example.test/idp" }),
    ).toThrow("DATABASE_URL must use postgres:// or postgresql://.")
  })

  it("rejects short Better Auth secrets", () => {
    expect(() => parseEnv({ ...validEnv, BETTER_AUTH_SECRET: "short" })).toThrow()
  })

  it("rejects documented Better Auth secret placeholders", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        BETTER_AUTH_SECRET: "replace-with-at-least-32-random-characters",
      }),
    ).toThrow("BETTER_AUTH_SECRET must not use a documented placeholder value")
  })

  it.each([
    "AUTH_GOOGLE_CLIENT_ID",
    "AUTH_GOOGLE_CLIENT_SECRET",
    "IDP_EMAIL_FROM",
    "IDP_STUDIO_URL",
    "IDP_RESEND_API_KEY",
  ] as const)("requires %s", (name) => {
    const missing = { ...validEnv }
    delete missing[name]

    expect(() => parseEnv(missing)).toThrow()
  })

  it("normalizes the configured Studio URL to a trusted origin", () => {
    const env = parseEnv({
      ...validEnv,
      AUTH_TRUSTED_ORIGINS: "http://localhost:3001/, https://studio.example.test/",
      IDP_STUDIO_URL: "https://studio.example.test/",
    })

    expect(env.IDP_STUDIO_URL).toBe("https://studio.example.test")
    expect(env.AUTH_TRUSTED_ORIGINS).toEqual([
      "http://localhost:3001",
      "https://studio.example.test",
    ])
  })

  it("rejects a Studio origin that is missing from trusted origins", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        AUTH_TRUSTED_ORIGINS: "http://localhost:3001",
        IDP_STUDIO_URL: "http://localhost:3000/",
      }),
    ).toThrow("IDP_STUDIO_URL must be included in AUTH_TRUSTED_ORIGINS")
  })

  it("rejects non-HTTP Studio URLs", () => {
    expect(() => parseEnv({ ...validEnv, IDP_STUDIO_URL: "ftp://studio.example.test" })).toThrow(
      "URL must use http:// or https://",
    )
  })

  it("rejects Studio URLs with paths or query parameters", () => {
    expect(() =>
      parseEnv({ ...validEnv, IDP_STUDIO_URL: "https://studio.example.test/login?source=idp" }),
    ).toThrow("URL must contain an origin only")
  })

  it("rejects non-HTTPS transactional email provider URLs", () => {
    expect(() =>
      parseEnv({ ...validEnv, IDP_RESEND_API_URL: "http://email-provider.example.test" }),
    ).toThrow("URL must use https://")
  })

  it.each([
    ["AUTH_GOOGLE_CLIENT_ID", "replace-with-google-oauth-client-id"],
    ["AUTH_GOOGLE_CLIENT_SECRET", "replace-with-google-oauth-client-secret"],
    ["IDP_RESEND_API_KEY", "replace-with-resend-api-key"],
  ] as const)("rejects the documented %s placeholder", (name, value) => {
    expect(() => parseEnv({ ...validEnv, [name]: value })).toThrow(
      "Provider configuration must not use a documented placeholder value",
    )
  })
})
