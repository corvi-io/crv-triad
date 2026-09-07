import { describe, expect, it, vi } from "vitest"

import {
  bootstrapTenant,
  parseBootstrapTenantArgs,
} from "../../../src/modules/tenancy/scripts/bootstrap-tenant.js"

function createDb(rows: unknown[][], insertedOperator = { id: "operator-a" }) {
  let query = 0
  return {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => rows[query++] ?? [] }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({ returning: async () => [insertedOperator] }),
      }),
    }),
  }
}

const input = { name: "Barbearia Central", slug: "barbearia-central", userId: "user-a" }

describe("tenant bootstrap", () => {
  it("parses explicit identity and barbershop metadata", () => {
    expect(
      parseBootstrapTenantArgs([
        "--user-id",
        "user-a",
        "--name",
        "Barbearia Central",
        "--slug",
        "barbearia-central",
      ]),
    ).toEqual(input)
  })

  it("creates the organization through Better Auth and assigns the operator", async () => {
    const db = createDb([[{ id: "user-a", status: "active" }], [], [{ id: "membership-a" }]])
    const createOrganization = vi.fn(async () => ({ id: "tenant-a" }))

    await expect(bootstrapTenant(db as never, { createOrganization }, input)).resolves.toEqual({
      createdOrganization: true,
      organizationId: "tenant-a",
      ownerMembershipId: "membership-a",
      platformOperatorId: "operator-a",
    })
    expect(createOrganization).toHaveBeenCalledWith({
      body: {
        keepCurrentActiveOrganization: true,
        name: "Barbearia Central",
        slug: "barbearia-central",
        userId: "user-a",
      },
    })
  })

  it("reuses an existing organization and active owner on retry", async () => {
    const db = createDb([
      [{ id: "user-a", status: "active" }],
      [{ id: "tenant-a" }],
      [{ id: "membership-a" }],
    ])
    const createOrganization = vi.fn()

    await expect(
      bootstrapTenant(db as never, { createOrganization }, input),
    ).resolves.toMatchObject({ createdOrganization: false, organizationId: "tenant-a" })
    expect(createOrganization).not.toHaveBeenCalled()
  })

  it("fails without an active existing identity", async () => {
    const db = createDb([[]])
    const createOrganization = vi.fn()

    await expect(bootstrapTenant(db as never, { createOrganization }, input)).rejects.toThrow(
      "An active IDP user is required.",
    )
    expect(createOrganization).not.toHaveBeenCalled()
  })
})
