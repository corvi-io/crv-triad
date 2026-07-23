import { fileURLToPath } from "node:url"
import { betterAuth } from "better-auth"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { account, invitation, session, user, verification } from "../../src/database/schema.js"
import { createAuthOptions } from "../../src/identity/auth.js"
import { createInvitationSecret } from "../../src/identity/invitations.js"
import { createId } from "../../src/infra/ids.js"

const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required for the opt-in PostgreSQL integration suite.")
}

let parsedTestDatabaseUrl: URL
try {
  parsedTestDatabaseUrl = new URL(testDatabaseUrl)
} catch {
  throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.")
}
const isLoopback = ["127.0.0.1", "::1", "localhost"].includes(parsedTestDatabaseUrl.hostname)
const databaseName = parsedTestDatabaseUrl.pathname.slice(1)
if (
  !["postgres:", "postgresql:"].includes(parsedTestDatabaseUrl.protocol) ||
  !isLoopback ||
  !parsedTestDatabaseUrl.port ||
  parsedTestDatabaseUrl.port === "5432" ||
  !databaseName.endsWith("_test")
) {
  throw new Error(
    "TEST_DATABASE_URL must target a loopback-only, non-default-port database ending in _test.",
  )
}

const pool = new Pool({ connectionString: testDatabaseUrl, max: 8 })
const db = drizzle(pool, { schema: { account, invitation, session, user, verification } })
const baseUrl = "http://127.0.0.1:8001"
const trustedOrigin = "http://localhost:3000"
const env = {
  NODE_ENV: "test",
  APP_ENV: "test",
  IDP_HOST: "127.0.0.1",
  IDP_PORT: 8001,
  DATABASE_URL: testDatabaseUrl,
  BETTER_AUTH_SECRET: "isolated-integration-secret-at-least-32-characters",
  BETTER_AUTH_URL: baseUrl,
  AUTH_TRUSTED_ORIGINS: [trustedOrigin],
  AUTH_SESSION_EXPIRES_IN_SECONDS: 2_592_000,
  AUTH_PASSWORD_MIN_LENGTH: 15,
  AUTH_PASSWORD_MAX_LENGTH: 256,
  AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS: 3_600,
  AUTH_GOOGLE_CLIENT_ID: "integration-google-client-placeholder",
  AUTH_GOOGLE_CLIENT_SECRET: "integration-google-secret-placeholder",
  IDP_EMAIL_FROM: "auth@example.invalid",
  IDP_STUDIO_URL: trustedOrigin,
  IDP_RESEND_API_KEY: "integration-resend-placeholder",
  IDP_RESEND_API_URL: "https://api.resend.com",
} as const
const emailSender = {
  sendInvitation: async () => "sent" as const,
  sendPasswordReset: async () => "sent" as const,
  sendVerification: async () => "sent" as const,
}

async function requestSignup(
  auth: { handler: (request: Request) => Promise<Response> },
  body: Record<string, unknown>,
) {
  return auth.handler(
    new Request(`${baseUrl}/api/auth/sign-up/email`, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", origin: trustedOrigin },
      method: "POST",
    }),
  )
}

async function seedInvitation(email: string) {
  const secret = createInvitationSecret()
  const now = new Date()
  const [created] = await db
    .insert(invitation)
    .values({
      id: createId(),
      email,
      role: "member",
      status: "pending",
      invitedByUserId: null,
      expiresAt: new Date(now.getTime() + 60_000),
      tokenDigest: secret.digest,
      tokenIssuedAt: now,
    })
    .returning()
  return { created, proof: secret.token }
}

beforeAll(async () => {
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  })
})

beforeEach(async () => {
  await db.delete(session)
  await db.delete(account)
  await db.delete(invitation)
  await db.delete(verification)
  await db.delete(user)
})

afterAll(async () => {
  await pool.end()
})

describe("invitation transaction on PostgreSQL", () => {
  it("allows exactly one simultaneous native acceptance", async () => {
    const email = "concurrent-proof@example.invalid"
    const seeded = await seedInvitation(email)
    const auth = betterAuth({
      ...createAuthOptions(env as never, db as never, emailSender),
      logger: { disabled: true },
      rateLimit: { enabled: false },
    })
    const body = {
      email: "untrusted-input@example.invalid",
      invitationToken: seeded.proof,
      name: "Usuário TRIAD",
      password: "uma frase longa e exclusiva",
      rememberMe: false,
    }

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const responses = await Promise.all([
      requestSignup(auth, body),
      requestSignup(auth, body),
    ]).finally(() => consoleError.mockRestore())
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1)
    expect(responses.filter((response) => response.status !== 200)).toHaveLength(1)

    const persistedUsers = await db.select().from(user).where(eq(user.email, email))
    const persistedAccounts = await db.select().from(account)
    const [persistedInvitation] = await db
      .select()
      .from(invitation)
      .where(eq(invitation.id, seeded.created.id))
      .limit(1)
    expect(persistedUsers).toHaveLength(1)
    expect(persistedAccounts).toHaveLength(1)
    expect(persistedInvitation).toMatchObject({
      acceptedByUserId: persistedUsers[0]?.id,
      status: "accepted",
    })
  })

  it("rolls back consumption and native identity writes after credential failure", async () => {
    const email = "rollback-proof@example.invalid"
    const seeded = await seedInvitation(email)
    const options = createAuthOptions(env as never, db as never, emailSender)
    const accountCreateBefore = options.databaseHooks?.account?.create?.before
    if (!accountCreateBefore) throw new Error("Expected the credential proof hook.")
    const auth = betterAuth({
      ...options,
      databaseHooks: {
        ...options.databaseHooks,
        account: {
          create: {
            ...options.databaseHooks?.account?.create,
            before: async (incomingAccount: unknown, context: unknown) => {
              await accountCreateBefore(incomingAccount as never, context as never)
              throw new Error("Injected credential persistence failure.")
            },
          },
        },
      },
      logger: { disabled: true },
      rateLimit: { enabled: false },
    })
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    try {
      const response = await requestSignup(auth, {
        email: "untrusted-input@example.invalid",
        invitationToken: seeded.proof,
        name: "Usuário TRIAD",
        password: "uma frase longa e exclusiva",
        rememberMe: false,
      })
      expect(response.status).not.toBe(200)
    } finally {
      consoleError.mockRestore()
    }

    const [persistedInvitation] = await db
      .select()
      .from(invitation)
      .where(eq(invitation.id, seeded.created.id))
      .limit(1)
    expect(await db.select().from(user)).toHaveLength(0)
    expect(await db.select().from(account)).toHaveLength(0)
    expect(persistedInvitation).toMatchObject({
      acceptedAt: null,
      acceptedByUserId: null,
      status: "pending",
    })
  })
})
