import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { platformOperator } from "../../backstage/database/schema.js"
import { loadEnv } from "../../idp/config/env.js"
import { createDatabase, type IdpDatabase } from "../../idp/database/client.js"
import { organization } from "../../idp/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import {
  accessAudit,
  plan,
  planEntitlement,
  planVersion,
  tenantSubscription,
} from "../database/schema.js"
import { capabilities } from "../domain/access-decision.js"

const argsSchema = z.object({
  activeClientLimit: z.coerce.number().int().min(0).max(1_000_000).default(100),
  actorUserId: z.string().min(1).max(128),
  organizationId: z.string().min(1).max(128),
  planKey: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80)
    .default("test-tier"),
  state: z.enum(["active", "expired", "suspended"]).default("active"),
})

export function parseConfigureAccessArgs(argv: string[]) {
  const values: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--organization-id") values.organizationId = argv[index + 1]
    if (argv[index] === "--plan-key") values.planKey = argv[index + 1]
    if (argv[index] === "--state") values.state = argv[index + 1]
    if (argv[index] === "--active-client-limit") values.activeClientLimit = argv[index + 1]
    if (argv[index] === "--actor-user-id") values.actorUserId = argv[index + 1]
  }
  return argsSchema.parse(values)
}

export async function configureTenantAccess(db: IdpDatabase, input: z.infer<typeof argsSchema>) {
  return db.transaction(async (tx) => {
    const [tenant] = await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, input.organizationId))
      .limit(1)
    if (!tenant) throw new Error("Organization does not exist.")
    const [operator] = await tx
      .select({ id: platformOperator.id })
      .from(platformOperator)
      .where(
        and(eq(platformOperator.userId, input.actorUserId), eq(platformOperator.status, "active")),
      )
      .limit(1)
    if (!operator) throw new Error("An active platform operator is required.")

    let [storedPlan] = await tx.select().from(plan).where(eq(plan.key, input.planKey)).limit(1)
    if (!storedPlan)
      [storedPlan] = await tx
        .insert(plan)
        .values({ id: createId(), key: input.planKey })
        .returning()
    if (!storedPlan) throw new Error("Plan could not be persisted.")

    let [version] = await tx
      .select()
      .from(planVersion)
      .where(and(eq(planVersion.planId, storedPlan.id), eq(planVersion.version, 1)))
      .limit(1)
    if (!version)
      [version] = await tx
        .insert(planVersion)
        .values({ id: createId(), planId: storedPlan.id, version: 1 })
        .returning()
    if (!version) throw new Error("Plan version could not be persisted.")

    const existing = await tx
      .select()
      .from(planEntitlement)
      .where(eq(planEntitlement.planVersionId, version.id))
    const missingCapabilities = capabilities.filter(
      (capability) => !existing.some((item) => item.capabilityKey === capability),
    )
    if (missingCapabilities.length > 0) {
      await tx.insert(planEntitlement).values(
        missingCapabilities.map((capability) => ({
          capabilityKey: capability,
          enabled: true,
          id: createId(),
          planVersionId: version.id,
          ...(capability === "clients.manage"
            ? { quotaKey: "clients.active.count", quotaLimit: input.activeClientLimit }
            : {}),
        })),
      )
    } else {
      const storedLimit = existing.find(
        (item) => item.capabilityKey === "clients.manage",
      )?.quotaLimit
      if (storedLimit !== input.activeClientLimit)
        throw new Error("Plan version 1 is immutable; create a new version for a different quota.")
    }

    const [current] = await tx
      .select()
      .from(tenantSubscription)
      .where(
        and(
          eq(tenantSubscription.organizationId, tenant.id),
          eq(tenantSubscription.isCurrent, true),
        ),
      )
      .limit(1)
    if (current?.planVersionId === version.id && current.state === input.state) return current
    if (current)
      await tx
        .update(tenantSubscription)
        .set({ isCurrent: false, updatedAt: new Date(), version: current.version + 1 })
        .where(
          and(
            eq(tenantSubscription.id, current.id),
            eq(tenantSubscription.version, current.version),
          ),
        )
    const [subscription] = await tx
      .insert(tenantSubscription)
      .values({
        id: createId(),
        organizationId: tenant.id,
        planVersionId: version.id,
        startsAt: new Date(),
        state: input.state,
      })
      .returning()
    if (!subscription) throw new Error("Subscription could not be persisted.")
    await tx.insert(accessAudit).values({
      action: "subscription.configured",
      actorUserId: input.actorUserId,
      id: createId(),
      organizationId: tenant.id,
      outcome: "allowed",
      requestId: `configuration:${createId()}`,
      targetId: subscription.id,
    })
    return subscription
  })
}

async function main() {
  const input = parseConfigureAccessArgs(process.argv.slice(2))
  const env = loadEnv()
  const { db, pool } = createDatabase(env)
  try {
    await configureTenantAccess(db, input)
  } finally {
    await pool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
