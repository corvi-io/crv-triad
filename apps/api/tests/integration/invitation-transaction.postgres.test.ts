import { fileURLToPath } from "node:url"
import { betterAuth } from "better-auth"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Elysia } from "elysia"
import { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  account,
  invitation,
  member,
  organization,
  organizationInvitation,
  session,
  user,
  verification,
} from "../../src/modules/idp/database/schema.js"
import { createInvitationRoutes } from "../../src/modules/idp/http/routes/invitations.js"
import { createAuthOptions } from "../../src/modules/idp/identity/auth.js"
import {
  acceptInvitationForUser,
  createInvitationSecret,
} from "../../src/modules/idp/identity/invitations.js"
import { createId } from "../../src/modules/idp/infra/ids.js"

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
const db = drizzle(pool, {
  schema: {
    account,
    invitation,
    member,
    organization,
    organizationInvitation,
    session,
    user,
    verification,
  },
})
const baseUrl = "http://127.0.0.1:8000"
const trustedOrigin = "http://localhost:3000"
const env = {
  NODE_ENV: "test",
  APP_ENV: "test",
  API_HOST: "127.0.0.1",
  API_PORT: 8000,
  DATABASE_URL: testDatabaseUrl,
  BETTER_AUTH_SECRET: "isolated-integration-secret-at-least-32-characters",
  BETTER_AUTH_URL: baseUrl,
  AUTH_TRUSTED_ORIGINS: [trustedOrigin],
  AUTH_SESSION_EXPIRES_IN_SECONDS: 2_592_000,
  AUTH_PASSWORD_MIN_LENGTH: 8,
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
  await db.delete(member)
  await db.delete(organizationInvitation)
  await db.delete(organization)
  await db.delete(invitation)
  await db.delete(verification)
  await db.delete(user)
})

afterAll(async () => {
  await pool.end()
})

describe("invitation transaction on PostgreSQL", () => {
  async function seedOrganizationInvitation(email: string, role: "admin" | "member" | "owner") {
    const now = new Date()
    const inviterId = createId()
    const invitedUserId = createId()
    const organizationId = createId()
    await db.insert(user).values([
      {
        email: "inviter@example.invalid",
        emailVerified: true,
        id: inviterId,
        name: "Inviter",
        role: "admin",
        status: "active",
      },
      {
        email,
        emailVerified: true,
        id: invitedUserId,
        name: "Invited user",
        role: "member",
        status: "active",
      },
    ])
    await db.insert(organization).values({
      id: organizationId,
      name: "Invited organization",
      slug: `invited-${organizationId}`,
    })
    const seeded = await seedInvitation(email)
    await db
      .update(invitation)
      .set({ invitedByUserId: inviterId })
      .where(eq(invitation.id, seeded.created.id))
    await db.insert(organizationInvitation).values({
      email,
      expiresAt: new Date(now.getTime() + 60_000),
      id: createId(),
      inviterId,
      organizationId,
      role,
      status: "pending",
    })
    return { ...seeded, invitedUserId, inviterId, organizationId }
  }

  it("completes both invitation levels for an existing account and replays safely", async () => {
    const email = "existing-google-invite@example.invalid"
    const seeded = await seedOrganizationInvitation(email, "owner")

    const first = await acceptInvitationForUser(
      db as never,
      email,
      seeded.invitedUserId,
      seeded.created.id,
    )
    const replay = await acceptInvitationForUser(
      db as never,
      email,
      seeded.invitedUserId,
      seeded.created.id,
    )

    expect(first?.id).toBe(seeded.created.id)
    expect(replay?.id).toBe(seeded.created.id)
    expect(await db.select().from(member)).toEqual([
      expect.objectContaining({
        organizationId: seeded.organizationId,
        role: "owner",
        status: "active",
        userId: seeded.invitedUserId,
      }),
    ])
    expect(await db.select().from(organizationInvitation)).toEqual([
      expect.objectContaining({ status: "accepted" }),
    ])
    expect(await db.select().from(invitation)).toEqual([
      expect.objectContaining({
        acceptedByUserId: seeded.invitedUserId,
        status: "accepted",
      }),
    ])
  })

  it("reactivates an existing membership without downgrading its role", async () => {
    const email = "existing-owner@example.invalid"
    const seeded = await seedOrganizationInvitation(email, "member")
    await db.insert(member).values({
      id: createId(),
      organizationId: seeded.organizationId,
      role: "owner",
      status: "disabled",
      userId: seeded.invitedUserId,
    })

    await acceptInvitationForUser(db as never, email, seeded.invitedUserId, seeded.created.id)

    expect(await db.select().from(member)).toEqual([
      expect.objectContaining({ role: "owner", status: "active" }),
    ])
  })

  it("does not restore a revoked global admin role during invitation replay", async () => {
    const email = "revoked-admin@example.invalid"
    const seeded = await seedOrganizationInvitation(email, "member")
    await db.update(invitation).set({ role: "admin" }).where(eq(invitation.id, seeded.created.id))

    await acceptInvitationForUser(db as never, email, seeded.invitedUserId, seeded.created.id)
    await db.update(user).set({ role: "member" }).where(eq(user.id, seeded.invitedUserId))
    const replay = await acceptInvitationForUser(
      db as never,
      email,
      seeded.invitedUserId,
      seeded.created.id,
    )

    expect(replay?.id).toBe(seeded.created.id)
    expect(
      await db.select({ role: user.role }).from(user).where(eq(user.id, seeded.invitedUserId)),
    ).toEqual([{ role: "member" }])
  })

  it("does not consume organization invitations created after the global invitation was accepted", async () => {
    const email = "later-organization-invite@example.invalid"
    const seeded = await seedOrganizationInvitation(email, "member")
    await acceptInvitationForUser(db as never, email, seeded.invitedUserId, seeded.created.id)
    const laterInvitationId = createId()
    await db.insert(organizationInvitation).values({
      email,
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      id: laterInvitationId,
      inviterId: seeded.inviterId,
      organizationId: seeded.organizationId,
      role: "admin",
      status: "pending",
    })

    await acceptInvitationForUser(db as never, email, seeded.invitedUserId, seeded.created.id)

    expect(
      await db
        .select({ status: organizationInvitation.status })
        .from(organizationInvitation)
        .where(eq(organizationInvitation.id, laterInvitationId)),
    ).toEqual([{ status: "pending" }])
  })

  it("rejects an email mismatch without consuming either invitation", async () => {
    const seeded = await seedOrganizationInvitation("recipient@example.invalid", "owner")

    await expect(
      acceptInvitationForUser(
        db as never,
        "different@example.invalid",
        seeded.invitedUserId,
        seeded.created.id,
      ),
    ).resolves.toBeNull()

    expect(await db.select().from(invitation)).toEqual([
      expect.objectContaining({ acceptedByUserId: null, status: "pending" }),
    ])
    expect(await db.select().from(organizationInvitation)).toEqual([
      expect.objectContaining({ status: "pending" }),
    ])
    expect(await db.select().from(member)).toHaveLength(0)
  })

  it("rolls back both invitation levels after an intermediate membership failure and recovers", async () => {
    const email = "recoverable-google-invite@example.invalid"
    const seeded = await seedOrganizationInvitation(email, "owner")
    await db.insert(member).values({
      id: createId(),
      organizationId: seeded.organizationId,
      role: "owner",
      status: "active",
      userId: seeded.inviterId,
    })

    await expect(
      acceptInvitationForUser(db as never, email, seeded.invitedUserId, seeded.created.id),
    ).rejects.toMatchObject({ cause: { code: "23505" } })
    expect(await db.select().from(invitation)).toEqual([
      expect.objectContaining({ acceptedByUserId: null, status: "pending" }),
    ])
    expect(await db.select().from(organizationInvitation)).toEqual([
      expect.objectContaining({ status: "pending" }),
    ])

    await db.update(member).set({ status: "disabled" }).where(eq(member.userId, seeded.inviterId))
    await expect(
      acceptInvitationForUser(db as never, email, seeded.invitedUserId, seeded.created.id),
    ).resolves.toMatchObject({ status: "accepted" })
    expect(await db.select().from(member).where(eq(member.userId, seeded.invitedUserId))).toEqual([
      expect.objectContaining({ role: "owner", status: "active" }),
    ])
  })

  it("recovers an accepted invitation replay after a downstream observer failure", async () => {
    const email = "observer-recovery@example.invalid"
    const seeded = await seedOrganizationInvitation(email, "member")
    const auth = {
      api: {
        getSession: async () => ({ user: { email, id: seeded.invitedUserId } }),
      },
    }
    const failingApp = new Elysia().use(
      createInvitationRoutes(auth as never, db as never, undefined, async () => {
        throw new Error("Injected observer failure")
      }),
    )
    const request = () =>
      new Request("http://idp.test/invitations/accept-existing", {
        body: JSON.stringify({ token: seeded.proof }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })

    const firstResponse = await failingApp.handle(request())
    expect(firstResponse.status).toBe(503)
    await expect(firstResponse.json()).resolves.toEqual({
      code: "INVITATION_COMPLETION_FAILED",
    })

    const observer = vi.fn(async () => undefined)
    const recoveryApp = new Elysia().use(
      createInvitationRoutes(auth as never, db as never, undefined, observer),
    )
    const replayResponse = await recoveryApp.handle(request())

    expect(replayResponse.status).toBe(200)
    expect(observer).toHaveBeenCalledWith(seeded.created.id, seeded.invitedUserId)
    expect(await db.select().from(member)).toHaveLength(1)
  })

  it("returns a safe account mismatch without consuming a valid proof", async () => {
    const seeded = await seedOrganizationInvitation("proof-owner@example.invalid", "member")
    const app = new Elysia().use(
      createInvitationRoutes(
        {
          api: {
            getSession: async () => ({
              user: { email: "other-account@example.invalid", id: seeded.invitedUserId },
            }),
          },
        } as never,
        db as never,
      ),
    )

    const response = await app.handle(
      new Request("http://idp.test/invitations/accept-existing", {
        body: JSON.stringify({ token: seeded.proof }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ code: "INVITATION_ACCOUNT_MISMATCH" })
    expect(await db.select().from(invitation)).toEqual([
      expect.objectContaining({ acceptedByUserId: null, status: "pending" }),
    ])
  })

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
      password: "Senha válida 1!",
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
        password: "Senha válida 1!",
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
