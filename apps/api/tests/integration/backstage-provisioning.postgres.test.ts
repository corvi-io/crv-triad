import { fileURLToPath } from "node:url"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, expect, it } from "vitest"
import { accessAudit, tenantSubscription } from "../../src/modules/access/database/schema.js"
import { platformOperator } from "../../src/modules/backstage/database/schema.js"
import { createBackstageRoutes } from "../../src/modules/backstage/http/routes.js"
import { member, organization, user } from "../../src/modules/idp/database/schema.js"

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is required")
const target = new URL(url)
if (
  !["localhost", "127.0.0.1"].includes(target.hostname) ||
  target.port === "5432" ||
  !target.pathname.endsWith("_test")
)
  throw new Error("Isolated local test database required")
const pool = new Pool({ connectionString: url })
const db = drizzle(pool)
const actorId = `provisioning-${crypto.randomUUID()}`
let tenantId: string | undefined
beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  await db
    .insert(user)
    .values({ id: actorId, name: "Provisioning QA", email: `${actorId}@example.invalid` })
  await db.insert(platformOperator).values({ id: actorId, userId: actorId, role: "system_owner" })
})
afterAll(async () => {
  if (tenantId) {
    await db.delete(accessAudit).where(eq(accessAudit.organizationId, tenantId))
    await db.delete(tenantSubscription).where(eq(tenantSubscription.organizationId, tenantId))
    await db.delete(member).where(eq(member.organizationId, tenantId))
    await db.delete(organization).where(eq(organization.id, tenantId))
  }
  await db.delete(platformOperator).where(eq(platformOperator.id, actorId))
  await db.delete(user).where(eq(user.id, actorId))
  await pool.end()
})
it("creates an owned tenant, active subscription and audit using the published migration chain", async () => {
  const app = createBackstageRoutes(
    { api: { getSession: async () => ({ user: { id: actorId } }) } } as never,
    db as never,
  )
  const response = await app.handle(
    new Request("http://localhost/api/backstage/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Provisioned QA", ownerEmail: `${actorId}@example.invalid` }),
    }),
  )
  expect(response.status).toBe(201)
  const result = await response.json()
  tenantId = result.id
  expect(result.ownerAccess).toBe("active")
  const [owner] = await db.select().from(member).where(eq(member.organizationId, result.id))
  expect(owner).toMatchObject({ userId: actorId, role: "owner", status: "active" })
  const [subscription] = await db
    .select()
    .from(tenantSubscription)
    .where(eq(tenantSubscription.organizationId, result.id))
  expect(subscription).toMatchObject({ state: "active", isCurrent: true })
  const [audit] = await db
    .select()
    .from(accessAudit)
    .where(eq(accessAudit.organizationId, result.id))
  expect(audit).toMatchObject({
    action: "tenant.created",
    outcome: "allowed",
    changedFields: [],
    entityType: null,
  })
})
