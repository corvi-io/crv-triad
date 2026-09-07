import type { SQL } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"
import { Elysia } from "elysia"
import { afterEach, describe, expect, it, vi } from "vitest"

import { session } from "../../../src/modules/idp/database/schema.js"
import { createIdpRoutes } from "../../../src/modules/idp/http/app.js"
import { createAuthRoutes } from "../../../src/modules/idp/http/routes/auth.js"
import { createHealthRoutes } from "../../../src/modules/idp/http/routes/health.js"
import { createInvitationRoutes } from "../../../src/modules/idp/http/routes/invitations.js"
import { createReadyRoutes } from "../../../src/modules/idp/http/routes/ready.js"
import { createUserRoutes } from "../../../src/modules/idp/http/routes/users.js"
import { createInvitationSecret } from "../../../src/modules/idp/identity/invitations.js"

const baseEnv = {
  NODE_ENV: "production",
  APP_ENV: "development",
  API_HOST: "127.0.0.1",
  API_PORT: 8000,
  DATABASE_URL: "postgresql://idp:idp@127.0.0.1:5432/idp",
  BETTER_AUTH_SECRET: "test-secret-with-at-least-thirty-two-chars",
  BETTER_AUTH_URL: "http://idp.test",
  AUTH_TRUSTED_ORIGINS: [],
  AUTH_SESSION_EXPIRES_IN_SECONDS: 2_592_000,
  AUTH_PASSWORD_MIN_LENGTH: 8,
  AUTH_PASSWORD_MAX_LENGTH: 256,
  AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS: 3_600,
} as const

function createInvitationRouteDatabase(selectRows: unknown[][]) {
  const calls = { executeCount: 0, insertedValues: [] as unknown[], transactionCount: 0 }

  const select = () => {
    const rows = selectRows.shift() ?? []
    const selectQuery = {
      from: () => selectQuery,
      where: () => selectQuery,
      orderBy: () => selectQuery,
      limit: async () => rows,
    }

    return selectQuery
  }

  const transactionDb = {
    execute: async () => {
      calls.executeCount += 1
      return []
    },
    select,
    insert: () => ({
      values: (value: unknown) => {
        calls.insertedValues.push(value)
        return {
          returning: async () => [
            {
              acceptedAt: null,
              acceptedByUserId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              ...(value as object),
            },
          ],
        }
      },
    }),
  }

  const db = {
    ...transactionDb,
    transaction: async <T>(callback: (transaction: typeof transactionDb) => Promise<T>) => {
      calls.transactionCount += 1
      return callback(transactionDb)
    },
  }

  return { calls, db }
}

function createAdminRouteDatabase({
  selectRows = [],
  updateRows = [],
}: {
  selectRows?: unknown[][]
  updateRows?: unknown[][]
}) {
  const calls = {
    updatedValues: [] as unknown[],
  }

  const select = () => {
    const rows = selectRows.shift() ?? []
    let hasOrderBy = false
    const selectQuery = {
      from: () => selectQuery,
      where: () => selectQuery,
      orderBy: () => {
        hasOrderBy = true
        return selectQuery
      },
      limit: () => (hasOrderBy ? selectQuery : Promise.resolve(rows)),
      offset: async () => rows,
    }

    return selectQuery
  }

  const db = {
    select,
    update: () => ({
      set: (value: unknown) => {
        calls.updatedValues.push(value)
        return {
          where: () => ({
            returning: async () => updateRows.shift() ?? [],
          }),
        }
      },
    }),
  }

  return { calls, db }
}

function createUserMutationDatabase({
  sessionUserIds,
  updatedUser,
}: {
  sessionUserIds: string[]
  updatedUser: Record<string, unknown>
}) {
  const calls = {
    deletedSessionUserIds: [] as string[],
    remainingSessionUserIds: [...sessionUserIds],
    transactionCount: 0,
    updatedValues: [] as unknown[],
  }
  const dialect = new PgDialect()
  const select = () => {
    const query = {
      from: () => query,
      where: () => query,
      limit: async () => [{ id: "admin-1", status: "active", role: "admin" }],
    }
    return query
  }
  const transactionDb = {
    delete: (table: unknown) => ({
      where: async (condition: SQL) => {
        expect(table).toBe(session)
        const [userId] = dialect.sqlToQuery(condition).params
        calls.deletedSessionUserIds.push(String(userId))
        calls.remainingSessionUserIds = calls.remainingSessionUserIds.filter(
          (candidate) => candidate !== userId,
        )
      },
    }),
    update: () => ({
      set: (value: unknown) => {
        calls.updatedValues.push(value)
        return {
          where: () => ({ returning: async () => [updatedUser] }),
        }
      },
    }),
  }
  const db = {
    select,
    transaction: async <T>(callback: (transaction: typeof transactionDb) => Promise<T>) => {
      calls.transactionCount += 1
      return callback(transactionDb)
    },
  }

  return { calls, db }
}

describe("custom routes", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("adds credentialed CORS headers for trusted browser origins", async () => {
    const auth = {
      api: { getSession: async () => null },
      handler: async () => new Response("ok"),
    }
    const db = { execute: async () => [{ ok: 1 }] }
    const app = createIdpRoutes({
      env: { ...baseEnv, AUTH_TRUSTED_ORIGINS: ["http://localhost:3000"] } as never,
      auth: auth as never,
      db: db as never,
    })

    const response = await app.handle(
      new Request("http://idp.test/api/auth/sign-in/social", {
        method: "POST",
        headers: { Origin: "http://localhost:3000" },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000")
    expect(response.headers.get("access-control-allow-credentials")).toBe("true")
  })

  it("handles CORS preflight for trusted browser origins", async () => {
    const auth = {
      api: { getSession: async () => null },
      handler: async () => new Response("should not be called"),
    }
    const db = { execute: async () => [{ ok: 1 }] }
    const app = createIdpRoutes({
      env: { ...baseEnv, AUTH_TRUSTED_ORIGINS: ["http://localhost:3000"] } as never,
      auth: auth as never,
      db: db as never,
    })

    const response = await app.handle(
      new Request("http://idp.test/api/auth/sign-in/social", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
          "Access-Control-Request-Headers": "content-type",
        },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000")
    expect(response.headers.get("access-control-allow-credentials")).toBe("true")
    expect(response.headers.get("access-control-allow-headers")).toBe("content-type")
  })

  it("does not add CORS headers for untrusted browser origins", async () => {
    const auth = {
      api: { getSession: async () => null },
      handler: async () => new Response("ok"),
    }
    const db = { execute: async () => [{ ok: 1 }] }
    const app = createIdpRoutes({
      env: { ...baseEnv, AUTH_TRUSTED_ORIGINS: ["http://localhost:3000"] } as never,
      auth: auth as never,
      db: db as never,
    })

    const response = await app.handle(
      new Request("http://idp.test/api/auth/sign-in/social", {
        method: "POST",
        headers: { Origin: "http://evil.test" },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.has("access-control-allow-origin")).toBe(false)
    expect(response.headers.has("access-control-allow-credentials")).toBe(false)
  })

  it("exposes OpenAPI outside the IDP production app environment", async () => {
    const auth = {
      api: { getSession: async () => null },
      handler: async () => new Response(null, { status: 404 }),
    }
    const db = { execute: async () => [{ ok: 1 }] }
    const app = createIdpRoutes({ env: baseEnv as never, auth: auth as never, db: db as never })

    const response = await app.handle(new Request("http://idp.test/openapi.json"))

    expect(response.status).toBe(200)
  })

  it("hides OpenAPI in the IDP production app environment", async () => {
    const auth = {
      api: { getSession: async () => null },
      handler: async () => new Response(null, { status: 404 }),
    }
    const db = { execute: async () => [{ ok: 1 }] }
    const app = createIdpRoutes({
      env: { ...baseEnv, APP_ENV: "production" } as never,
      auth: auth as never,
      db: db as never,
    })

    const response = await app.handle(new Request("http://idp.test/openapi.json"))

    expect(response.status).toBe(404)
  })

  it("forwards Better Auth requests with the /api/auth prefix intact", async () => {
    const auth = {
      handler: async (request: Request) => new Response(new URL(request.url).pathname),
    }
    const app = new Elysia().use(createAuthRoutes(auth as never))

    const response = await app.handle(new Request("http://idp.test/api/auth/sign-in/google"))

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe("/api/auth/sign-in/google")
  })

  it("returns health status", async () => {
    const app = new Elysia().use(createHealthRoutes())

    const response = await app.handle(new Request("http://idp.test/health"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "ok", service: "idp" })
  })

  it("returns ready when the database check succeeds", async () => {
    const db = { execute: async () => [{ ok: 1 }] }
    const app = new Elysia().use(createReadyRoutes(db as never))

    const response = await app.handle(new Request("http://idp.test/ready"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "ready", service: "idp" })
  })

  it("returns not ready when the database check fails", async () => {
    const db = { execute: async () => Promise.reject(new Error("down")) }
    const app = new Elysia().use(createReadyRoutes(db as never))

    const response = await app.handle(new Request("http://idp.test/ready"))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ status: "not_ready", service: "idp" })
  })

  it("returns conflict when an invitation already has a pending match", async () => {
    const auth = { api: { getSession: async () => ({ user: { id: "admin-1" } }) } }
    const { calls, db } = createInvitationRouteDatabase([
      [{ id: "admin-1", status: "active", role: "admin" }],
      [
        {
          id: "invitation-1",
          email: "invite@example.com",
          role: "member",
          status: "pending",
          expiresAt: new Date("2030-06-20T00:00:00Z"),
        },
      ],
    ])
    const app = new Elysia().use(createInvitationRoutes(auth as never, db as never))

    const response = await app.handle(
      new Request("http://idp.test/invitations", {
        method: "POST",
        body: JSON.stringify({
          email: "invite@example.com",
          role: "admin",
          expiresAt: "2030-06-21T00:00:00.000Z",
        }),
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "pending_invitation_exists",
        message: "A pending invitation already exists for this email.",
      },
    })
    expect(calls.insertedValues).toHaveLength(0)
    expect(calls.executeCount).toBe(1)
    expect(calls.transactionCount).toBe(1)
  })

  it("creates invitations with server-managed expiration and email delivery", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-11T12:00:00Z"))
    const auth = { api: { getSession: async () => ({ user: { id: "admin-1" } }) } }
    const { calls, db } = createInvitationRouteDatabase([
      [{ id: "admin-1", status: "active", role: "admin" }],
      [],
    ])
    const deliveredEmails: unknown[] = []
    const app = new Elysia().use(
      createInvitationRoutes(auth as never, db as never, {
        sendInvitation: async (input) => {
          deliveredEmails.push(input)
          return "sent"
        },
      }),
    )

    const response = await app.handle(
      new Request("http://idp.test/invitations", {
        method: "POST",
        body: JSON.stringify({
          email: "invite@example.com",
          role: "admin",
        }),
      }),
    )

    expect(response.status).toBe(201)
    expect(calls.insertedValues).toHaveLength(1)
    expect(calls.insertedValues[0]).toMatchObject({
      email: "invite@example.com",
      role: "admin",
      invitedByUserId: "admin-1",
    })
    expect((calls.insertedValues[0] as { expiresAt: Date }).expiresAt.toISOString()).toBe(
      "2026-07-12T12:00:00.000Z",
    )
    expect(deliveredEmails).toEqual([
      expect.objectContaining({
        email: "invite@example.com",
        expiresAt: new Date("2026-07-12T12:00:00.000Z"),
        role: "admin",
        token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      }),
    ])
    await expect(response.json()).resolves.toMatchObject({
      emailDelivery: "sent",
      invitation: {
        email: "invite@example.com",
        role: "admin",
        status: "pending",
        invitedByUserId: "admin-1",
        expiresAt: "2026-07-12T12:00:00.000Z",
      },
    })
    expect(calls.executeCount).toBe(1)
    expect(calls.transactionCount).toBe(1)
  })

  it("sends a generic invitation when display context resolution fails", async () => {
    const auth = { api: { getSession: async () => ({ user: { id: "admin-1" } }) } }
    const { db } = createInvitationRouteDatabase([
      [{ id: "admin-1", status: "active", role: "admin" }],
      [],
    ])
    const sendInvitation = vi.fn(async () => "sent" as const)
    const app = new Elysia().use(
      createInvitationRoutes(
        auth as never,
        db as never,
        { sendInvitation },
        undefined,
        undefined,
        undefined,
        vi.fn(async () => Promise.reject(new Error("context unavailable"))),
      ),
    )
    const response = await app.handle(
      new Request("http://idp.test/invitations", {
        body: JSON.stringify({ email: "invite@example.com", role: "member" }),
        method: "POST",
      }),
    )
    expect(response.status).toBe(201)
    expect(sendInvitation).toHaveBeenCalledWith(expect.objectContaining({ displayContext: null }))
  })

  it("resolves only minimal invitation state with privacy headers and a bounded rate limit", async () => {
    const secret = createInvitationSecret()
    const resolutionRow = {
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      role: "member",
      status: "pending",
      tokenIssuedAt: new Date("2026-07-01T00:00:00Z"),
    }
    const { db } = createInvitationRouteDatabase(Array.from({ length: 10 }, () => [resolutionRow]))
    const app = new Elysia().use(createInvitationRoutes({} as never, db as never))

    const request = () =>
      app.handle(
        new Request("http://idp.test/invitations/resolve", {
          body: JSON.stringify({ token: secret.token }),
          method: "POST",
        }),
      )
    const first = await request()
    const payload = await first.json()

    expect(first.headers.get("cache-control")).toBe("no-store")
    expect(first.headers.get("referrer-policy")).toBe("no-referrer")
    expect(payload).toEqual({
      expiresAt: "2099-01-01T00:00:00.000Z",
      hasAccount: true,
      role: "member",
      state: "valid",
    })
    expect(JSON.stringify(payload)).not.toContain(secret.token)
    for (let index = 1; index < 10; index += 1) expect((await request()).status).toBe(200)
    await expect(request()).resolves.toMatchObject({ status: 429 })
  })

  it("adds business context only after a valid invitation proof resolves", async () => {
    const secret = createInvitationSecret()
    const resolutionRow = {
      id: "invitation-1",
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      role: "member",
      status: "pending",
      tokenIssuedAt: new Date("2026-07-01T00:00:00Z"),
    }
    const { db } = createInvitationRouteDatabase([[resolutionRow], []])
    const contextProvider = vi.fn(async () => ({
      logoAvailable: true,
      logoDataUrl: "data:image/png;base64,cHJpdmF0ZQ==",
      organizationName: "Barbearia Aurora",
      professionalRole: "Barbeiro sênior",
      unitNames: ["Boa Viagem"],
    }))
    const app = new Elysia().use(
      createInvitationRoutes({} as never, db as never, undefined, undefined, contextProvider),
    )

    const response = await app.handle(
      new Request("http://idp.test/invitations/resolve", {
        body: JSON.stringify({ token: secret.token }),
        method: "POST",
      }),
    )

    const payload = await response.json()
    expect(payload).toMatchObject({
      context: {
        organizationName: "Barbearia Aurora",
        professionalRole: "Barbeiro sênior",
        unitNames: ["Boa Viagem"],
      },
      state: "valid",
    })
    expect(JSON.stringify(payload)).not.toContain("cHJpdmF0ZQ")
    expect(contextProvider).toHaveBeenCalledWith("invitation-1")
  })

  it.each([
    "accepted",
    "expired",
    "revoked",
    "superseded",
  ] as const)("does not resolve business context for a %s invitation", async (invitationStatus) => {
    const secret = createInvitationSecret()
    const { db } = createInvitationRouteDatabase([
      [
        {
          id: "invitation-1",
          expiresAt: new Date("2099-01-01T00:00:00Z"),
          role: "member",
          status: invitationStatus,
          tokenIssuedAt: new Date("2026-07-01T00:00:00Z"),
        },
      ],
    ])
    const contextProvider = vi.fn()
    const app = new Elysia().use(
      createInvitationRoutes({} as never, db as never, undefined, undefined, contextProvider),
    )

    const response = await app.handle(
      new Request("http://idp.test/invitations/resolve", {
        body: JSON.stringify({ token: secret.token }),
        method: "POST",
      }),
    )

    await expect(response.json()).resolves.toEqual({ state: invitationStatus })
    expect(contextProvider).not.toHaveBeenCalled()
  })

  it("does not resolve business context for malformed invitation proof", async () => {
    const { db } = createInvitationRouteDatabase([])
    const contextProvider = vi.fn()
    const app = new Elysia().use(
      createInvitationRoutes({} as never, db as never, undefined, undefined, contextProvider),
    )
    const response = await app.handle(
      new Request("http://idp.test/invitations/resolve", {
        body: JSON.stringify({ token: "malformed" }),
        method: "POST",
      }),
    )
    await expect(response.json()).resolves.toEqual({ state: "invalid" })
    expect(contextProvider).not.toHaveBeenCalled()
  })

  it("serves invitation logos only after valid proof without exposing storage identity", async () => {
    const secret = createInvitationSecret()
    const resolutionRow = {
      id: "invitation-1",
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      role: "member",
      status: "pending",
      tokenIssuedAt: new Date("2026-07-01T00:00:00Z"),
    }
    const { db } = createInvitationRouteDatabase([[resolutionRow]])
    const logoProvider = vi.fn(async () => ({
      body: new Uint8Array([137, 80, 78, 71]),
      contentType: "image/png",
    }))
    const app = new Elysia().use(
      createInvitationRoutes(
        {} as never,
        db as never,
        undefined,
        undefined,
        undefined,
        logoProvider,
      ),
    )
    const response = await app.handle(
      new Request("http://idp.test/invitations/logo", {
        body: JSON.stringify({ token: secret.token }),
        method: "POST",
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("content-type")).toBe("image/png")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]))
    expect(logoProvider).toHaveBeenCalledWith("invitation-1")
  })

  it("rate limits invitation logo proof attempts before repeated storage reads", async () => {
    const secret = createInvitationSecret()
    const resolutionRow = {
      id: "invitation-1",
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      role: "member",
      status: "pending",
      tokenIssuedAt: new Date("2026-07-01T00:00:00Z"),
    }
    const { db } = createInvitationRouteDatabase(Array.from({ length: 10 }, () => [resolutionRow]))
    const logoProvider = vi.fn(async () => ({
      body: new Uint8Array([1]),
      contentType: "image/png",
    }))
    const app = new Elysia().use(
      createInvitationRoutes(
        {} as never,
        db as never,
        undefined,
        undefined,
        undefined,
        logoProvider,
      ),
    )
    const request = () =>
      app.handle(
        new Request("http://idp.test/invitations/logo", {
          body: JSON.stringify({ token: secret.token }),
          method: "POST",
        }),
      )
    for (let index = 0; index < 10; index += 1) expect((await request()).status).toBe(200)
    expect((await request()).status).toBe(429)
    expect(logoProvider).toHaveBeenCalledTimes(10)
  })

  it.each([
    "accepted",
    "expired",
    "revoked",
    "superseded",
    "malformed",
  ] as const)("does not read an invitation logo for %s proof", async (state) => {
    const secret = createInvitationSecret()
    const { db } = createInvitationRouteDatabase(
      state === "malformed"
        ? []
        : [
            [
              {
                id: "invitation-1",
                expiresAt: new Date("2099-01-01T00:00:00Z"),
                role: "member",
                status: state,
                tokenIssuedAt: new Date("2026-07-01T00:00:00Z"),
              },
            ],
          ],
    )
    const logoProvider = vi.fn()
    const app = new Elysia().use(
      createInvitationRoutes(
        {} as never,
        db as never,
        undefined,
        undefined,
        undefined,
        logoProvider,
      ),
    )
    const response = await app.handle(
      new Request("http://idp.test/invitations/logo", {
        body: JSON.stringify({ token: state === "malformed" ? "malformed" : secret.token }),
        method: "POST",
      }),
    )
    expect(response.status).toBe(404)
    expect(logoProvider).not.toHaveBeenCalled()
  })

  it("globally bounds resolve attempts that rotate through distinct well-formed proofs", async () => {
    const resolutionRow = {
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      role: "member",
      status: "pending",
      tokenIssuedAt: new Date("2026-07-01T00:00:00Z"),
    }
    const { db } = createInvitationRouteDatabase(Array.from({ length: 20 }, () => [resolutionRow]))
    const app = new Elysia().use(createInvitationRoutes({} as never, db as never))

    const request = () =>
      app.handle(
        new Request("http://idp.test/invitations/resolve", {
          body: JSON.stringify({ token: createInvitationSecret().token }),
          method: "POST",
        }),
      )

    for (let index = 0; index < 20; index += 1) {
      expect((await request()).status).toBe(200)
    }
    await expect(request()).resolves.toMatchObject({ status: 429 })
  })

  it("lists users with admin access", async () => {
    const auth = { api: { getSession: async () => ({ user: { id: "admin-1" } }) } }
    const createdAt = new Date("2026-07-10T10:00:00Z")
    const updatedAt = new Date("2026-07-10T11:00:00Z")
    const { db } = createAdminRouteDatabase({
      selectRows: [
        [{ id: "admin-1", status: "active", role: "admin" }],
        [{ value: 1 }],
        [
          {
            id: "user-1",
            name: "Maria Souza",
            email: "maria@example.com",
            image: null,
            role: "member",
            status: "active",
            createdAt,
            updatedAt,
          },
        ],
      ],
    })
    const app = new Elysia().use(createUserRoutes(auth as never, db as never))

    const response = await app.handle(new Request("http://idp.test/users?page=1&pageSize=20"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      page: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      users: [
        {
          id: "user-1",
          name: "Maria Souza",
          email: "maria@example.com",
          image: null,
          role: "member",
          status: "active",
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      ],
    })
  })

  it("blocks admins from removing their own access", async () => {
    const auth = { api: { getSession: async () => ({ user: { id: "admin-1" } }) } }
    const { calls, db } = createAdminRouteDatabase({
      selectRows: [[{ id: "admin-1", status: "active", role: "admin" }]],
    })
    const app = new Elysia().use(createUserRoutes(auth as never, db as never))

    const response = await app.handle(
      new Request("http://idp.test/users/admin-1", {
        method: "PATCH",
        body: JSON.stringify({ role: "member" }),
      }),
    )

    expect(response.status).toBe(400)
    expect(calls.updatedValues).toHaveLength(0)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "self_admin_change_not_allowed",
        message: "Admins cannot remove their own access.",
      },
    })
  })

  it("disables a user and revokes only that user's persisted sessions transactionally", async () => {
    const auth = { api: { getSession: async () => ({ user: { id: "admin-1" } }) } }
    const createdAt = new Date("2026-07-10T10:00:00Z")
    const updatedAt = new Date("2026-07-10T11:00:00Z")
    const { calls, db } = createUserMutationDatabase({
      sessionUserIds: ["user-1", "admin-1", "user-1", "user-2"],
      updatedUser: {
        id: "user-1",
        name: "Maria Souza",
        email: "maria@example.com",
        image: null,
        role: "member",
        status: "disabled",
        createdAt,
        updatedAt,
      },
    })
    const app = new Elysia().use(createUserRoutes(auth as never, db as never))

    const response = await app.handle(
      new Request("http://idp.test/users/user-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "disabled" }),
      }),
    )

    expect(response.status).toBe(200)
    expect(calls.transactionCount).toBe(1)
    expect(calls.updatedValues).toHaveLength(1)
    expect(calls.deletedSessionUserIds).toEqual(["user-1"])
    expect(calls.remainingSessionUserIds).toEqual(["admin-1", "user-2"])
    await expect(response.json()).resolves.toMatchObject({
      user: { id: "user-1", status: "disabled" },
    })
  })

  it("revokes pending invitations", async () => {
    const auth = { api: { getSession: async () => ({ user: { id: "admin-1" } }) } }
    const createdAt = new Date("2026-07-10T10:00:00Z")
    const updatedAt = new Date("2026-07-10T11:00:00Z")
    const expiresAt = new Date("2026-07-20T10:00:00Z")
    const { calls, db } = createAdminRouteDatabase({
      selectRows: [[{ id: "admin-1", status: "active", role: "admin" }]],
      updateRows: [
        [
          {
            id: "invitation-1",
            email: "invite@example.com",
            role: "member",
            status: "revoked",
            invitedByUserId: "admin-1",
            acceptedAt: null,
            acceptedByUserId: null,
            expiresAt,
            createdAt,
            updatedAt,
          },
        ],
      ],
    })
    const app = new Elysia().use(createInvitationRoutes(auth as never, db as never))

    const response = await app.handle(
      new Request("http://idp.test/invitations/invitation-1/revoke", { method: "POST" }),
    )

    expect(response.status).toBe(200)
    expect(calls.updatedValues).toHaveLength(1)
    await expect(response.json()).resolves.toEqual({
      invitation: {
        id: "invitation-1",
        email: "invite@example.com",
        role: "member",
        status: "revoked",
        invitedByUserId: "admin-1",
        acceptedAt: null,
        acceptedByUserId: null,
        expiresAt: expiresAt.toISOString(),
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    })
  })
})
