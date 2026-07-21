import { describe, expect, it } from "vitest"

import { createAuthEmailSender } from "../../../src/identity/transactional-email.js"

const env = {
  BETTER_AUTH_URL: "https://idp.example.test",
  IDP_EMAIL_FROM: "auth@example.invalid",
  IDP_RESEND_API_KEY: "resend-api-key-placeholder",
  IDP_RESEND_API_URL: "https://email-provider.example.test",
  IDP_STUDIO_URL: "https://studio.example.test",
} as never

describe("transactional authentication email", () => {
  it("sends invitation email through the shared transport", async () => {
    const requests: Array<{ body: string; url: string }> = []
    const sender = createAuthEmailSender(env, {
      fetch: async (input, init) => {
        requests.push({ body: String(init?.body), url: String(input) })
        return new Response(null, { status: 202 })
      },
    })

    await expect(
      sender.sendInvitation({
        email: "recipient@example.invalid",
        expiresAt: new Date("2026-07-22T12:00:00Z"),
        role: "member",
      }),
    ).resolves.toBe("sent")
    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe("https://email-provider.example.test/emails")
    expect(requests[0]?.body).toContain("https://studio.example.test/login")
    expect(requests[0]?.body).toContain("Você recebeu um convite")
  })

  it("does not retry a permanent provider rejection", async () => {
    let attempts = 0
    const sender = createAuthEmailSender(env, {
      fetch: async () => {
        attempts += 1
        return new Response(null, { status: 400 })
      },
    })

    await expect(
      sender.sendVerification({
        email: "recipient@example.invalid",
        token: "opaque-test-value",
      }),
    ).resolves.toBe("failed")
    expect(attempts).toBe(1)
  })

  it("retries a transient failure once with the same idempotency key", async () => {
    const idempotencyKeys: string[] = []
    const sender = createAuthEmailSender(env, {
      fetch: async (_input, init) => {
        idempotencyKeys.push(new Headers(init?.headers).get("idempotency-key") ?? "")
        return new Response(null, { status: idempotencyKeys.length === 1 ? 503 : 202 })
      },
    })

    await expect(
      sender.sendPasswordReset({
        email: "recipient@example.invalid",
        token: "opaque-test-value",
      }),
    ).resolves.toBe("sent")
    expect(idempotencyKeys).toHaveLength(2)
    expect(idempotencyKeys[0]).not.toBe("")
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0])
  })

  it("builds verification and reset links from configured trusted origins", async () => {
    const bodies: string[] = []
    const sender = createAuthEmailSender(env, {
      fetch: async (_input, init) => {
        bodies.push(String(init?.body))
        return new Response(null, { status: 202 })
      },
    })

    await sender.sendVerification({
      email: "recipient@example.invalid",
      token: "opaque-verification-value",
    })
    await sender.sendPasswordReset({
      email: "recipient@example.invalid",
      token: "opaque-reset-value",
    })

    expect(bodies[0]).toContain("https://idp.example.test/api/auth/verify-email")
    expect(bodies[0]).toContain("https%3A%2F%2Fstudio.example.test%2Flogin%3Fverified%3Dtrue")
    expect(bodies[1]).toContain("https://idp.example.test/api/auth/reset-password/")
    expect(bodies[1]).toContain("https%3A%2F%2Fstudio.example.test%2Freset-password")
  })
})
