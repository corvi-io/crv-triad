import { describe, expect, it, vi } from "vitest"
import { createReportEmailSender } from "../../../src/modules/reporting/infra/report-email-sender.js"

describe("report email sender", () => {
  it("uses a stable provider idempotency key and sends the short-lived download URL", async () => {
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
        downloadUrl: "https://private.example.com/report.csv?signature=short-lived",
      }),
    ).resolves.toEqual({ deliveryReference: "email-1" })
    const init = requests[0]
    expect(new Headers(init?.headers).get("idempotency-key")).toBe("triad-report-ready-request-1")
    expect(String(init?.body)).toContain("Baixar relatório em CSV")
    expect(String(init?.body)).not.toContain("r2")
    expect(String(init?.body)).not.toContain("accessKey")
  })

  it("sends a distinct terminal failure email without a download link", async () => {
    const requests: RequestInit[] = []
    const sender = createReportEmailSender(
      {
        IDP_RESEND_API_URL: "https://api.resend.com",
        IDP_RESEND_API_KEY: "secret",
        IDP_EMAIL_FROM: "reports@example.com",
      } as never,
      vi.fn(async (_input, init) => {
        requests.push(init ?? {})
        return Response.json({ id: "email-failed" }, { status: 202 })
      }),
    )
    await sender.sendFailure?.({
      recipient: "owner@example.com",
      reportRequestId: "request-1",
      reportTitle: "Comissões",
    })
    expect(new Headers(requests[0]?.headers).get("idempotency-key")).toBe(
      "triad-report-failed-request-1",
    )
    expect(String(requests[0]?.body)).not.toContain("href")
  })
})
