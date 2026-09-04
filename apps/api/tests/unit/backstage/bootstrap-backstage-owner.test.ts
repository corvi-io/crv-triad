import { describe, expect, it } from "vitest"

import {
  bootstrapBackstageOwner,
  parseBootstrapBackstageOwnerArgs,
} from "../../../src/modules/backstage/scripts/bootstrap-backstage-owner.js"

function database(identity: unknown, persisted = { id: "operator-a", role: "system_owner" }) {
  return {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => (identity ? [identity] : []) }) }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: async () => [persisted] }),
      }),
    }),
  }
}

describe("Backstage owner bootstrap", () => {
  it("parses an explicit valid email", () => {
    expect(parseBootstrapBackstageOwnerArgs(["--email", "gabriel@corvi.io"])).toEqual({
      email: "gabriel@corvi.io",
    })
  })

  it("creates or promotes the active identity idempotently", async () => {
    await expect(
      bootstrapBackstageOwner(
        database({ id: "user-a", status: "active" }) as never,
        "OWNER@EXAMPLE.COM",
      ),
    ).resolves.toEqual({ id: "operator-a", role: "system_owner" })
  })

  it("rejects missing and disabled identities", async () => {
    await expect(
      bootstrapBackstageOwner(database(null) as never, "owner@example.com"),
    ).rejects.toThrow("active IDP user")
    await expect(
      bootstrapBackstageOwner(
        database({ id: "user-a", status: "disabled" }) as never,
        "owner@example.com",
      ),
    ).rejects.toThrow("active IDP user")
  })
})
