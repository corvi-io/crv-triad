import type { IdpEnv } from "../../idp/config/env.js"
import type { ReportEmailSender } from "../application/export-providers.js"

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function createReportEmailSender(
  env: IdpEnv,
  fetchEmail: FetchLike = fetch,
): ReportEmailSender {
  return {
    async send(input) {
      const response = await fetchEmail(`${env.IDP_RESEND_API_URL.replace(/\/$/, "")}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.IDP_RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `triad-report-${input.reportRequestId}`,
        },
        body: JSON.stringify({
          from: env.IDP_EMAIL_FROM,
          to: [input.recipient],
          subject: `${input.reportTitle} está pronto`,
          text: `Seu relatório está pronto. Acesse o TRIAD Studio para baixar com segurança: ${input.authenticatedReportUrl}`,
          html: `<p>Seu relatório <strong>${escapeHtml(input.reportTitle)}</strong> está pronto.</p><p><a href="${escapeHtml(input.authenticatedReportUrl)}">Acessar no TRIAD Studio</a></p><p>O acesso exige autenticação e o link de download do arquivo expira rapidamente.</p>`,
        }),
        signal: AbortSignal.timeout(5_000),
      })
      if (!response.ok) throw new Error("email_delivery_failed")
      const body = (await response.json().catch(() => ({}))) as { id?: unknown }
      return { deliveryReference: typeof body.id === "string" ? body.id : undefined }
    },
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }
    return entities[character] ?? character
  })
}
