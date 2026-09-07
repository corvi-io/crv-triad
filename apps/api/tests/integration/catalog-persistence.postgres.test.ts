import { fileURLToPath } from "node:url"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { organization } from "../../src/modules/idp/database/schema.js"
import { professional, professionalUnit } from "../../src/modules/professionals/database/schema.js"
import {
  CatalogError,
  createCatalogService,
} from "../../src/modules/services/application/catalog-service.js"
import {
  professionalService,
  service,
  serviceUnit,
} from "../../src/modules/services/database/schema.js"
import { unit } from "../../src/modules/units/database/schema.js"

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is required.")
const parsed = new URL(url)
if (
  !["127.0.0.1", "::1", "localhost"].includes(parsed.hostname) ||
  parsed.port === "5432" ||
  !parsed.pathname.endsWith("_test")
)
  throw new Error(
    "Catalog integration tests require an isolated loopback database ending in _test.",
  )

const pool = new Pool({ connectionString: url, max: 12 })
const db = drizzle(pool, {
  schema: {
    organization,
    professional,
    professionalService,
    professionalUnit,
    service,
    serviceUnit,
    unit,
  },
})
const catalog = createCatalogService(db as never)
const tenantA = "catalog-postgres-tenant-a"
const tenantB = "catalog-postgres-tenant-b"

const unitInput = (code: string, name: string) => ({
  address: "Rua de teste, 100",
  businessHours: { days: ["monday"], end: "18:00", start: "09:00" },
  code,
  name,
})

const serviceInput = (name: string, unitIds: string[] = []) => ({
  category: "Cabelo",
  description: "Serviço usado somente em teste de integração.",
  durationMinutes: 30,
  name,
  priceCents: 5_000,
  professionalIds: [],
  unitIds,
})

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  await db
    .insert(organization)
    .values([
      { id: tenantA, name: "Catalog tenant A", slug: tenantA },
      { id: tenantB, name: "Catalog tenant B", slug: tenantB },
    ])
    .onConflictDoNothing()
})

afterAll(async () => {
  for (const organizationId of [tenantA, tenantB]) {
    await db
      .delete(professionalService)
      .where(eq(professionalService.organizationId, organizationId))
    await db.delete(serviceUnit).where(eq(serviceUnit.organizationId, organizationId))
    await db.delete(professionalUnit).where(eq(professionalUnit.organizationId, organizationId))
    await db.delete(service).where(eq(service.organizationId, organizationId))
    await db.delete(professional).where(eq(professional.organizationId, organizationId))
    await db.delete(unit).where(eq(unit.organizationId, organizationId))
    await db.delete(organization).where(eq(organization.id, organizationId))
  }
  await pool.end()
})

describe("catalog persistence on PostgreSQL", () => {
  it("keeps known record IDs isolated by tenant", async () => {
    const created = await catalog.create(tenantA, "unit", unitInput("ISO-A", "Unidade A"))

    await expect(catalog.get(tenantB, "unit", created.id)).rejects.toMatchObject({
      code: "not_found",
    })
    await expect(catalog.options(tenantB, "unit", { selectedIds: created.id })).resolves.toEqual([])
  })

  it("enforces compound tenant foreign keys for associations", async () => {
    const ownService = await catalog.create(tenantA, "service", serviceInput("Serviço FK"))
    const foreignUnit = await catalog.create(tenantB, "unit", unitInput("FK-B", "Unidade B"))

    let rejected: unknown
    try {
      await db.insert(serviceUnit).values({
        organizationId: tenantA,
        serviceId: ownService.id,
        unitId: foreignUnit.id,
      })
    } catch (error) {
      rejected = error
    }
    expect(rejected).toMatchObject({ cause: expect.objectContaining({ code: "23503" }) })
  })

  it("allows only one concurrent optimistic update for the same version", async () => {
    const created = await catalog.create(
      tenantA,
      "unit",
      unitInput("CONCURRENT", "Unidade concorrente"),
    )
    const results = await Promise.allSettled([
      catalog.update(
        tenantA,
        "unit",
        created.id,
        created.version,
        unitInput("CONCURRENT", "Primeira atualização"),
      ),
      catalog.update(
        tenantA,
        "unit",
        created.id,
        created.version,
        unitInput("CONCURRENT", "Segunda atualização"),
      ),
    ])

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1)
    const [rejected] = results.filter(({ status }) => status === "rejected")
    expect(rejected).toMatchObject({
      reason: expect.objectContaining({ code: "version_conflict" }),
      status: "rejected",
    })
  })

  it("rolls back aggregate changes when relation validation fails", async () => {
    const ownUnit = await catalog.create(tenantA, "unit", unitInput("ROLL-A", "Unidade própria"))
    const foreignUnit = await catalog.create(
      tenantB,
      "unit",
      unitInput("ROLL-B", "Unidade estrangeira"),
    )
    const created = await catalog.create(
      tenantA,
      "service",
      serviceInput("Serviço original", [ownUnit.id]),
    )

    await expect(
      catalog.update(
        tenantA,
        "service",
        created.id,
        created.version,
        serviceInput("Nome que deve reverter", [foreignUnit.id]),
      ),
    ).rejects.toBeInstanceOf(CatalogError)

    await expect(catalog.get(tenantA, "service", created.id)).resolves.toMatchObject({
      name: "Serviço original",
      unitIds: [ownUnit.id],
      version: created.version,
    })
  })
})
