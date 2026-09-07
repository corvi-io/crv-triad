import { describe, expect, it } from "vitest"

import { parseConfigureAccessArgs } from "../../../src/modules/access/scripts/configure-tenant-access.js"
import { parseRecoverOwnerArgs } from "../../../src/modules/access/scripts/recover-tenant-owner.js"
import { digestSupportCredential } from "../../../src/modules/backstage/domain/support-credential.js"

describe("access operations", () => {
  it("parses bounded manual subscription inputs", () => {
    expect(
      parseConfigureAccessArgs([
        "--organization-id",
        "tenant-a",
        "--actor-user-id",
        "operator-a",
        "--active-client-limit",
        "250",
      ]),
    ).toEqual({
      activeClientLimit: 250,
      actorUserId: "operator-a",
      organizationId: "tenant-a",
      planKey: "test-tier",
      state: "active",
    })
  })

  it("requires all exceptional owner recovery identifiers", () => {
    expect(() => parseRecoverOwnerArgs(["--organization-id", "tenant-a"])).toThrow()
  })

  it("stores deterministic credential digests without retaining plaintext", () => {
    const digest = digestSupportCredential("one-time-credential")
    expect(digest).toBe(digestSupportCredential("one-time-credential"))
    expect(digest).not.toContain("one-time-credential")
  })
})
