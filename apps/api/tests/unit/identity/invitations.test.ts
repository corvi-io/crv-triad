import { describe, expect, it } from "vitest"

import {
  createInvitation,
  createInvitationSecret,
  digestInvitationToken,
  findPendingInvitationByEmail,
  PendingInvitationAlreadyExistsError,
  resendInvitation,
  resolveInvitationToken,
} from "../../../src/modules/idp/identity/invitations.js"

const now = new Date("2026-06-19T00:00:00Z")

function createFakeDatabase(rows: unknown[] = []) {
  const calls = {
    executeCount: 0,
    insertedValues: [] as unknown[],
    orderByCount: 0,
    transactionCount: 0,
  }

  const selectQuery = {
    from: () => selectQuery,
    where: () => selectQuery,
    orderBy: () => {
      calls.orderByCount += 1
      return selectQuery
    },
    limit: async () => rows,
  }

  const insertQuery = {
    values: (value: unknown) => {
      calls.insertedValues.push(value)
      return {
        returning: async () => [
          {
            ...(value as object),
            createdAt: now,
            updatedAt: now,
          },
        ],
      }
    },
  }

  const transactionDb = {
    execute: async () => {
      calls.executeCount += 1
      return []
    },
    select: () => selectQuery,
    insert: () => insertQuery,
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

describe("invitations", () => {
  it("uses a deterministic lookup for pending invitations", async () => {
    const { calls, db } = createFakeDatabase([{ id: "invitation-1" }])

    await findPendingInvitationByEmail(db as never, "Invite@Example.com", now)

    expect(calls.orderByCount).toBe(1)
  })

  it("creates normalized invitations when no pending invitation exists", async () => {
    const { calls, db } = createFakeDatabase()

    const created = await createInvitation(
      db as never,
      {
        email: " Invite@Example.com ",
        role: "member",
        invitedByUserId: "admin-1",
        expiresAt: new Date("2026-06-20T00:00:00Z"),
      },
      now,
    )

    expect(created.invitation).toMatchObject({ email: "invite@example.com", status: "pending" })
    expect(created.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(calls.executeCount).toBe(1)
    expect(calls.insertedValues).toHaveLength(1)
    expect(calls.insertedValues[0]).not.toHaveProperty("token")
    expect(calls.insertedValues[0]).toMatchObject({
      tokenDigest: digestInvitationToken(created.token),
    })
    expect(calls.transactionCount).toBe(1)
  })

  it("generates independent 256-bit URL-safe secrets and deterministic digests", () => {
    const first = createInvitationSecret()
    const second = createInvitationSecret()

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(second.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first.token).not.toBe(second.token)
    expect(first.digest).toBe(digestInvitationToken(first.token))
    expect(digestInvitationToken("malformed")).toBeNull()
  })

  it.each([
    ["accepted", "accepted"],
    ["revoked", "revoked"],
    ["superseded", "superseded"],
  ] as const)("resolves a persisted %s lifecycle state", async (status, expected) => {
    const secret = createInvitationSecret()
    const { db } = createFakeDatabase([
      {
        id: "invitation-1",
        status,
        tokenIssuedAt: now,
        expiresAt: new Date("2099-01-01T00:00:00Z"),
      },
    ])

    await expect(resolveInvitationToken(db as never, secret.token, now)).resolves.toEqual({
      state: expected,
    })
  })

  it("rejects expired, malformed, and legacy tokenless invitations", async () => {
    const secret = createInvitationSecret()
    const expired = createFakeDatabase([
      {
        id: "invitation-1",
        status: "pending",
        tokenIssuedAt: now,
        expiresAt: new Date("2025-01-01T00:00:00Z"),
      },
    ])
    const legacy = createFakeDatabase([
      {
        id: "invitation-2",
        status: "pending",
        tokenIssuedAt: null,
        expiresAt: new Date("2099-01-01T00:00:00Z"),
      },
    ])

    await expect(resolveInvitationToken(expired.db as never, secret.token, now)).resolves.toEqual({
      state: "expired",
    })
    await expect(resolveInvitationToken(legacy.db as never, secret.token, now)).resolves.toEqual({
      state: "invalid",
    })
    await expect(resolveInvitationToken(legacy.db as never, "malformed", now)).resolves.toEqual({
      state: "invalid",
    })
  })

  it("rejects duplicate pending invitations for the same email", async () => {
    const { calls, db } = createFakeDatabase([
      {
        id: "invitation-1",
        email: "invite@example.com",
        role: "admin",
        status: "pending",
        expiresAt: new Date("2026-06-20T00:00:00Z"),
      },
    ])

    await expect(
      createInvitation(
        db as never,
        {
          email: "Invite@Example.com",
          role: "member",
          invitedByUserId: "admin-1",
          expiresAt: new Date("2026-06-21T00:00:00Z"),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(PendingInvitationAlreadyExistsError)
    expect(calls.executeCount).toBe(1)
    expect(calls.insertedValues).toHaveLength(0)
    expect(calls.transactionCount).toBe(1)
  })

  it("supersedes the previous invitation before issuing a replacement secret", async () => {
    const previous = createInvitationSecret()
    const updatedValues: unknown[] = []
    const insertedValues: Array<Record<string, unknown>> = []
    const current = {
      email: "invite@example.com",
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      id: "invitation-1",
      invitedByUserId: "admin-1",
      role: "member",
      status: "pending",
      tokenDigest: previous.digest,
    }
    const transaction = {
      execute: async () => [],
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          insertedValues.push(values)
          return { returning: async () => [{ ...values }] }
        },
      }),
      select: () => {
        const query = {
          from: () => query,
          limit: async () => [current],
          where: () => query,
        }
        return query
      },
      update: () => ({
        set: (values: unknown) => {
          updatedValues.push(values)
          return {
            where: () => ({ returning: async () => [{ ...current, status: "superseded" }] }),
          }
        },
      }),
    }
    const db = {
      transaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    }

    const replacement = await resendInvitation(
      db as never,
      current.id,
      new Date("2099-01-02T00:00:00Z"),
      now,
    )

    expect(updatedValues).toContainEqual(expect.objectContaining({ status: "superseded" }))
    expect(insertedValues).toHaveLength(1)
    expect(insertedValues[0]).not.toHaveProperty("token")
    expect(replacement?.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(replacement?.token).not.toBe(previous.token)
    expect(insertedValues[0]?.tokenDigest).toBe(digestInvitationToken(replacement?.token ?? ""))
  })
})
