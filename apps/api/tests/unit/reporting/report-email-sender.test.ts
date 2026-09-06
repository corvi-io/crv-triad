import { describe, expect, it, vi } from "vitest"
import { createReportEmailSender } from "../../../src/modules/reporting/infra/report-email-sender.js"

describe("report email sender", () => {
  it("uses a stable provider idempotency key and sends only the authenticated Studio URL", async () => {
    const requests: RequestInit[] = []
    const fetchEmail = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(init ?? {})
      return Response.json({ id: "email-1" }, { status: 202 })
    })
    const sender = createReportEmailSender(
      {
        IDP_RESEND_API_URL: "https://api.resend.com",
        IDP_RESEND_API_KEY: "secret",
        IDP_EMAIL_FROM: "reports@example.com",
      } as never,
      fetchEmail,
    )
    await expect(
      sender.send({
        recipient: "owner@example.com",
        reportRequestId: "request-1",
        reportTitle: "Comissões",
        authenticatedReportUrl: "https://studio.example.com/reports?reportId=request-1",
      }),
    ).resolves.toEqual({ deliveryReference: "email-1" })
    const init = requests[0]
    expect(new Headers(init?.headers).get("idempotency-key")).toBe("triad-report-request-1")
    expect(String(init?.body)).not.toContain("r2")
    expect(String(init?.body)).not.toContain("accessKey")
  })
})
