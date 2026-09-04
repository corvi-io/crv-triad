import { describe, expect, it, vi } from "vitest"

import {
  resolveTenantContext,
  type TenantMembershipReader,
} from "../../../src/modules/tenancy/application/resolve-tenant-context.js"

function createReader(result: Awaited<ReturnType<TenantMembershipReader["findActiveMembership"]>>) {
  return { findActiveMembership: vi.fn(async () => result) }
}

describe("resolveTenantContext", () => {
  it("rejects a request without a session before persistence access", async () => {
    const reader = createReader(null)

    await expect(resolveTenantContext(null, reader)).resolves.toEqual({
      allowed: false,
      reason: "unauthenticated",
    })
    expect(reader.findActiveMembership).not.toHaveBeenCalled()
  })

  it("requires a server-session active organization", async () => {
    const reader = createReader(null)

    await expect(
      resolveTenantContext({ session: {}, user: { id: "user-a" } }, reader),
    ).resolves.toEqual({ allowed: false, reason: "context_required" })
    expect(reader.findActiveMembership).not.toHaveBeenCalled()
  })

  it("fails closed when active membership or organization is unavailable", async () => {
    const reader = createReader(null)

    await expect(
      resolveTenantContext(
        { session: { activeOrganizationId: "tenant-a" }, user: { id: "user-a" } },
        reader,
      ),
    ).resolves.toEqual({ allowed: false, reason: "tenant_forbidden" })
    expect(reader.findActiveMembership).toHaveBeenCalledWith({
      organizationId: "tenant-a",
      userId: "user-a",
    })
  })

  it.each([
    "owner",
    "admin",
    "member",
  ] as const)("returns the revalidated %s tenant context", async (role) => {
    const reader = createReader({
      membershipId: "membership-a",
      organizationId: "tenant-a",
      organizationName: "Barbearia A",
      role,
    })

    await expect(
      resolveTenantContext(
        { session: { activeOrganizationId: "tenant-a" }, user: { id: "user-a" } },
        reader,
      ),
    ).resolves.toEqual({
      allowed: true,
      context: {
        actorUserId: "user-a",
        membershipId: "membership-a",
        organizationId: "tenant-a",
        organizationName: "Barbearia A",
        role,
      },
    })
  })
})
