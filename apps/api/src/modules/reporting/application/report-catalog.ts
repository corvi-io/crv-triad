import { z } from "zod"
import { reportFilterSchema } from "./reporting-service.js"

export const reportTypeSchema = z.enum([
  "sales_revenue",
  "professional_performance",
  "commissions",
  "new_returning_customers",
  "cancellations_no_shows",
  "cash_payments",
])

export type ReportType = z.infer<typeof reportTypeSchema>

export const reportCatalog = [
  { type: "sales_revenue", title: "Vendas e faturamento", formats: ["pdf", "csv"] },
  {
    type: "professional_performance",
    title: "Desempenho por profissional",
    formats: ["pdf", "csv"],
  },
  { type: "commissions", title: "Comissões", formats: ["pdf", "csv"] },
  {
    type: "new_returning_customers",
    title: "Clientes novos e recorrentes",
    formats: ["pdf", "csv"],
  },
  { type: "cancellations_no_shows", title: "Cancelamentos e ausências", formats: ["pdf", "csv"] },
  { type: "cash_payments", title: "Caixa e pagamentos", formats: ["pdf", "csv"] },
] as const satisfies ReadonlyArray<{
  type: ReportType
  title: string
  formats: readonly ["pdf", "csv"]
}>

const commonConfig = z
  .object({
    filters: reportFilterSchema,
    timezone: z.string().min(1).max(100),
  })
  .strict()

export const reportConfigSnapshotSchema = z.discriminatedUnion("reportType", [
  commonConfig.extend({
    reportType: z.literal("sales_revenue"),
    includeReversals: z.boolean().default(true),
  }),
  commonConfig.extend({
    reportType: z.literal("professional_performance"),
    ranking: z.enum(["revenue", "appointments"]).default("revenue"),
  }),
  commonConfig.extend({
    reportType: z.literal("commissions"),
    includeReversals: z.boolean().default(true),
  }),
  commonConfig.extend({
    reportType: z.literal("new_returning_customers"),
    customerDefinition: z
      .literal("first_completed_receipt_in_tenant")
      .default("first_completed_receipt_in_tenant"),
  }),
  commonConfig.extend({
    reportType: z.literal("cancellations_no_shows"),
    includeCancelled: z.boolean().default(true),
    includeNoShows: z.boolean().default(true),
  }),
  commonConfig.extend({
    reportType: z.literal("cash_payments"),
    includeReversals: z.boolean().default(true),
  }),
])

export type ReportConfigSnapshot = z.infer<typeof reportConfigSnapshotSchema>

export const createReportRequestSchema = z
  .object({
    format: z.enum(["pdf", "csv"]),
    filters: reportFilterSchema,
    timezone: z.string().min(1).max(100),
    idempotencyKey: z.string().uuid(),
    reportType: reportTypeSchema.optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .transform((input) => {
    const reportType = input.reportType ?? "sales_revenue"
    const configSnapshot = reportConfigSnapshotSchema.parse({
      ...input.config,
      reportType,
      filters: input.filters,
      timezone: input.timezone,
    })
    return { ...input, reportType, configSnapshot }
  })

export function reportCatalogItem(type: ReportType) {
  return reportCatalog.find((item) => item.type === type) as (typeof reportCatalog)[number]
}
