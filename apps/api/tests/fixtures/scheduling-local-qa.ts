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
import { client } from "../../src/modules/clients/database/schema.js"
import { account, member, organization, user } from "../../src/modules/idp/database/schema.js"
import { professional, professionalUnit } from "../../src/modules/professionals/database/schema.js"
import {
  professionalService,
  service,
  serviceUnit,
} from "../../src/modules/services/database/schema.js"
import { unit } from "../../src/modules/units/database/schema.js"

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55444/initiative22_test"
const target = new URL(databaseUrl)
if (
  !["localhost", "127.0.0.1"].includes(target.hostname) ||
  target.port !== "55444" ||
  target.pathname !== "/initiative22_test"
)
  throw new Error("The dedicated local scheduling QA database is required.")
const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle(pool)
await migrate(db, { migrationsFolder: "./drizzle" })
const credentialsPath = ".artifacts/initiative22/credentials.json"
const previous = (await Bun.file(credentialsPath)
  .json()
  .catch(() => null)) as { password?: string } | null
const password = previous?.password ?? `${crypto.randomUUID()}Qa!9`
const hash = await hashPassword(password)
for (const suffix of ["a", "b"]) {
  const tenant = `qa22-${suffix}`
  await db
    .insert(organization)
    .values({ id: tenant, name: `Barbearia QA ${suffix.toUpperCase()}`, slug: tenant })
    .onConflictDoNothing()
  for (const role of ["owner", "admin", "member"] as const) {
    const id = `${tenant}-${role}`
    await db
      .insert(user)
      .values({
        id,
        name: `Pessoa QA ${role}`,
        email: `${id}@example.invalid`,
        emailVerified: true,
      })
      .onConflictDoNothing()
    await db
      .insert(account)
      .values({ id, accountId: id, userId: id, providerId: "credential", password: hash })
      .onConflictDoUpdate({ target: account.id, set: { password: hash } })
    await db
      .insert(member)
      .values({ id, userId: id, organizationId: tenant, role })
      .onConflictDoNothing()
  }
  await db
    .insert(unit)
    .values({
      id: `${tenant}-unit`,
      organizationId: tenant,
      name: `Unidade QA ${suffix.toUpperCase()}`,
      code: "QA",
      normalizedCode: "qa",
      address: "Endereço de teste",
      openingPeriods: [
        {
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
          start: "08:00",
          end: "20:00",
        },
      ],
    })
    .onConflictDoNothing()
  await db
    .insert(professional)
    .values({
      id: `${tenant}-professional`,
      organizationId: tenant,
      globalUserId: `${tenant}-owner`,
      role: "Barbeiro",
    })
    .onConflictDoNothing()
  await db
    .insert(professionalUnit)
    .values({
      organizationId: tenant,
      professionalId: `${tenant}-professional`,
      unitId: `${tenant}-unit`,
    })
    .onConflictDoNothing()
  await db
    .insert(service)
    .values({
      id: `${tenant}-service`,
      organizationId: tenant,
      name: "Corte QA",
      normalizedName: "corte qa",
      category: "Cabelo",
      description: "Serviço de teste",
      durationMinutes: 30,
      priceCents: 5000,
    })
    .onConflictDoNothing()
  await db
    .insert(serviceUnit)
    .values({ organizationId: tenant, serviceId: `${tenant}-service`, unitId: `${tenant}-unit` })
    .onConflictDoNothing()
  await db
    .insert(professionalService)
    .values({
      organizationId: tenant,
      professionalId: `${tenant}-professional`,
      serviceId: `${tenant}-service`,
    })
    .onConflictDoNothing()
  await db
    .insert(client)
    .values({
      id: `${tenant}-client`,
      organizationId: tenant,
      name: `Cliente QA ${suffix.toUpperCase()}`,
      normalizedPhone: "81999990001",
    })
    .onConflictDoNothing()
  await db.insert(plan).values({ id: tenant, key: tenant }).onConflictDoNothing()
  await db
    .insert(planVersion)
    .values({ id: tenant, planId: tenant, version: 1 })
    .onConflictDoNothing()
  for (const capabilityKey of capabilities)
    await db
      .insert(planEntitlement)
      .values({
        id: `${tenant}-${capabilityKey}`,
        planVersionId: tenant,
        capabilityKey,
        ...(capabilityKey === "clients.manage"
          ? { quotaKey: "clients.active.count", quotaLimit: 100 }
          : {}),
      })
      .onConflictDoNothing()
  await db
    .insert(tenantSubscription)
    .values({
      id: tenant,
      organizationId: tenant,
      planVersionId: tenant,
      state: "active",
      startsAt: new Date(),
    })
    .onConflictDoNothing()
}
const switchUserId = "qa22-switch-admin"
await db
  .insert(user)
  .values({
    id: switchUserId,
    name: "Pessoa QA de duas barbearias",
    email: `${switchUserId}@example.invalid`,
    emailVerified: true,
  })
  .onConflictDoNothing()
await db
  .insert(account)
  .values({
    id: switchUserId,
    accountId: switchUserId,
    userId: switchUserId,
    providerId: "credential",
    password: hash,
  })
  .onConflictDoUpdate({ target: account.id, set: { password: hash } })
for (const suffix of ["a", "b"])
  await db
    .insert(member)
    .values({
      id: `${switchUserId}-${suffix}`,
      userId: switchUserId,
      organizationId: `qa22-${suffix}`,
      role: "admin",
    })
    .onConflictDoNothing()
await Bun.write(".artifacts/initiative22/credentials.json", JSON.stringify({ password }))
await pool.end()
console.log("Synthetic QA fixtures ready: two tenants, three roles each.")
