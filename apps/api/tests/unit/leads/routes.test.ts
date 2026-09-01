import type { Pool } from "pg"
import { describe, expect, it, vi } from "vitest"

import type { IdpEnv } from "../../../src/modules/idp/config/env.js"
import { createLeadRoutes } from "../../../src/modules/leads/http/routes.js"

const env = {
  APP_ENV: "test",
  LEAD_DAILY_LIMIT: 20,
  LEAD_HOURLY_LIMIT: 5,
  LEAD_RATE_LIMIT_SECRET: "test-rate-limit-secret-with-32-chars",
  LEAD_TURNSTILE_HOSTNAMES: ["site.example.test"],
  LEAD_TURNSTILE_SECRET_KEY: "turnstile-secret",
} as IdpEnv

const pool = {} as Pool

const validBody = {
  barbershop: "Barbearia Central",
  whatsapp: "+55 81 99999-0000",
  startedAt: Date.now() - 3_000,
  turnstileToken: "valid-turnstile-token",
  analytics: {
    distinctId: "01990a13-6d57-7000-8000-000000000001",
    product: "studio",
    sourcePage: "/studio",
    ctaLocation: "hero",
  },
}

function createApp() {
  const captureAcceptedLead = vi.fn(async () => undefined)
  const sendEmail = vi.fn(async () => undefined)
  const app = createLeadRoutes(env, pool, {
    captureAcceptedLead,
    consumeRateLimit: async () => true,
    sendEmail,
    verifyTurnstile: async () => true,
  })
  return { app, captureAcceptedLead, sendEmail }
}

describe("lead routes", () => {
  it("captures analytics only after the lead email is accepted", async () => {
    const { app, captureAcceptedLead, sendEmail } = createApp()

    const response = await app.handle(
      new Request("https://api.example.test/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    )

    expect(response.status).toBe(202)
    expect(sendEmail).toHaveBeenCalledOnce()
    expect(captureAcceptedLead).toHaveBeenCalledWith(validBody.analytics)
    expect(sendEmail.mock.invocationCallOrder[0]).toBeLessThan(
      captureAcceptedLead.mock.invocationCallOrder[0],
    )
  })

  it("does not capture rejected or failed lead submissions", async () => {
    const captureAcceptedLead = vi.fn(async () => undefined)
    const sendEmail = vi.fn(async () => {
      throw new Error("provider unavailable")
    })
    const app = createLeadRoutes(env, pool, {
      captureAcceptedLead,
      consumeRateLimit: async () => true,
      sendEmail,
      verifyTurnstile: async () => true,
    })

    const response = await app.handle(
      new Request("https://api.example.test/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    )

    expect(response.status).toBe(500)
    expect(captureAcceptedLead).not.toHaveBeenCalled()
  })

  it("keeps honeypot submissions out of email and analytics while preserving the public response", async () => {
    const { app, captureAcceptedLead, sendEmail } = createApp()

    const response = await app.handle(
      new Request("https://api.example.test/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...validBody, website: "https://spam.example" }),
      }),
    )

    expect(response.status).toBe(202)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(captureAcceptedLead).not.toHaveBeenCalled()
  })

  it("rejects analytics identifiers that could contain PII", async () => {
    const { app, captureAcceptedLead, sendEmail } = createApp()

    const response = await app.handle(
      new Request("https://api.example.test/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...validBody,
          analytics: { ...validBody.analytics, distinctId: "person@example.com" },
        }),
      }),
    )

    expect(response.status).toBe(422)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(captureAcceptedLead).not.toHaveBeenCalled()
  })
})
