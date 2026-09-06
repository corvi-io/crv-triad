import { hashPassword } from "better-auth/crypto"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import {
  plan,
  planEntitlement,
  planVersion,
  tenantSubscription,
} from "../../src/modules/access/database/schema.js"
import { capabilities } from "../../src/modules/access/domain/access-decision.js"
import { availabilitySeries } from "../../src/modules/availability/database/schema.js"
import { client } from "../../src/modules/clients/database/schema.js"
import { account, member, organization, user } from "../../src/modules/idp/database/schema.js"
import { professional, professionalUnit } from "../../src/modules/professionals/database/schema.js"
import {
  professionalService,
  service,
  serviceUnit,
} from "../../src/modules/services/database/schema.js"
import { unit } from "../../src/modules/units/database/schema.js"

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required.")
const target = new URL(databaseUrl)
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "55443" ||
  target.pathname !== "/triad23_test"
)
  throw new Error("The dedicated Initiative 23 local QA database is required.")

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle(pool)
await migrate(db, { migrationsFolder: "./drizzle" })
const credentialsPath = ".artifacts/initiative23/credentials.json"
const previous = (await Bun.file(credentialsPath)
  .json()
  .catch(() => null)) as { password?: string } | null
const password = previous?.password ?? `${crypto.randomUUID()}Qa!9`
const hash = await hashPassword(password)
const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

for (const suffix of ["a", "b"] as const) {
  const tenantId = `qa23-${suffix}`
  const ownerId = `${tenantId}-owner`
  await db
    .insert(organization)
    .values({ id: tenantId, name: `Barbearia QA ${suffix.toUpperCase()}`, slug: tenantId })
    .onConflictDoNothing()
  await db
    .insert(user)
    .values({
      id: ownerId,
      name: `Recepção QA ${suffix.toUpperCase()}`,
      email: `${ownerId}@example.invalid`,
      emailVerified: true,
    })
    .onConflictDoNothing()
  await db
    .insert(account)
    .values({
      id: ownerId,
      accountId: ownerId,
      userId: ownerId,
      providerId: "credential",
      password: hash,
    })
    .onConflictDoUpdate({ target: account.id, set: { password: hash } })
  await db
    .insert(member)
    .values({ id: `${ownerId}-member`, organizationId: tenantId, userId: ownerId, role: "owner" })
    .onConflictDoNothing()
  await db
    .insert(unit)
    .values({
      id: `${tenantId}-unit`,
      organizationId: tenantId,
      name: `Unidade QA ${suffix.toUpperCase()}`,
      code: `Q${suffix}`,
      normalizedCode: `q${suffix}`,
      address: "Endereço sintético",
      timezone: "America/Recife",
      openingDays: [...weekdays],
      openingStart: "00:00",
      openingEnd: "23:59",
    })
    .onConflictDoNothing()
  await db
    .insert(professional)
    .values({
      id: `${tenantId}-professional`,
      organizationId: tenantId,
      globalUserId: ownerId,
      role: "Barbeiro",
    })
    .onConflictDoNothing()
  await db
    .insert(professionalUnit)
    .values({
      organizationId: tenantId,
      professionalId: `${tenantId}-professional`,
      unitId: `${tenantId}-unit`,
    })
    .onConflictDoNothing()
  await db
    .insert(service)
    .values({
      id: `${tenantId}-service`,
      organizationId: tenantId,
      name: "Corte QA",
      normalizedName: "corte qa",
      category: "Cabelo",
      description: "Serviço sintético",
      durationMinutes: 30,
      priceCents: 5000,
    })
    .onConflictDoNothing()
  await db
    .insert(serviceUnit)
    .values({
      organizationId: tenantId,
      serviceId: `${tenantId}-service`,
      unitId: `${tenantId}-unit`,
    })
    .onConflictDoNothing()
  await db
    .insert(professionalService)
    .values({
      organizationId: tenantId,
      professionalId: `${tenantId}-professional`,
      serviceId: `${tenantId}-service`,
    })
    .onConflictDoNothing()
  await db
    .insert(availabilitySeries)
    .values({
      id: `${tenantId}-availability`,
      organizationId: tenantId,
      unitId: `${tenantId}-unit`,
      professionalId: `${tenantId}-professional`,
      kind: "available",
      start: "00:00",
      end: "23:59",
      weekdays: [...weekdays],
      effectiveFrom: "2020-01-01",
      excludedDates: [],
    })
    .onConflictDoNothing()
  await db
    .insert(client)
    .values({
      id: `${tenantId}-client`,
      organizationId: tenantId,
      name: `Cliente QA ${suffix.toUpperCase()}`,
      normalizedPhone: suffix === "a" ? "81999990001" : "81999990002",
    })
    .onConflictDoNothing()
  await db.insert(plan).values({ id: tenantId, key: tenantId }).onConflictDoNothing()
  await db
    .insert(planVersion)
    .values({ id: tenantId, planId: tenantId, version: 1 })
    .onConflictDoNothing()
  for (const capabilityKey of capabilities)
    await db
      .insert(planEntitlement)
      .values({
        id: `${tenantId}-${capabilityKey}`,
        planVersionId: tenantId,
        capabilityKey,
        ...(capabilityKey === "clients.manage"
          ? { quotaKey: "clients.active.count", quotaLimit: 100 }
          : {}),
      })
      .onConflictDoNothing()
  await db
    .insert(tenantSubscription)
    .values({
      id: tenantId,
      organizationId: tenantId,
      planVersionId: tenantId,
      state: "active",
      startsAt: new Date(),
    })
    .onConflictDoNothing()
}

await Bun.write(
  credentialsPath,
  JSON.stringify({ email: "qa23-a-owner@example.invalid", password }),
)
await pool.end()
console.info("Initiative 23 synthetic QA fixtures ready for two isolated tenants.")
