import { type BetterAuthOptions, betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { organization } from "better-auth/plugins/organization"
import { and, count, eq } from "drizzle-orm"

import type { IdpEnv } from "../config/env.js"
import type { IdpDatabase } from "../database/client.js"
import * as schema from "../database/schema.js"
import { invitation, member, user } from "../database/schema.js"
import { createId } from "../infra/ids.js"
import { decideIdentityAccess, normalizeEmail } from "./access-policy.js"
import {
  consumeInvitationProof,
  invitationProofPlugin,
  readInvitationToken,
  resolveInvitationProof,
} from "./invitation-proof.js"
import {
  acceptInvitationForUser,
  acceptOrganizationInvitationsForUser,
  findPendingInvitationByEmail,
} from "./invitations.js"
import { evaluatePassword } from "./password-policy.js"
import {
  type AuthEmailSender,
  assertAuthEmailSent,
  createAuthEmailSender,
} from "./transactional-email.js"

type BetterAuthUserCreateInput = {
  id?: string
  email: string
  emailVerified?: boolean
  name?: string
  [key: string]: unknown
}

type BetterAuthAccountCreateInput = {
  accountId: string
  providerId: string
  userId: string
  [key: string]: unknown
}

type CookieEnv = Pick<IdpEnv, "APP_ENV" | "BETTER_AUTH_URL">

export type AuthEmailDeliveryFailureEvent = Readonly<{
  event: "auth_email_delivery_failed"
  operation: "password_reset"
}>

export type AuthEmailDeliveryFailureObserver = (event: AuthEmailDeliveryFailureEvent) => void
export type InvitationAcceptedObserver = (
  invitationId: string | undefined,
  userId: string,
) => Promise<void>

const STANDARD_COOKIE_PREFIX = "triad-auth"
const PARTITIONED_COOKIE_PREFIX = "triad-auth-partitioned"
export const MAX_ACTIVE_ORGANIZATION_MEMBERSHIPS = 50

const defaultAuthEmailDeliveryFailureObserver: AuthEmailDeliveryFailureObserver = (event) => {
  console.error(JSON.stringify(event))
}

function usesPartitionedDevelopmentCookies(env: CookieEnv) {
  const baseUrl = new URL(env.BETTER_AUTH_URL)
  return env.APP_ENV === "development" && baseUrl.protocol === "https:"
}

export function getCookiePrefix(env: CookieEnv) {
  return usesPartitionedDevelopmentCookies(env) ? PARTITIONED_COOKIE_PREFIX : STANDARD_COOKIE_PREFIX
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

export function handleBackgroundTask(promise: Promise<unknown>): void {
  void promise.catch(() => undefined)
}

export function createAuth(
  env: IdpEnv,
  db: IdpDatabase,
  authEmailSender: AuthEmailSender = createAuthEmailSender(env),
  observeAuthEmailDeliveryFailure: AuthEmailDeliveryFailureObserver = defaultAuthEmailDeliveryFailureObserver,
  onInvitationAccepted?: InvitationAcceptedObserver,
) {
  return betterAuth(
    createAuthOptions(
      env,
      db,
      authEmailSender,
      observeAuthEmailDeliveryFailure,
      onInvitationAccepted,
    ),
  )
}

export function createAuthOptions(
  env: IdpEnv,
  db: IdpDatabase,
  authEmailSender: AuthEmailSender,
  observeAuthEmailDeliveryFailure: AuthEmailDeliveryFailureObserver = defaultAuthEmailDeliveryFailureObserver,
  onInvitationAccepted?: InvitationAcceptedObserver,
): BetterAuthOptions {
  const cookiePrefix = getCookiePrefix(env)
  const defaultCookieAttributes = getDefaultCookieAttributes(env)

  return {
    appName: "CRV Triad Identity Provider",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.AUTH_TRUSTED_ORIGINS,
    database: drizzleAdapter(db, {
      provider: "pg",
      transaction: true,
      schema: {
        ...schema,
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        invitation: schema.invitation,
      },
    }),
    plugins: [
      organization({
        allowUserToCreateOrganization: false,
        disableOrganizationDeletion: true,
        creatorRole: "owner",
        dynamicAccessControl: { enabled: false },
        schema: {
          session: { fields: { activeOrganizationId: "active_organization_id" } },
          organization: {
            modelName: "organization",
            additionalFields: {
              status: {
                type: ["active", "disabled"],
                required: false,
                defaultValue: "active",
                input: false,
              },
            },
          },
          member: {
            modelName: "member",
            additionalFields: {
              status: {
                type: ["active", "disabled"],
                required: false,
                defaultValue: "active",
                input: false,
              },
            },
          },
          invitation: { modelName: "organizationInvitation" },
        },
        organizationHooks: {
          beforeAddMember: async ({ member: incomingMember }) => {
            const [result] = await db
              .select({ value: count() })
              .from(member)
              .where(and(eq(member.userId, incomingMember.userId), eq(member.status, "active")))

            if ((result?.value ?? 0) >= MAX_ACTIVE_ORGANIZATION_MEMBERSHIPS) {
              throw new APIError("BAD_REQUEST", {
                code: "MEMBERSHIP_LIMIT_REACHED",
                message: "Active organization membership limit reached.",
              })
            }
          },
          beforeCreateInvitation: async () => {
            throw new APIError("FORBIDDEN", {
              code: "ORGANIZATION_INVITATIONS_DISABLED",
              message: "Organization invitations are disabled.",
            })
          },
        },
      }),
      invitationProofPlugin(),
    ],
    logger: { disabled: true },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        const password = getProposedPassword(context.path, context.body)
        if (password === null) return

        const result = evaluatePassword(password)
        if (!result.accepted) {
          throw new APIError("BAD_REQUEST", {
            code: "PASSWORD_POLICY_REJECTED",
            message: "Password does not meet policy.",
          })
        }
      }),
      after: createAuthMiddleware(async (context) => {
        if (
          context.path === "/sign-up/email" &&
          context.context.returned &&
          !(context.context.returned instanceof APIError)
        ) {
          const createdSession = context.context.newSession
          if (createdSession?.user) {
            await acceptOrganizationInvitationsForUser(
              db,
              createdSession.user.email,
              createdSession.user.id,
            )
            const [accepted] = await db
              .select({ id: invitation.id })
              .from(invitation)
              .where(
                and(
                  eq(invitation.acceptedByUserId, createdSession.user.id),
                  eq(invitation.status, "accepted"),
                ),
              )
              .limit(1)
            if (accepted) await onInvitationAccepted?.(accepted.id, createdSession.user.id)
          }
          return context.json({ status: true })
        }
      }),
    },
    emailVerification: {
      autoSignInAfterVerification: false,
      expiresIn: 3_600,
      sendOnSignIn: true,
      sendOnSignUp: false,
      sendVerificationEmail: async ({ user: verificationUser, token }) => {
        const delivery = await authEmailSender.sendVerification({
          email: verificationUser.email,
          token,
        })
        assertAuthEmailSent(delivery)
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: env.AUTH_PASSWORD_MIN_LENGTH,
      maxPasswordLength: env.AUTH_PASSWORD_MAX_LENGTH * 2,
      resetPasswordTokenExpiresIn: env.AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: resetUser, token }) => {
        try {
          const delivery = await authEmailSender.sendPasswordReset({
            email: resetUser.email,
            token,
          })
          if (delivery === "sent") return
        } catch {
          // Delivery failures must not change the enumeration-safe reset response.
        }

        safelyObserveAuthEmailDeliveryFailure(observeAuthEmailDeliveryFailure)
      },
    },
    socialProviders: {
      google: {
        clientId: env.AUTH_GOOGLE_CLIENT_ID,
        clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET,
        disableDefaultScope: true,
        overrideUserInfoOnSignIn: false,
        scope: ["openid", "email", "profile"],
      },
    },
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
        requireLocalEmailVerified: false,
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
      },
    },
    session: {
      expiresIn: env.AUTH_SESSION_EXPIRES_IN_SECONDS,
      storeSessionInDatabase: true,
    },
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
      cookiePrefix,
      ...(defaultCookieAttributes ? { defaultCookieAttributes } : {}),
      backgroundTasks: {
        handler: handleBackgroundTask,
      },
      database: {
        generateId: createId,
      },
    },
    rateLimit: {
      enabled: true,
      max: 100,
      storage: "memory" as const,
      window: 60,
      customRules: {
        "/callback/google": { max: 30, window: 60 },
        "/request-password-reset": { max: 5, window: 60 },
        "/send-verification-email": { max: 5, window: 60 },
        "/sign-in/email": { max: 10, window: 60 },
        "/sign-in/social": { max: 20, window: 60 },
        "/sign-up/email": { max: 5, window: 60 },
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
          before: async (incomingUser, context) => {
            const candidate = incomingUser as BetterAuthUserCreateInput
            if (context?.path === "/sign-up/email") {
              const token = readInvitationToken(context as never)
              const proof = token ? await resolveInvitationProof(context as never, token) : null

              if (!proof) throwInvalidInvitationProof()
              const name = typeof candidate.name === "string" ? candidate.name.trim() : ""
              if (name.length < 2) {
                throw new APIError("BAD_REQUEST", {
                  code: "INVALID_IDENTITY_PROFILE",
                  message: "Identity name is required.",
                })
              }

              return {
                data: {
                  ...candidate,
                  email: proof.email,
                  emailVerified: true,
                  name,
                  role: proof.role,
                  status: "active",
                },
              }
            }

            if (context?.path === "/callback/google" && candidate.emailVerified !== true) {
              throw new APIError("FORBIDDEN", {
                message: "Google email must be verified.",
              })
            }

            const email = normalizeEmail(candidate.email)
            const decision = await decideIdentityAccess(email, {
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
          after: async (createdUser, context) => {
            if (context?.path === "/callback/google") {
              const accepted = await acceptInvitationForUser(db, createdUser.email, createdUser.id)
              if (accepted) await onInvitationAccepted?.(accepted.id, createdUser.id)
            }
          },
        },
      },
      account: {
        create: {
          before: async (incomingAccount, context) => {
            const candidate = incomingAccount as BetterAuthAccountCreateInput
            if (context?.path !== "/sign-up/email" || candidate.providerId !== "credential") return

            const token = readInvitationToken(context as never)
            const consumed = token
              ? await consumeInvitationProof(context as never, token, candidate.userId)
              : false

            if (!consumed) throwInvalidInvitationProof()
          },
        },
      },
      session: {
        create: {
          before: async (incomingSession, context) => {
            // Better Auth creates the sign-up session before the new user is visible
            // to a separate database query. Invitation proof and the active/verified
            // user fields are enforced by the sign-up hooks above.
            if (context?.path === "/sign-up/email") return

            const [sessionUser] = await db
              .select()
              .from(user)
              .where(eq(user.id, incomingSession.userId))
              .limit(1)

            if (sessionUser?.status !== "active") {
              throw new APIError("FORBIDDEN", { message: "User is not active." })
            }
            if (!sessionUser.emailVerified) {
              throw new APIError("FORBIDDEN", { message: "User email is not verified." })
            }
            const accepted = await acceptInvitationForUser(db, sessionUser.email, sessionUser.id)
            await onInvitationAccepted?.(accepted?.id, sessionUser.id)
          },
        },
      },
    },
  }
}

function getProposedPassword(path: string, body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const input = body as Record<string, unknown>

  if (path === "/sign-up/email") return typeof input.password === "string" ? input.password : null
  if (path === "/reset-password" || path === "/change-password") {
    return typeof input.newPassword === "string" ? input.newPassword : null
  }

  return null
}

function throwInvalidInvitationProof(): never {
  throw new APIError("FORBIDDEN", {
    code: "INVALID_INVITATION_PROOF",
    message: "Invitation proof is invalid or unavailable.",
  })
}

function safelyObserveAuthEmailDeliveryFailure(observer: AuthEmailDeliveryFailureObserver): void {
  try {
    observer({ event: "auth_email_delivery_failed", operation: "password_reset" })
  } catch {
    // Observability must never change the authentication response contract.
  }
}

export type IdpAuth = ReturnType<typeof createAuth>
