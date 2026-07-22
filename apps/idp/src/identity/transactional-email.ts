import type { IdpEnv } from "../config/env.js"
import { createId } from "../infra/ids.js"
import type { IdpRole } from "./access-policy.js"

export type AuthEmailDelivery = "failed" | "sent" | "skipped"

export type InvitationEmailInput = {
  email: string
  expiresAt: Date
  role: IdpRole
}

export type VerificationEmailInput = {
  email: string
  token: string
}

export type PasswordResetEmailInput = {
  email: string
  token: string
}

export type AuthEmailSender = {
  sendInvitation: (input: InvitationEmailInput) => Promise<AuthEmailDelivery>
  sendPasswordReset: (input: PasswordResetEmailInput) => Promise<AuthEmailDelivery>
  sendVerification: (input: VerificationEmailInput) => Promise<AuthEmailDelivery>
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type CreateAuthEmailSenderDependencies = {
  fetch?: FetchLike
}

type EmailMessage = {
  html: string
  subject: string
  text: string
  to: string
}

const MAX_DELIVERY_ATTEMPTS = 2

export class AuthEmailDeliveryError extends Error {
  constructor() {
    super("Transactional authentication email delivery failed.")
    this.name = "AuthEmailDeliveryError"
  }
}

export function createAuthEmailSender(
  env: IdpEnv,
  dependencies: CreateAuthEmailSenderDependencies = {},
): AuthEmailSender {
  const fetchEmail = dependencies.fetch ?? fetch

  return {
    sendInvitation: (input) => deliverEmail(env, fetchEmail, buildInvitationMessage(env, input)),
    sendPasswordReset: (input) =>
      deliverEmail(env, fetchEmail, buildPasswordResetMessage(env, input)),
    sendVerification: (input) =>
      deliverEmail(env, fetchEmail, buildVerificationMessage(env, input)),
  }
}

export function assertAuthEmailSent(delivery: AuthEmailDelivery): void {
  if (delivery !== "sent") {
    throw new AuthEmailDeliveryError()
  }
}

async function deliverEmail(
  env: IdpEnv,
  fetchEmail: FetchLike,
  message: EmailMessage,
): Promise<AuthEmailDelivery> {
  const endpoint = `${env.IDP_RESEND_API_URL.replace(/\/$/, "")}/emails`
  const idempotencyKey = `triad-auth-${createId()}`

  for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchEmail(endpoint, {
        body: JSON.stringify({
          from: env.IDP_EMAIL_FROM,
          html: message.html,
          subject: message.subject,
          text: message.text,
          to: [message.to],
        }),
        headers: {
          Authorization: `Bearer ${env.IDP_RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        method: "POST",
        signal: AbortSignal.timeout(5_000),
      })

      if (response.ok) return "sent"
      if (!isRetryableStatus(response.status)) return "failed"
    } catch {
      // Retry a bounded provider/network failure without logging message contents or recipients.
    }
  }

  return "failed"
}

function buildInvitationMessage(env: IdpEnv, input: InvitationEmailInput): EmailMessage {
  const loginUrl = new URL("/login", env.IDP_STUDIO_URL)
  const roleLabel = input.role === "admin" ? "administrador" : "membro"
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Recife",
  }).format(input.expiresAt)

  return {
    html: [
      "<p>Você recebeu um convite para acessar o CRV Triad.</p>",
      `<p>Permissão: <strong>${escapeHtml(roleLabel)}</strong></p>`,
      `<p>O convite expira em <strong>${escapeHtml(expiresAt)}</strong>.</p>`,
      `<p><a href="${escapeHtml(loginUrl.toString())}">Entrar no CRV Triad</a></p>`,
      "<p>Use este mesmo e-mail para criar sua senha ou acessar sua conta.</p>",
    ].join(""),
    subject: "Convite para o CRV Triad",
    text: [
      "Você recebeu um convite para acessar o CRV Triad.",
      `Permissão: ${roleLabel}.`,
      `O convite expira em ${expiresAt}.`,
      `Entrar: ${loginUrl.toString()}`,
      "Use este mesmo e-mail para criar sua senha ou acessar sua conta.",
    ].join("\n"),
    to: input.email,
  }
}

function buildVerificationMessage(env: IdpEnv, input: VerificationEmailInput): EmailMessage {
  const verificationUrl = new URL("/api/auth/verify-email", env.BETTER_AUTH_URL)
  const verifiedLoginUrl = new URL("/login", env.IDP_STUDIO_URL)
  verifiedLoginUrl.searchParams.set("verified", "true")
  verificationUrl.searchParams.set("token", input.token)
  verificationUrl.searchParams.set("callbackURL", verifiedLoginUrl.toString())

  return {
    html: [
      "<p>Confirme seu e-mail para acessar o CRV Triad.</p>",
      `<p><a href="${escapeHtml(verificationUrl.toString())}">Confirmar e-mail</a></p>`,
      "<p>Se você não solicitou esta confirmação, ignore este e-mail.</p>",
    ].join(""),
    subject: "Confirme seu e-mail no CRV Triad",
    text: [
      "Confirme seu e-mail para acessar o CRV Triad.",
      `Confirmar e-mail: ${verificationUrl.toString()}`,
      "Se você não solicitou esta confirmação, ignore este e-mail.",
    ].join("\n"),
    to: input.email,
  }
}

function buildPasswordResetMessage(env: IdpEnv, input: PasswordResetEmailInput): EmailMessage {
  const resetUrl = new URL(
    `/api/auth/reset-password/${encodeURIComponent(input.token)}`,
    env.BETTER_AUTH_URL,
  )
  resetUrl.searchParams.set(
    "callbackURL",
    new URL("/reset-password", env.IDP_STUDIO_URL).toString(),
  )

  return {
    html: [
      "<p>Recebemos uma solicitação para redefinir sua senha no CRV Triad.</p>",
      `<p><a href="${escapeHtml(resetUrl.toString())}">Redefinir senha</a></p>`,
      "<p>Se você não solicitou essa alteração, ignore este e-mail.</p>",
    ].join(""),
    subject: "Redefinição de senha do CRV Triad",
    text: [
      "Recebemos uma solicitação para redefinir sua senha no CRV Triad.",
      `Redefinir senha: ${resetUrl.toString()}`,
      "Se você não solicitou essa alteração, ignore este e-mail.",
    ].join("\n"),
    to: input.email,
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}
