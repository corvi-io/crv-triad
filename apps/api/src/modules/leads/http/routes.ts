import { Elysia, t } from "elysia"
import type { Pool } from "pg"

import type { CaptureAcceptedLead } from "../../analytics/lead-capture.js"
import type { IdpEnv } from "../../idp/config/env.js"
import { sendLeadEmail } from "../email.js"
import { consumeLeadRateLimit } from "../rate-limit.js"
import { verifyLeadTurnstile } from "../turnstile.js"

const minimumCompletionMs = 2_000
const maximumCompletionMs = 7_200_000

type LeadRouteDependencies = {
  captureAcceptedLead?: CaptureAcceptedLead
  consumeRateLimit?: typeof consumeLeadRateLimit
  sendEmail?: typeof sendLeadEmail
  verifyTurnstile?: typeof verifyLeadTurnstile
}

export function createLeadRoutes(
  env: IdpEnv,
  pool: Pool,
  dependencies: LeadRouteDependencies = {},
) {
  const captureAcceptedLead = dependencies.captureAcceptedLead ?? (async () => undefined)
  const consumeRateLimit = dependencies.consumeRateLimit ?? consumeLeadRateLimit
  const sendEmail = dependencies.sendEmail ?? sendLeadEmail
  const verifyTurnstile = dependencies.verifyTurnstile ?? verifyLeadTurnstile

  return new Elysia({ name: "lead-routes" }).post(
    "/leads",
    async ({ body, request, status }) => {
      if (body.website) return status(202, { accepted: true })
      const elapsed = Date.now() - body.startedAt
      if (elapsed < minimumCompletionMs || elapsed > maximumCompletionMs) {
        return status(400, {
          error: { code: "invalid_submission", message: "Não foi possível enviar seus dados." },
        })
      }

      const clientAddress = resolveClientAddress(request, env.APP_ENV)
      const allowed = await consumeRateLimit({
        pool,
        clientAddress,
        secret: env.LEAD_RATE_LIMIT_SECRET,
        hourlyLimit: env.LEAD_HOURLY_LIMIT,
        dailyLimit: env.LEAD_DAILY_LIMIT,
      })
      if (!allowed) {
        return status(429, {
          error: { code: "rate_limited", message: "Tente novamente mais tarde." },
        })
      }

      const verified = await verifyTurnstile({
        token: body.turnstileToken,
        secret: env.LEAD_TURNSTILE_SECRET_KEY,
        remoteIp: clientAddress,
        allowedHostnames: env.LEAD_TURNSTILE_HOSTNAMES,
      })
      if (!verified) {
        return status(400, {
          error: { code: "challenge_failed", message: "Não foi possível validar o envio." },
        })
      }

      const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
      await sendEmail(
        env,
        {
          name: body.name?.trim() || undefined,
          barbershop: body.barbershop.trim(),
          whatsapp: body.whatsapp.trim(),
          email: body.email?.trim() || undefined,
        },
        `lead/${requestId}`,
      )
      if (body.analytics) await captureAcceptedLead(body.analytics)
      return status(202, { accepted: true })
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ maxLength: 100 })),
        barbershop: t.String({ minLength: 2, maxLength: 120 }),
        whatsapp: t.String({ minLength: 8, maxLength: 24, pattern: "^[0-9+() .-]+$" }),
        email: t.Optional(t.String({ format: "email", maxLength: 160 })),
        website: t.Optional(t.String({ maxLength: 200 })),
        startedAt: t.Number({ minimum: 1 }),
        turnstileToken: t.String({ minLength: 1, maxLength: 2048 }),
        analytics: t.Optional(
          t.Object({
            distinctId: t.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" }),
            product: t.Union([
              t.Literal("ecosystem"),
              t.Literal("pro_barber"),
              t.Literal("studio"),
            ]),
            sourcePage: t.Union([t.Literal("/"), t.Literal("/pro-barber"), t.Literal("/studio")]),
            ctaLocation: t.Union([
              t.Literal("final_cta"),
              t.Literal("header"),
              t.Literal("hero"),
              t.Literal("product_section"),
              t.Literal("unknown"),
            ]),
          }),
        ),
      }),
    },
  )
}

function resolveClientAddress(request: Request, appEnv: IdpEnv["APP_ENV"]): string {
  if (appEnv !== "local" && appEnv !== "test") {
    const flyAddress = request.headers.get("fly-client-ip")
    if (flyAddress) return flyAddress
  }
  return request.headers.get("x-real-ip") ?? "local"
}
