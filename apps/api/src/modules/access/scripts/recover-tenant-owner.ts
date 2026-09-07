import { and, count, eq } from "drizzle-orm"
import { z } from "zod"
import { platformOperator } from "../../backstage/database/schema.js"
import { loadEnv } from "../../idp/config/env.js"
import { createDatabase, type IdpDatabase } from "../../idp/database/client.js"
import { member } from "../../idp/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import { accessAudit } from "../database/schema.js"

const inputSchema = z.object({
  actorUserId: z.string().min(1).max(128),
  organizationId: z.string().min(1).max(128),
  targetMembershipId: z.string().min(1).max(128),
})

export function parseRecoverOwnerArgs(argv: string[]) {
  const values: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--actor-user-id") values.actorUserId = argv[index + 1]
    if (argv[index] === "--organization-id") values.organizationId = argv[index + 1]
    if (argv[index] === "--target-membership-id") values.targetMembershipId = argv[index + 1]
  }
  return inputSchema.parse(values)
}

export async function recoverTenantOwner(db: IdpDatabase, input: z.infer<typeof inputSchema>) {
  return db.transaction(async (tx) => {
    const [operator] = await tx
      .select({ id: platformOperator.id })
      .from(platformOperator)
      .where(
        and(eq(platformOperator.userId, input.actorUserId), eq(platformOperator.status, "active")),
      )
      .limit(1)
    if (!operator) throw new Error("An active platform operator is required.")
    const [owners] = await tx
      .select({ value: count() })
      .from(member)
      .where(
        and(
          eq(member.organizationId, input.organizationId),
          eq(member.role, "owner"),
          eq(member.status, "active"),
        ),
      )
    if ((owners?.value ?? 0) !== 0)
      throw new Error("Recovery is allowed only when the tenant has no active owner.")
    const [target] = await tx
      .update(member)
      .set({ role: "owner" })
      .where(
        and(
          eq(member.id, input.targetMembershipId),
          eq(member.organizationId, input.organizationId),
          eq(member.status, "active"),
        ),
      )
      .returning({ id: member.id })
    if (!target) throw new Error("The target active membership does not exist.")
    await tx.insert(accessAudit).values({
      action: "ownership.recovered",
      actorUserId: input.actorUserId,
      id: createId(),
      organizationId: input.organizationId,
      outcome: "allowed",
      requestId: `recovery:${createId()}`,
      targetId: target.id,
    })
    return { ownerMembershipId: target.id, status: "recovered" as const }
  })
}

async function main() {
  const env = loadEnv()
  const { db, pool } = createDatabase(env)
  try {
    await recoverTenantOwner(db, parseRecoverOwnerArgs(process.argv.slice(2)))
  } finally {
    await pool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
