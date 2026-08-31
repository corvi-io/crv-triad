import { getTableConfig } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"

import { account } from "../../../src/modules/idp/database/schema.js"

describe("Better Auth persistence integrity", () => {
  it("uniquely identifies provider accounts under repeated or concurrent callbacks", () => {
    const providerAccountIndex = getTableConfig(account).indexes.find(
      (candidate) => candidate.config.name === "idp_accounts_provider_account_unique",
    )

    expect(providerAccountIndex?.config.unique).toBe(true)
    expect(
      providerAccountIndex?.config.columns.map((column) =>
        "name" in column ? column.name : undefined,
      ),
    ).toEqual(["provider_id", "account_id"])
  })
})
