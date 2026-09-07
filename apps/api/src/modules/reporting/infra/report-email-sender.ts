import type { ReportEmailSender } from "../application/export-providers.js"

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type ReportEmailEnv = {
  IDP_EMAIL_FROM: string
  IDP_RESEND_API_KEY: string
  IDP_RESEND_API_URL: string
}

export function createReportEmailSender(
  env: ReportEmailEnv,
  fetchEmail: FetchLike = fetch,
): ReportEmailSender {
  return {
    async send(input) {
      return sendEmail(fetchEmail, env, {
        idempotencyKey: `triad-report-ready-${input.reportRequestId}`,
        recipient: input.recipient,
        subject: `${input.reportTitle} está pronto`,
        text: `Seu relatório está pronto. Baixe o arquivo CSV pelo link seguro: ${input.downloadUrl}. O link é válido por 7 dias.`,
        html: `<p>Seu relatório <strong>${escapeHtml(input.reportTitle)}</strong> está pronto.</p><p><a href="${escapeHtml(input.downloadUrl)}">Baixar relatório em CSV</a></p><p>Por segurança, o link é válido por 7 dias.</p>`,
      })
    },
    async sendFailure(input) {
      return sendEmail(fetchEmail, env, {
        idempotencyKey: `triad-report-failed-${input.reportRequestId}`,
        recipient: input.recipient,
        subject: `Não foi possível gerar ${input.reportTitle}`,
        text: "Não foi possível concluir a geração do seu relatório. Tente solicitar o relatório novamente mais tarde.",
        html: `<p>Não foi possível concluir a geração do relatório <strong>${escapeHtml(input.reportTitle)}</strong>.</p><p>Tente solicitar o relatório novamente mais tarde.</p>`,
      })
    },
  }
}

async function sendEmail(
  fetchEmail: FetchLike,
  env: ReportEmailEnv,
  input: { idempotencyKey: string; recipient: string; subject: string; text: string; html: string },
) {
  const response = await fetchEmail(`${env.IDP_RESEND_API_URL.replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.IDP_RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.IDP_EMAIL_FROM,
      to: [input.recipient],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error("email_delivery_failed")
  const body = (await response.json().catch(() => ({}))) as { id?: unknown }
  return { deliveryReference: typeof body.id === "string" ? body.id : undefined }
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
