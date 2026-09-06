import { and, count, eq, gte, lte, sum } from "drizzle-orm"
import { z } from "zod"
import { commissionFact } from "../../commissions/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import {
  revenueReceipt,
  revenueReceiptLine,
  revenueReceiptReversal,
} from "../../revenue-operations/database/schema.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"

export const reportFilterSchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    unitId: z.string().optional(),
    professionalId: z.string().optional(),
    serviceId: z.string().optional(),
    paymentMethod: z.enum(["pix", "cash", "debit", "credit"]).optional(),
  })
  .refine(
    (value) =>
      value.from <= value.to && (Date.parse(value.to) - Date.parse(value.from)) / 86_400_000 <= 365,
    { message: "range_too_large" },
  )
export function createReportingService(db: IdpDatabase) {
  async function summary(actor: TenantContext, raw: unknown) {
    const input = reportFilterSchema.parse(raw)
    const receiptWhere = and(
      eq(revenueReceipt.organizationId, actor.organizationId),
      gte(revenueReceipt.localDate, input.from),
      lte(revenueReceipt.localDate, input.to),
    )
    const [receipts, lines, commissions, reversals] = await Promise.all([
      db
        .select({ count: count(), netRevenueCents: sum(revenueReceipt.totalCents) })
        .from(revenueReceipt)
        .where(and(receiptWhere, eq(revenueReceipt.status, "active"))),
      db
        .select({
          performedItems: count(),
          grossCents: sum(revenueReceiptLine.grossCents),
          netCents: sum(revenueReceiptLine.netCents),
        })
        .from(revenueReceiptLine)
        .innerJoin(
          revenueReceipt,
          and(
            eq(revenueReceiptLine.organizationId, revenueReceipt.organizationId),
            eq(revenueReceiptLine.receiptId, revenueReceipt.id),
          ),
        )
        .where(and(receiptWhere, eq(revenueReceipt.status, "active"))),
      db
        .select({
          commissionCents: sum(commissionFact.commissionCents),
          barbershopShareCents: sum(commissionFact.barbershopShareCents),
        })
        .from(commissionFact)
        .where(
          and(
            eq(commissionFact.organizationId, actor.organizationId),
            gte(commissionFact.localDate, input.from),
            lte(commissionFact.localDate, input.to),
          ),
        ),
      db
        .select({ count: count() })
        .from(revenueReceiptReversal)
        .innerJoin(
          revenueReceipt,
          and(
            eq(revenueReceiptReversal.organizationId, revenueReceipt.organizationId),
            eq(revenueReceiptReversal.receiptId, revenueReceipt.id),
          ),
        )
        .where(receiptWhere),
    ])
    return {
      filters: input,
      summary: {
        receiptCount: receipts[0]?.count ?? 0,
        netRevenueCents: Number(receipts[0]?.netRevenueCents ?? 0),
        performedItems: lines[0]?.performedItems ?? 0,
        grossCents: Number(lines[0]?.grossCents ?? 0),
        commissionCents: Number(commissions[0]?.commissionCents ?? 0),
        barbershopShareCents: Number(commissions[0]?.barbershopShareCents ?? 0),
        reversalCount: reversals[0]?.count ?? 0,
      },
      coverage: {
        revenue: "complete",
        commissions: "complete",
        customers: "partial",
        cash: "partial" as const,
      },
    }
  }
  return { summary }
}
export type ReportingService = ReturnType<typeof createReportingService>
