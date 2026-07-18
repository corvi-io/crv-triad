import { describe, expect, it } from "vitest"

import { parseEnv } from "../../../src/config/env.js"

const validEnv = {
  NODE_ENV: "test",
  APP_ENV: "test",
  IDP_HOST: "127.0.0.1",
  IDP_PORT: "8001",
  DATABASE_URL: "postgresql://idp:idp@127.0.0.1:5432/idp",
  BETTER_AUTH_SECRET: "0123456789abcdefghijklmnopqrstuvwxyz",
  BETTER_AUTH_URL: "http://127.0.0.1:8001",
  AUTH_TRUSTED_ORIGINS: "http://localhost:3000, http://localhost:3001",
  AUTH_SESSION_EXPIRES_IN_SECONDS: "60",
  AUTH_PASSWORD_MIN_LENGTH: "12",
  AUTH_PASSWORD_MAX_LENGTH: "256",
  AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS: "3600",
}

describe("parseEnv", () => {
  it("parses and coerces a valid environment", () => {
    const env = parseEnv(validEnv)

    expect(env.IDP_PORT).toBe(8001)
    expect(env.AUTH_SESSION_EXPIRES_IN_SECONDS).toBe(60)
    expect(env.AUTH_PASSWORD_MIN_LENGTH).toBe(12)
    expect(env.AUTH_TRUSTED_ORIGINS).toEqual(["http://localhost:3000", "http://localhost:3001"])
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
})
