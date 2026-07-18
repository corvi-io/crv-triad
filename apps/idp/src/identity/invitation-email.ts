import type { IdpEnv } from "../config/env.js"
import type { IdpRole } from "./access-policy.js"

export type InvitationEmailSender = {
  sendInvitation: (input: InvitationEmailInput) => Promise<InvitationEmailDelivery>
}

export type InvitationEmailInput = {
  email: string
  expiresAt: Date
  role: IdpRole
}

export type InvitationEmailDelivery = "failed" | "sent" | "skipped"

export function createInvitationEmailSender(env: IdpEnv): InvitationEmailSender {
  return {
    sendInvitation: (input) => sendInvitationEmail(env, input),
  }
}

async function sendInvitationEmail(
  env: IdpEnv,
  input: InvitationEmailInput,
): Promise<InvitationEmailDelivery> {
  if (!env.IDP_INVITATION_EMAILS_ENABLED) {
    return "skipped"
  }

  if (!env.IDP_RESEND_API_KEY || !env.IDP_INVITATION_EMAIL_FROM) {
    return "skipped"
  }

  const loginUrl = new URL("/login", env.IDP_INVITATION_APP_URL)
  const roleLabel = input.role === "admin" ? "administrador" : "membro"
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Recife",
  }).format(input.expiresAt)

  const response = await fetch(`${env.IDP_RESEND_API_URL.replace(/\/$/, "")}/emails`, {
    body: JSON.stringify({
      from: env.IDP_INVITATION_EMAIL_FROM,
      html: [
        "<p>Voce recebeu um convite para acessar o CRV Triad.</p>",
        `<p>Permissao: <strong>${escapeHtml(roleLabel)}</strong></p>`,
        `<p>O convite expira em <strong>${escapeHtml(expiresAt)}</strong>.</p>`,
        `<p><a href="${escapeHtml(loginUrl.toString())}">Entrar no CRV Triad</a></p>`,
        "<p>Use este mesmo email para criar sua senha ou acessar sua conta.</p>",
      ].join(""),
      subject: "Convite para o CRV Triad",
      text: [
        "Voce recebeu um convite para acessar o CRV Triad.",
        `Permissao: ${roleLabel}.`,
        `O convite expira em ${expiresAt}.`,
        `Entrar: ${loginUrl.toString()}`,
        "Use este mesmo email para criar sua senha ou acessar sua conta.",
      ].join("\n"),
      to: [input.email],
    }),
    headers: {
      Authorization: `Bearer ${env.IDP_RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    return "failed"
  }

  return "sent"
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}
