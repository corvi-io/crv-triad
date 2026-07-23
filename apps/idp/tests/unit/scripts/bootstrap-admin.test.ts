import type { SQL } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"
import { describe, expect, it, vi } from "vitest"

import { invitation, user } from "../../../src/database/schema.js"
import { bootstrapAdmin, parseBootstrapAdminArgs } from "../../../src/scripts/bootstrap-admin.js"

function createFakeDb({
  existingInvitations = [],
  existingUsers = [],
}: {
  existingInvitations?: Array<Record<string, unknown>>
  existingUsers?: Array<Record<string, unknown>>
} = {}) {
  const inserted: unknown[] = []
  const updated: unknown[] = []
  const whereConditions: SQL[] = []
  let executeCount = 0
  let transactionCount = 0
  let transactionTail = Promise.resolve()

  const transactionDb = {
    execute: async () => {
      executeCount += 1
      return []
    },
    select: () => {
      let selectedTable: unknown
      const query = {
        from: (table: unknown) => {
          selectedTable = table
          return query
        },
        where: (condition: SQL) => {
          whereConditions.push(condition)
          return query
        },
        orderBy: () => query,
        limit: async () => {
          if (selectedTable === user) return existingUsers
          if (selectedTable !== invitation) return []

          const now = new Date()
          return existingInvitations.filter(
            (row) =>
              row.role === "admin" &&
              row.status === "pending" &&
              row.tokenDigest &&
              row.expiresAt instanceof Date &&
              row.expiresAt > now,
          )
        },
      }
      return query
    },
    insert: () => ({
      values: (value: unknown) => ({
        returning: async () => {
          inserted.push(value)
          const row = { createdAt: new Date(), updatedAt: new Date(), ...(value as object) }
          existingInvitations.push(row)
          return [row]
        },
      }),
    }),
    update: () => ({
      set: (value: unknown) => {
        updated.push(value)
        return {
          where: async () => {
            const row = existingInvitations.findLast((candidate) => candidate.status === "pending")
            if (row) Object.assign(row, value)
          },
        }
      },
    }),
  }

  const db = {
    ...transactionDb,
    transaction: async <T>(callback: (transaction: typeof transactionDb) => Promise<T>) => {
      transactionCount += 1
      const predecessor = transactionTail
      let release: () => void = () => undefined
      transactionTail = new Promise<void>((resolve) => {
        release = resolve
      })
      await predecessor
      try {
        return await callback(transactionDb)
      } finally {
        release()
      }
    },
  }

  return {
    db,
    existingInvitations,
    get executeCount() {
      return executeCount
    },
    inserted,
    get transactionCount() {
      return transactionCount
    },
    updated,
    whereConditions,
  }
}

describe("bootstrap admin", () => {
  it("parses required command flags", () => {
    expect(
      parseBootstrapAdminArgs(["--email", "Admin@Example.com", "--name", "Admin Name"]),
    ).toEqual({
      email: "Admin@Example.com",
      name: "Admin Name",
      expiresInDays: 7,
    })
  })

  it("creates a pending admin invitation when the email does not exist", async () => {
    const fake = createFakeDb()

    const result = await bootstrapAdmin(fake.db as never, {
      email: "Admin@Example.com",
      name: "Admin Name",
      expiresInDays: 7,
    })

    expect(result.created).toBe(true)
    expect(fake.inserted[0]).toMatchObject({
      email: "admin@example.com",
      role: "admin",
      status: "pending",
      invitedByUserId: null,
      tokenDigest: expect.any(String),
      tokenIssuedAt: expect.any(Date),
    })
    expect(fake.inserted[0]).not.toHaveProperty("token")
  })

  it("is idempotent for an existing active admin", async () => {
    const fake = createFakeDb({
      existingUsers: [{ id: "user-1", role: "admin", status: "active" }],
    })

    await expect(
      bootstrapAdmin(fake.db as never, {
        email: "admin@example.com",
        name: "Admin Name",
        expiresInDays: 7,
      }),
    ).resolves.toEqual({ created: false, userId: "user-1" })
  })

  it("is idempotent for an existing pending admin invitation", async () => {
    const fake = createFakeDb({
      existingInvitations: [
        {
          expiresAt: new Date("2099-01-01T00:00:00Z"),
          id: "invitation-1",
          role: "admin",
          status: "pending",
          tokenDigest: "synthetic-digest",
        },
      ],
    })

    await expect(
      bootstrapAdmin(fake.db as never, {
        email: "admin@example.com",
        name: "Admin Name",
        expiresInDays: 7,
      }),
    ).resolves.toEqual({ created: false, invitationId: "invitation-1" })
  })

  it("ignores invitation history and queries only valid pending admin proof", async () => {
    const fake = createFakeDb({
      existingInvitations: [
        {
          expiresAt: new Date("2099-01-01T00:00:00Z"),
          id: "revoked-admin",
          role: "admin",
          status: "revoked",
          tokenDigest: "synthetic-revoked-digest",
        },
        {
          expiresAt: new Date("2020-01-01T00:00:00Z"),
          id: "expired-admin",
          role: "admin",
          status: "pending",
          tokenDigest: "synthetic-expired-digest",
        },
        {
          expiresAt: new Date("2099-01-01T00:00:00Z"),
          id: "pending-member",
          role: "member",
          status: "pending",
          tokenDigest: "synthetic-member-digest",
        },
      ],
    })

    await expect(
      bootstrapAdmin(fake.db as never, {
        email: "admin@example.com",
        name: "Admin Name",
        expiresInDays: 7,
      }),
    ).resolves.toMatchObject({ created: true })

    const condition = fake.whereConditions.at(-1)
    expect(condition).toBeDefined()
    const query = new PgDialect().sqlToQuery(condition as SQL)
    expect(query.params).toEqual(
      expect.arrayContaining(["admin@example.com", "admin", "pending", expect.any(String)]),
    )
    expect(query.sql).toContain('"token_digest" is not null')
  })

  it("serializes concurrent bootstrap attempts into one pending invitation", async () => {
    const fake = createFakeDb()
    const input = {
      email: "admin@example.com",
      name: "Admin Name",
      expiresInDays: 7,
    }

    const results = await Promise.all([
      bootstrapAdmin(fake.db as never, input),
      bootstrapAdmin(fake.db as never, input),
    ])

    expect(results.map((result) => result.created).sort()).toEqual([false, true])
    expect(fake.inserted).toHaveLength(1)
    expect(fake.executeCount).toBe(2)
    expect(fake.transactionCount).toBe(2)
  })

  it("commits revocation before a later run reissues an undelivered invitation", async () => {
    const fake = createFakeDb()
    const sendInvitation = vi.fn().mockResolvedValueOnce("failed").mockResolvedValueOnce("sent")
    const input = {
      email: "admin@example.com",
      name: "Admin Name",
      expiresInDays: 7,
    }

    await expect(bootstrapAdmin(fake.db as never, input, { sendInvitation })).rejects.toThrow(
      "Transactional authentication email delivery failed.",
    )
    expect(fake.updated).toContainEqual(expect.objectContaining({ status: "revoked" }))

    await expect(
      bootstrapAdmin(fake.db as never, input, { sendInvitation }),
    ).resolves.toMatchObject({ created: true })
    expect(fake.inserted).toHaveLength(2)
    expect(fake.existingInvitations.map((row) => row.status)).toEqual(["revoked", "pending"])
  })
})
