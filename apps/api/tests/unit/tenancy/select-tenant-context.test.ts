import { describe, expect, it, vi } from "vitest"

import { createTenantContextSelector } from "../../../src/modules/tenancy/application/select-tenant-context.js"

function auth(authenticated = true) {
  return {
    api: {
      getSession: vi.fn(async () =>
        authenticated ? { session: { id: "session-a" }, user: { id: "user-a" } } : null,
      ),
    },
  }
}

function database(hasMembership = true) {
  const returning = vi.fn(async () => [{ activeOrganizationId: "tenant-a" }])
  const update = vi.fn(() => ({
    set: () => ({ where: () => ({ returning }) }),
  }))
  const selectQuery = {
    from: () => selectQuery,
    innerJoin: () => selectQuery,
    where: () => selectQuery,
    limit: async () => (hasMembership ? [{ id: "membership-a" }] : []),
  }
  return { db: { select: () => selectQuery, update }, returning, update }
}

describe("tenant context selector", () => {
  it("requires an authenticated session", async () => {
    const { db, update } = database()
    const select = createTenantContextSelector(auth(false) as never, db as never)

    await expect(select(new Headers(), "tenant-a")).resolves.toEqual({
      status: "unauthenticated",
    })
    expect(update).not.toHaveBeenCalled()
  })

  it("rejects an organization outside the active membership boundary", async () => {
    const { db, update } = database(false)
    const select = createTenantContextSelector(auth() as never, db as never)

    await expect(select(new Headers(), "tenant-a")).resolves.toEqual({ status: "forbidden" })
    expect(update).not.toHaveBeenCalled()
  })

  it("persists the selected organization on the authenticated session", async () => {
    const { db, returning, update } = database()
    const select = createTenantContextSelector(auth() as never, db as never)

    await expect(select(new Headers(), "tenant-a")).resolves.toEqual({
      activeOrganizationId: "tenant-a",
      status: "selected",
    })
    expect(update).toHaveBeenCalledOnce()
    expect(returning).toHaveBeenCalledOnce()
  })
})
