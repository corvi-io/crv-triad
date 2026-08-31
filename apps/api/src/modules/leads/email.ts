import type { IdpEnv } from "../idp/config/env.js"

export type Lead = {
  name?: string
  barbershop: string
  whatsapp: string
  email?: string
}

export async function sendLeadEmail(env: IdpEnv, lead: Lead, idempotencyKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LEAD_RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: env.LEAD_EMAIL_FROM,
      to: env.LEAD_EMAIL_TO,
      subject: `Novo interesse no TRIAD — ${lead.barbershop}`,
      text: [
        `Nome: ${lead.name || "Não informado"}`,
        `Barbearia: ${lead.barbershop}`,
        `WhatsApp: ${lead.whatsapp}`,
        `E-mail: ${lead.email || "Não informado"}`,
      ].join("\n"),
    }),
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error("Lead email delivery failed.")
}
