import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { eq } from "drizzle-orm"

import type { IdpEnv } from "../config/env.js"
import type { IdpDatabase } from "../database/client.js"
import * as schema from "../database/schema.js"
import { user } from "../database/schema.js"
import { createId } from "../infra/ids.js"
import { decideCredentialAccess, normalizeEmail } from "./access-policy.js"
import { acceptInvitationForUser, findPendingInvitationByEmail } from "./invitations.js"

type BetterAuthUserCreateInput = {
  id?: string
  email: string
  name?: string
  [key: string]: unknown
}

type CookieEnv = Pick<IdpEnv, "APP_ENV" | "BETTER_AUTH_URL">

const partitionedDevelopmentCookiePrefix = "triad-dev-partitioned"

function usesPartitionedDevelopmentCookies(env: CookieEnv) {
  const baseUrl = new URL(env.BETTER_AUTH_URL)
  return env.APP_ENV === "development" && baseUrl.protocol === "https:"
}

export function getCookiePrefix(env: CookieEnv) {
  return usesPartitionedDevelopmentCookies(env) ? partitionedDevelopmentCookiePrefix : undefined
}

export function getDefaultCookieAttributes(env: CookieEnv) {
  const baseUrl = new URL(env.BETTER_AUTH_URL)

  if (baseUrl.protocol !== "https:") return undefined

  return {
    ...(usesPartitionedDevelopmentCookies(env) ? { partitioned: true } : {}),
    sameSite: "none",
    secure: true,
  } as const
}

export function createAuth(env: IdpEnv, db: IdpDatabase) {
  const cookiePrefix = getCookiePrefix(env)
  const defaultCookieAttributes = getDefaultCookieAttributes(env)

  return betterAuth({
    appName: "CRV Triad Identity Provider",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.AUTH_TRUSTED_ORIGINS,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: env.AUTH_PASSWORD_MIN_LENGTH,
      maxPasswordLength: env.AUTH_PASSWORD_MAX_LENGTH,
      resetPasswordTokenExpiresIn: env.AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: resetUser, url }) => {
        if (!env.IDP_INVITATION_EMAILS_ENABLED) {
          return
        }

        await sendIdentityEmail(env, {
          html: [
            "<p>Recebemos uma solicitacao para redefinir sua senha no CRV Triad.</p>",
            `<p><a href="${escapeHtml(url)}">Redefinir senha</a></p>`,
            "<p>Se voce nao solicitou essa alteracao, ignore este email.</p>",
          ].join(""),
          subject: "Redefinicao de senha do CRV Triad",
          text: [
            "Recebemos uma solicitacao para redefinir sua senha no CRV Triad.",
            `Redefinir senha: ${url}`,
            "Se voce nao solicitou essa alteracao, ignore este email.",
          ].join("\n"),
          to: resetUser.email,
        })
      },
    },
    session: {
      expiresIn: env.AUTH_SESSION_EXPIRES_IN_SECONDS,
      storeSessionInDatabase: true,
    },
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
      ...(cookiePrefix ? { cookiePrefix } : {}),
      ...(defaultCookieAttributes ? { defaultCookieAttributes } : {}),
      database: {
        generateId: createId,
      },
    },
    user: {
      additionalFields: {
        status: {
          type: ["active", "disabled"],
          required: false,
          defaultValue: "active",
          input: false,
        },
        role: {
          type: ["admin", "member"],
          required: false,
          defaultValue: "member",
          input: false,
        },
      },
      deleteUser: {
        enabled: false,
      },
      changeEmail: {
        enabled: false,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (incomingUser) => {
            const candidate = incomingUser as BetterAuthUserCreateInput
            const email = normalizeEmail(candidate.email)
            const decision = await decideCredentialAccess(email, {
              findUserByEmail: async (lookupEmail) => {
                const [existingUser] = await db
                  .select()
                  .from(user)
                  .where(eq(user.email, lookupEmail))
                  .limit(1)

                return existingUser ?? null
              },
              findPendingInvitationByEmail: (lookupEmail, now) =>
                findPendingInvitationByEmail(db, lookupEmail, now),
            })

            if (!decision.allowed) {
              throw new APIError("FORBIDDEN", {
                message: "Access requires an active user or invitation.",
              })
            }

            if (decision.reason === "pending_invitation") {
              return {
                data: {
                  ...candidate,
                  email,
                  status: "active",
                  role: decision.invitation.role,
                },
              }
            }

            return { data: { ...candidate, email } }
          },
          after: async (createdUser) => {
            await acceptInvitationForUser(db, createdUser.email, createdUser.id)
          },
        },
      },
      session: {
        create: {
          before: async (incomingSession) => {
            const [sessionUser] = await db
              .select()
              .from(user)
              .where(eq(user.id, incomingSession.userId))
              .limit(1)

            if (sessionUser?.status !== "active") {
              throw new APIError("FORBIDDEN", { message: "User is not active." })
            }
          },
        },
      },
    },
  })
}

export type IdpAuth = ReturnType<typeof createAuth>

type IdentityEmailInput = {
  html: string
  subject: string
  text: string
  to: string
}

async function sendIdentityEmail(env: IdpEnv, input: IdentityEmailInput) {
  if (!env.IDP_RESEND_API_KEY || !env.IDP_INVITATION_EMAIL_FROM) {
    return
  }

  await fetch(`${env.IDP_RESEND_API_URL.replace(/\/$/, "")}/emails`, {
    body: JSON.stringify({
      from: env.IDP_INVITATION_EMAIL_FROM,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: [input.to],
    }),
    headers: {
      Authorization: `Bearer ${env.IDP_RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  })
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}
