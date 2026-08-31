import { describe, expect, it, vi } from "vitest"

import { verifyLeadTurnstile } from "../../../src/modules/leads/turnstile.js"

describe("verifyLeadTurnstile", () => {
  it("accepts a matching successful challenge", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ success: true, hostname: "localhost", action: "lead_submit" }),
        ),
    )
    await expect(
      verifyLeadTurnstile({
        token: "token",
        secret: "secret",
        remoteIp: "127.0.0.1",
        allowedHostnames: ["localhost"],
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).resolves.toBe(true)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it.each([
    [{ success: false, hostname: "localhost", action: "lead_submit" }],
    [{ success: true, hostname: "other.example", action: "lead_submit" }],
    [{ success: true, hostname: "localhost", action: "other" }],
  ])("rejects an invalid challenge response", async (payload) => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload)))
    await expect(
      verifyLeadTurnstile({
        token: "token",
        secret: "secret",
        remoteIp: "127.0.0.1",
        allowedHostnames: ["localhost"],
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).resolves.toBe(false)
  })

  it("fails closed without a secret or when the provider fails", async () => {
    await expect(
      verifyLeadTurnstile({ token: "token", secret: "", remoteIp: "local", allowedHostnames: [] }),
    ).resolves.toBe(false)
    const fetcher = vi.fn(async () => new Response(null, { status: 503 }))
    await expect(
      verifyLeadTurnstile({
        token: "token",
        secret: "secret",
        remoteIp: "local",
        allowedHostnames: [],
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).resolves.toBe(false)
  })
})
