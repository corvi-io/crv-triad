import { afterEach, describe, expect, it, vi } from "vitest"

import { sendLeadEmail } from "../../../src/modules/leads/email.js"

afterEach(() => vi.unstubAllGlobals())

describe("sendLeadEmail", () => {
  it("sends through Resend without exposing delivery details", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: "email-id" })))
    vi.stubGlobal("fetch", fetcher)
    await sendLeadEmail(
      {
        LEAD_RESEND_API_KEY: "secret",
        LEAD_EMAIL_FROM: "leads@example.com",
        LEAD_EMAIL_TO: ["owner@example.com", "sales@example.com"],
      } as never,
      { name: "Ana", barbershop: "Barbearia Sul", whatsapp: "81999999999" },
      "lead/request-id",
    )
    expect(fetcher).toHaveBeenCalledOnce()
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("lead/request-id")
    expect(String(init.body)).toContain("Barbearia Sul")
    expect(JSON.parse(String(init.body)).to).toEqual(["owner@example.com", "sales@example.com"])
  })

  it("fails on a rejected provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 429 })),
    )
    await expect(
      sendLeadEmail(
        {
          LEAD_RESEND_API_KEY: "secret",
          LEAD_EMAIL_FROM: "leads@example.com",
          LEAD_EMAIL_TO: ["owner@example.com"],
        } as never,
        { barbershop: "Barbearia Sul", whatsapp: "81999999999" },
        "lead/request-id",
      ),
    ).rejects.toThrow("Lead email delivery failed")
  })
})
