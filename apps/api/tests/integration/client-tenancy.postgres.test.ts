import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { createDrizzleClientRepository } from "../../src/modules/clients/database/client-repository.js"
import { client, clientNote } from "../../src/modules/clients/database/schema.js"
import { organization } from "../../src/modules/idp/database/schema.js"

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is required.")
const parsed = new URL(url)
if (
  !["127.0.0.1", "::1", "localhost"].includes(parsed.hostname) ||
  parsed.port === "5432" ||
  !parsed.pathname.endsWith("_test")
)
  throw new Error("Client integration tests require an isolated loopback database ending in _test.")

const pool = new Pool({ connectionString: url, max: 12 })
const db = drizzle(pool, { schema: { client, clientNote, organization } })
const repository = createDrizzleClientRepository(db as never)
const profile = {
  email: "client@example.invalid",
  name: "Cliente",
  normalizedEmail: "client@example.invalid",
  normalizedPhone: "5581999999999",
  phone: "+55 81 99999-9999",
  preferenceNote: "",
  servicePreferences: [],
  tags: [],
} as const

beforeAll(async () =>
  migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) }),
)
beforeEach(async () => {
  await db.delete(clientNote)
  await db.delete(client)
  await db.delete(organization)
  await db.insert(organization).values([
    { id: "tenant-a", name: "Tenant A", slug: "tenant-a" },
    { id: "tenant-b", name: "Tenant B", slug: "tenant-b" },
  ])
})
afterAll(async () => pool.end())

describe("client tenant persistence", () => {
  it("never returns a known foreign tenant client", async () => {
    const created = await repository.create({ organizationId: "tenant-a", profile })
    if (created === "quota_reached") throw new Error("Unexpected quota result.")
    await expect(
      repository.get({ clientId: created.id, organizationId: "tenant-b" }),
    ).resolves.toBeNull()
    await expect(
      repository.list({
        organizationId: "tenant-b",
        query: {
          contact: "all",
          duplicate: "all",
          page: 1,
          pageSize: 20,
          search: "",
          sortBy: "name",
          sortDirection: "asc",
          status: "active",
          tag: "",
        },
      }),
    ).resolves.toMatchObject({ items: [], totalCount: 0 })
  })

  it("serializes concurrent capacity consumption", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        repository.create({
          activeClientLimit: 2,
          organizationId: "tenant-a",
          profile: {
            ...profile,
            email: `client-${index}@example.invalid`,
            name: `Cliente ${index}`,
            normalizedEmail: `client-${index}@example.invalid`,
          },
        }),
      ),
    )
    expect(results.filter((result) => result !== "quota_reached")).toHaveLength(2)
    expect(results.filter((result) => result === "quota_reached")).toHaveLength(3)
  })
})
