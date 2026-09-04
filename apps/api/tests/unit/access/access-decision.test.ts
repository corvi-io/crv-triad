import { describe, expect, it } from "vitest"

import {
  type AccessDecisionInput,
  capabilitiesForRole,
  decideAccess,
} from "../../../src/modules/access/domain/access-decision.js"

const allowedInput: AccessDecisionInput = {
  authenticated: true,
  capability: "clients.manage",
  contextSelected: true,
  entitlementEnabled: true,
  role: "member",
  subscriptionState: "active",
  tenantActive: true,
}

describe("access decision", () => {
  it.each([
    [{ authenticated: false }, "unauthenticated"],
    [{ contextSelected: false }, "context_required"],
    [{ tenantActive: false }, "tenant_forbidden"],
    [{ role: undefined }, "tenant_forbidden"],
    [{ capability: "members.manage", role: "member" }, "capability_forbidden"],
    [{ subscriptionState: undefined }, "subscription_required"],
    [{ subscriptionState: "expired" }, "subscription_inactive"],
    [{ subscriptionState: "suspended" }, "subscription_inactive"],
    [{ entitlementEnabled: false }, "module_not_included"],
  ] as const)("returns %s as %s in deterministic order", (changes, reason) => {
    expect(decideAccess({ ...allowedInput, ...changes })).toEqual({ allowed: false, reason })
  })

  it("returns only safe quota metadata at the limit", () => {
    expect(decideAccess({ ...allowedInput, quota: { limit: 5, usage: 5 } })).toEqual({
      allowed: false,
      quota: { limit: 5, usage: 5 },
      reason: "quota_reached",
    })
  })

  it("allows work below the limit", () => {
    expect(decideAccess({ ...allowedInput, quota: { limit: 5, usage: 4 } })).toEqual({
      allowed: true,
    })
  })

  it("keeps ownership and review capabilities out of the member role", () => {
    expect(capabilitiesForRole("member")).toEqual(["clients.read", "clients.manage"])
    expect(capabilitiesForRole("admin")).not.toContain("ownership.transfer")
    expect(capabilitiesForRole("owner")).toContain("ownership.transfer")
  })
})
