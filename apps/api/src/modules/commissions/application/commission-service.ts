import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm"
import { z } from "zod"
import type { IdpDatabase } from "../../idp/database/client.js"
import { createId } from "../../shared/infra/ids.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import { commissionFact, commissionPolicy } from "../database/schema.js"

export class CommissionError extends Error {
  constructor(readonly code: "not_found" | "version_conflict") {
    super(code)
  }
}
const rule = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("percentage"), basisPoints: z.number().int().min(1).max(10_000) }),
  z.object({ kind: z.literal("fixed"), fixedCents: z.number().int().positive() }),
])
export function createCommissionService(db: IdpDatabase) {
  async function listPolicies(actor: TenantContext) {
    return db
      .select()
      .from(commissionPolicy)
      .where(eq(commissionPolicy.organizationId, actor.organizationId))
      .orderBy(asc(commissionPolicy.professionalId), asc(commissionPolicy.serviceId))
  }
  async function savePolicy(actor: TenantContext, raw: unknown) {
    const input = z
      .object({
        professionalId: z.string().min(1),
        serviceId: z.string().min(1).nullable(),
        expectedVersion: z.number().int().positive().nullable(),
        rule,
      })
      .strict()
      .parse(raw)
    if (input.rule.kind === "fixed" && !input.serviceId) throw new z.ZodError([])
    const [current] = await db
      .select()
      .from(commissionPolicy)
      .where(
        and(
          eq(commissionPolicy.organizationId, actor.organizationId),
          eq(commissionPolicy.professionalId, input.professionalId),
          input.serviceId
            ? eq(commissionPolicy.serviceId, input.serviceId)
            : sql`${commissionPolicy.serviceId} is null`,
        ),
      )
      .limit(1)
    if ((current?.version ?? null) !== input.expectedVersion)
      throw new CommissionError("version_conflict")
    const values = {
      kind: input.rule.kind,
      basisPoints: input.rule.kind === "percentage" ? input.rule.basisPoints : null,
      fixedCents: input.rule.kind === "fixed" ? input.rule.fixedCents : null,
      updatedBy: actor.actorUserId,
      updatedAt: new Date(),
    }
    if (!current)
      await db.insert(commissionPolicy).values({
        id: createId(),
        organizationId: actor.organizationId,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        ...values,
      })
    else
      await db
        .update(commissionPolicy)
        .set({ ...values, version: sql`${commissionPolicy.version} + 1` })
        .where(
          and(
            eq(commissionPolicy.organizationId, actor.organizationId),
            eq(commissionPolicy.id, current.id),
            eq(commissionPolicy.version, current.version),
          ),
        )
    return listPolicies(actor)
  }
  async function detail(actor: TenantContext, raw: unknown) {
    const input = z
      .object({
        from: z.iso.date(),
        to: z.iso.date(),
        professionalId: z.string().optional(),
        serviceId: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(raw)
    if (input.from > input.to || (Date.parse(input.to) - Date.parse(input.from)) / 86_400_000 > 365)
      throw new z.ZodError([])
    const filters = [
      eq(commissionFact.organizationId, actor.organizationId),
      gte(commissionFact.localDate, input.from),
      lte(commissionFact.localDate, input.to),
    ]
    if (input.professionalId) filters.push(eq(commissionFact.professionalId, input.professionalId))
    if (input.serviceId) filters.push(eq(commissionFact.serviceId, input.serviceId))
    const items = await db
      .select()
      .from(commissionFact)
      .where(and(...filters))
      .orderBy(desc(commissionFact.occurredAt), desc(commissionFact.id))
      .limit(input.limit)
    return {
      items,
      totals: items.reduce(
        (a, item) => ({
          commissionCents: a.commissionCents + item.commissionCents,
          barbershopShareCents: a.barbershopShareCents + item.barbershopShareCents,
        }),
        { commissionCents: 0, barbershopShareCents: 0 },
      ),
    }
  }
  return { listPolicies, savePolicy, detail }
}
export type CommissionService = ReturnType<typeof createCommissionService>
