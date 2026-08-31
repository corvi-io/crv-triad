import type { IdpEnv } from "../config/env.js"
import { createId } from "../infra/ids.js"
import type { IdpRole } from "./access-policy.js"
import { renderAuthEmail } from "./emails/render.js"
import {
  InvitationEmailTemplate,
  invitationEmailSubject,
  PasswordResetEmailTemplate,
  passwordResetEmailSubject,
  VerificationEmailTemplate,
  verificationEmailSubject,
} from "./emails/templates.js"

export type AuthEmailDelivery = "failed" | "sent" | "skipped"

export type InvitationEmailInput = {
  email: string
  expiresAt: Date
  role: IdpRole
  token: string
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
    sendInvitation: async (input) =>
      deliverEmail(env, fetchEmail, await buildInvitationMessage(env, input)),
    sendPasswordReset: async (input) =>
      deliverEmail(env, fetchEmail, await buildPasswordResetMessage(env, input)),
    sendVerification: async (input) =>
      deliverEmail(env, fetchEmail, await buildVerificationMessage(env, input)),
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

export async function buildInvitationMessage(
  env: IdpEnv,
  input: InvitationEmailInput,
): Promise<EmailMessage> {
  const actionUrl = new URL("/accept-invitation", env.IDP_STUDIO_URL)
  actionUrl.searchParams.set("token", input.token)
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Recife",
  }).format(input.expiresAt)
  const rendered = await renderAuthEmail(
    <InvitationEmailTemplate
      actionUrl={actionUrl.toString()}
      expiresAtLabel={expiresAt}
      invitationRole={input.role}
    />,
    invitationEmailSubject,
    actionUrl.toString(),
    [new URL(env.IDP_STUDIO_URL).origin],
  )

  return {
    ...rendered,
    to: input.email,
  }
}

export async function buildVerificationMessage(
  env: IdpEnv,
  input: VerificationEmailInput,
): Promise<EmailMessage> {
  const verificationUrl = new URL("/api/auth/verify-email", env.BETTER_AUTH_URL)
  const verifiedLoginUrl = new URL("/login", env.IDP_STUDIO_URL)
  verifiedLoginUrl.searchParams.set("verified", "true")
  verificationUrl.searchParams.set("token", input.token)
  verificationUrl.searchParams.set("callbackURL", verifiedLoginUrl.toString())
  const rendered = await renderAuthEmail(
    <VerificationEmailTemplate actionUrl={verificationUrl.toString()} />,
    verificationEmailSubject,
    verificationUrl.toString(),
    [new URL(env.BETTER_AUTH_URL).origin],
  )

  return {
    ...rendered,
    to: input.email,
  }
}

export async function buildPasswordResetMessage(
  env: IdpEnv,
  input: PasswordResetEmailInput,
): Promise<EmailMessage> {
  const resetUrl = new URL(
    `/api/auth/reset-password/${encodeURIComponent(input.token)}`,
    env.BETTER_AUTH_URL,
  )
  resetUrl.searchParams.set(
    "callbackURL",
    new URL("/reset-password", env.IDP_STUDIO_URL).toString(),
  )
  const rendered = await renderAuthEmail(
    <PasswordResetEmailTemplate actionUrl={resetUrl.toString()} />,
    passwordResetEmailSubject,
    resetUrl.toString(),
    [new URL(env.BETTER_AUTH_URL).origin],
  )

  return {
    ...rendered,
    to: input.email,
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}
