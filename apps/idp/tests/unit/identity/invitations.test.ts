import { describe, expect, it } from "vitest"

import {
  createInvitation,
  findPendingInvitationByEmail,
  PendingInvitationAlreadyExistsError,
} from "../../../src/identity/invitations.js"

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

    expect(created).toMatchObject({ email: "invite@example.com", status: "pending" })
    expect(calls.executeCount).toBe(1)
    expect(calls.insertedValues).toHaveLength(1)
    expect(calls.transactionCount).toBe(1)
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
})
