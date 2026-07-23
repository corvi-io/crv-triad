import { describe, expect, it } from "vitest"

import { bootstrapAdmin, parseBootstrapAdminArgs } from "../../../src/scripts/bootstrap-admin.js"

function createFakeDb(existingUser: unknown = null, existingInvitation: unknown = null) {
  const inserted: unknown[] = []
  const updated: unknown[] = []
  const selectRows = [
    existingUser ? [existingUser] : [],
    existingInvitation ? [existingInvitation] : [],
  ]

  return {
    inserted,
    updated,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => selectRows.shift() ?? [],
          }),
        }),
      }),
      insert: () => ({
        values: (value: unknown) => ({
          returning: async () => {
            inserted.push(value)
            return [value]
          },
        }),
      }),
      update: () => ({
        set: (value: unknown) => {
          updated.push(value)
          return { where: async () => undefined }
        },
      }),
    },
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
    const fake = createFakeDb({ id: "user-1", role: "admin", status: "active" })

    await expect(
      bootstrapAdmin(fake.db as never, {
        email: "admin@example.com",
        name: "Admin Name",
        expiresInDays: 7,
      }),
    ).resolves.toEqual({ created: false, userId: "user-1" })
  })

  it("is idempotent for an existing pending admin invitation", async () => {
    const fake = createFakeDb(null, {
      id: "invitation-1",
      role: "admin",
      status: "pending",
      tokenDigest: "synthetic-digest",
    })

    await expect(
      bootstrapAdmin(fake.db as never, {
        email: "admin@example.com",
        name: "Admin Name",
        expiresInDays: 7,
      }),
    ).resolves.toEqual({ created: false, invitationId: "invitation-1" })
  })

  it("revokes an undelivered bootstrap invitation so a later run can reissue it", async () => {
    const fake = createFakeDb()

    await expect(
      bootstrapAdmin(
        fake.db as never,
        {
          email: "admin@example.com",
          name: "Admin Name",
          expiresInDays: 7,
        },
        { sendInvitation: async () => "failed" },
      ),
    ).rejects.toThrow("Transactional authentication email delivery failed.")
    expect(fake.updated).toContainEqual(expect.objectContaining({ status: "revoked" }))
  })
})
