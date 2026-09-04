import { getTableConfig } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"

import { client, clientNote } from "../../../src/modules/clients/database/schema.js"
import {
  account,
  member,
  organization,
  organizationInvitation,
  session,
} from "../../../src/modules/idp/database/schema.js"

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

  it("maps organization plugin models to distinct idp-prefixed tables", () => {
    expect(getTableConfig(organization).name).toBe("idp_organizations")
    expect(getTableConfig(member).name).toBe("idp_members")
    expect(getTableConfig(organizationInvitation).name).toBe("idp_organization_invitations")
    expect(getTableConfig(session).columns.map((column) => column.name)).toContain(
      "active_organization_id",
    )
  })

  it("enforces one active owner and one membership per tenant and user", () => {
    const indexes = getTableConfig(member).indexes.map((candidate) => candidate.config)

    expect(
      indexes.find((index) => index.name === "idp_members_organization_user_unique")?.unique,
    ).toBe(true)
    const ownerIndex = indexes.find(
      (index) => index.name === "idp_members_one_active_owner_per_organization",
    )
    expect(ownerIndex?.unique).toBe(true)
    expect(ownerIndex?.where?.queryChunks.length).toBeGreaterThan(0)
  })
})

describe("client persistence integrity", () => {
  it("indexes tenant-scoped list and normalized-contact paths", () => {
    const indexNames = getTableConfig(client).indexes.map((candidate) => candidate.config.name)

    expect(indexNames).toEqual(
      expect.arrayContaining([
        "clients_organization_status_name_id_idx",
        "clients_organization_created_at_id_idx",
        "clients_organization_normalized_phone_idx",
        "clients_organization_normalized_email_idx",
        "clients_organization_id_unique",
      ]),
    )
  })

  it("binds notes to a client in the same tenant", () => {
    const foreignKey = getTableConfig(clientNote).foreignKeys.find(
      (candidate) => candidate.getName() === "client_notes_tenant_client_fk",
    )

    expect(foreignKey).toBeDefined()
    expect(foreignKey?.reference().columns.map((column) => column.name)).toEqual([
      "organization_id",
      "client_id",
    ])
    expect(foreignKey?.reference().foreignColumns.map((column) => column.name)).toEqual([
      "organization_id",
      "id",
    ])
  })
})
