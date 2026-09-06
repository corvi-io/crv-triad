import { type SQL, sql } from "drizzle-orm"
import { z } from "zod"
import type { IdpDatabase } from "../../idp/database/client.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import type { ReportConfigSnapshot, ReportType } from "./report-catalog.js"

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

export type ReportFiltersInput = z.infer<typeof reportFilterSchema>
export type ReportRows = Array<[string, string]>

type SummaryRow = {
  receipt_count: string
  net_revenue_cents: string
  performed_items: string
  gross_cents: string
  commission_cents: string
  barbershop_share_cents: string
  reversal_count: string
}

export function createReportingService(db: IdpDatabase) {
  async function summary(actor: TenantContext, raw: unknown) {
    const filters = reportFilterSchema.parse(raw)
    const revenueExpression = filteredReceiptRevenue(filters)
    const result = await db.execute<SummaryRow>(sql`
      with filtered_receipts as (
        select receipt.*
        from revenue_receipts receipt
        join revenue_checkouts checkout
          on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
        where ${receiptPredicate(actor.organizationId, filters)}
      ), filtered_lines as (
        select line.*
        from revenue_receipt_lines line
        join filtered_receipts receipt
          on receipt.organization_id = line.organization_id and receipt.id = line.receipt_id
        where receipt.status = 'active' ${linePredicate(filters, "line")}
      ), filtered_commissions as (
        select fact.*
        from commission_facts fact
        join filtered_receipts receipt
          on receipt.organization_id = fact.organization_id and receipt.id = fact.receipt_id
        where true ${commissionPredicate(filters, "fact")}
      )
      select
        (select count(*) from filtered_receipts where status = 'active')::text receipt_count,
        (select coalesce(sum(${revenueExpression}), 0) from filtered_receipts receipt where status = 'active')::text net_revenue_cents,
        (select count(*) from filtered_lines)::text performed_items,
        (select coalesce(sum(gross_cents), 0) from filtered_lines)::text gross_cents,
        (select coalesce(sum(commission_cents), 0) from filtered_commissions)::text commission_cents,
        (select coalesce(sum(barbershop_share_cents), 0) from filtered_commissions)::text barbershop_share_cents,
        (select count(*) from revenue_receipt_reversals reversal join filtered_receipts receipt on receipt.organization_id = reversal.organization_id and receipt.id = reversal.receipt_id)::text reversal_count
    `)
    const row = result.rows[0]
    return {
      filters,
      summary: {
        receiptCount: Number(row?.receipt_count ?? 0),
        netRevenueCents: Number(row?.net_revenue_cents ?? 0),
        performedItems: Number(row?.performed_items ?? 0),
        grossCents: Number(row?.gross_cents ?? 0),
        commissionCents: Number(row?.commission_cents ?? 0),
        barbershopShareCents: Number(row?.barbershop_share_cents ?? 0),
        reversalCount: Number(row?.reversal_count ?? 0),
      },
      coverage: {
        revenue: "complete",
        commissions: "complete",
        customers: "complete",
        cash: "complete",
      } as const,
    }
  }

  async function report(
    actor: TenantContext,
    type: ReportType,
    rawFilters: unknown,
    config: ReportConfigSnapshot,
  ): Promise<ReportRows> {
    const filters = reportFilterSchema.parse(rawFilters)
    switch (type) {
      case "sales_revenue":
        return salesRows(actor.organizationId, filters, config)
      case "professional_performance":
        return professionalRows(actor.organizationId, filters, config)
      case "commissions":
        return commissionRows(actor.organizationId, filters, config)
      case "new_returning_customers":
        return customerRows(actor.organizationId, filters)
      case "cancellations_no_shows":
        return cancellationRows(actor.organizationId, filters, config)
      case "cash_payments":
        return cashRows(actor.organizationId, filters, config)
    }
  }

  async function salesRows(
    organizationId: string,
    filters: ReportFiltersInput,
    config: ReportConfigSnapshot,
  ) {
    const includeReversals = config.reportType === "sales_revenue" && config.includeReversals
    const revenueExpression = filteredReceiptRevenue(filters)
    const result = await db.execute<{ sales: string; total: string; reversals: string }>(sql`
      select count(*)::text sales,
        coalesce(sum(${includeReversals ? sql`case when receipt.status = 'reversed' then -(${revenueExpression}) else ${revenueExpression} end` : revenueExpression}), 0)::text total,
        count(*) filter (where receipt.status = 'reversed')::text reversals
      from revenue_receipts receipt
      join revenue_checkouts checkout
        on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
      where ${receiptPredicate(organizationId, filters)}
        ${includeReversals ? sql`` : sql`and receipt.status = 'active'`}
    `)
    const row = result.rows[0]
    const sales = Number(row?.sales ?? 0)
    const total = Number(row?.total ?? 0)
    return [
      ["Vendas registradas", String(sales)],
      [salesValueLabel(filters), String(total)],
      ["Ticket médio (centavos)", String(sales ? Math.round(total / sales) : 0)],
      ...(includeReversals
        ? ([["Vendas revertidas", String(Number(row?.reversals ?? 0))]] as ReportRows)
        : []),
    ] as ReportRows
  }

  async function professionalRows(
    organizationId: string,
    filters: ReportFiltersInput,
    config: ReportConfigSnapshot,
  ) {
    const ranking = config.reportType === "professional_performance" ? config.ranking : "revenue"
    const result = await db.execute<{
      professional_id: string
      professional_name: string
      services: string
      revenue: string
    }>(sql`
      select line.snapshot->>'professionalId' professional_id,
        line.snapshot->>'professionalName' professional_name,
        count(*)::text services, coalesce(sum(line.net_cents), 0)::text revenue
      from revenue_receipt_lines line
      join revenue_receipts receipt
        on receipt.organization_id = line.organization_id and receipt.id = line.receipt_id
      join revenue_checkouts checkout
        on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
      where ${receiptPredicate(organizationId, filters)} and receipt.status = 'active'
        ${linePredicate(filters, "line")}
      group by line.snapshot->>'professionalId', line.snapshot->>'professionalName'
      order by ${ranking === "appointments" ? sql`count(*)` : sql`sum(line.net_cents)`} desc,
        line.snapshot->>'professionalId'
      limit 500
    `)
    return result.rows.flatMap((row) => [
      [`${row.professional_name} — serviços`, String(Number(row.services))],
      [`${row.professional_name} — receita (centavos)`, String(Number(row.revenue))],
    ]) as ReportRows
  }

  async function commissionRows(
    organizationId: string,
    filters: ReportFiltersInput,
    config: ReportConfigSnapshot,
  ) {
    const includeReversals = config.reportType === "commissions" && config.includeReversals
    const result = await db.execute<{
      professional_id: string
      professional_name: string
      facts: string
      commission: string
      barbershop: string
    }>(sql`
      select fact.professional_id, fact.professional_name, count(*)::text facts,
        coalesce(sum(fact.commission_cents), 0)::text commission,
        coalesce(sum(fact.barbershop_share_cents), 0)::text barbershop
      from commission_facts fact
      join revenue_receipts receipt
        on receipt.organization_id = fact.organization_id and receipt.id = fact.receipt_id
      join revenue_checkouts checkout
        on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
      where ${receiptPredicate(organizationId, filters)} ${commissionPredicate(filters, "fact")}
        ${includeReversals ? sql`` : sql`and fact.kind = 'earned'`}
      group by fact.professional_id, fact.professional_name
      order by sum(fact.commission_cents) desc, fact.professional_id
      limit 500
    `)
    return result.rows.flatMap((row) => [
      [`${row.professional_name} — comissão (centavos)`, String(Number(row.commission))],
      [`${row.professional_name} — barbearia (centavos)`, String(Number(row.barbershop))],
      [`${row.professional_name} — fatos`, String(Number(row.facts))],
    ]) as ReportRows
  }

  async function customerRows(organizationId: string, filters: ReportFiltersInput) {
    const result = await db.execute<{ new_count: string; returning_count: string }>(sql`
      with qualifying as (
        select distinct checkout.client_id
        from revenue_receipts receipt
        join revenue_checkouts checkout
          on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
        where ${receiptPredicate(organizationId, filters)} and checkout.client_id is not null
      ), first_receipt as (
        select checkout.client_id, min(receipt.local_date) first_date
        from revenue_receipts receipt
        join revenue_checkouts checkout
          on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
        where receipt.organization_id = ${organizationId} and checkout.client_id is not null
        group by checkout.client_id
      )
      select count(*) filter (where first_date >= ${filters.from})::text new_count,
        count(*) filter (where first_date < ${filters.from})::text returning_count
      from qualifying join first_receipt using (client_id)
    `)
    return [
      ["Clientes novos", String(Number(result.rows[0]?.new_count ?? 0))],
      ["Clientes recorrentes", String(Number(result.rows[0]?.returning_count ?? 0))],
    ] as ReportRows
  }

  async function cancellationRows(
    organizationId: string,
    filters: ReportFiltersInput,
    config: ReportConfigSnapshot,
  ) {
    const result = await db.execute<{ cancelled: string; no_shows: string }>(sql`
      select count(*) filter (where status = 'canceled')::text cancelled,
        count(*) filter (where status = 'no-show')::text no_shows
      from scheduling_appointments
      where organization_id = ${organizationId} and date between ${filters.from} and ${filters.to}
        ${filters.unitId ? sql`and unit_id = ${filters.unitId}` : sql``}
        ${filters.professionalId ? sql`and professional_id = ${filters.professionalId}` : sql``}
        ${filters.serviceId ? sql`and service_id = ${filters.serviceId}` : sql``}
        and status in ('canceled', 'no-show')
    `)
    const row = result.rows[0]
    const typed = config.reportType === "cancellations_no_shows" ? config : null
    return [
      ...(typed?.includeCancelled === false
        ? []
        : ([["Cancelamentos", String(Number(row?.cancelled ?? 0))]] as ReportRows)),
      ...(typed?.includeNoShows === false
        ? []
        : ([["Ausências", String(Number(row?.no_shows ?? 0))]] as ReportRows)),
    ]
  }

  async function cashRows(
    organizationId: string,
    filters: ReportFiltersInput,
    config: ReportConfigSnapshot,
  ) {
    const includeReversals = config.reportType === "cash_payments" && config.includeReversals
    const result = await db.execute<{ method: string; receipts: string; net: string }>(sql`
      select tender.method, count(*)::text receipts,
        coalesce(sum(case when receipt.status = 'reversed' then -tender.applied_cents else tender.applied_cents end), 0)::text net
      from revenue_receipt_tenders tender
      join revenue_receipts receipt
        on receipt.organization_id = tender.organization_id and receipt.id = tender.receipt_id
      join revenue_checkouts checkout
        on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
      where receipt.organization_id = ${organizationId}
        and receipt.local_date between ${filters.from} and ${filters.to}
        ${filters.unitId ? sql`and checkout.unit_id = ${filters.unitId}` : sql``}
        ${filters.paymentMethod ? sql`and tender.method = ${filters.paymentMethod}` : sql``}
        ${includeReversals ? sql`` : sql`and receipt.status = 'active'`}
      group by tender.method order by tender.method
    `)
    return result.rows.flatMap((row) => [
      [`${paymentMethodLabel(row.method)} — lançamentos`, String(Number(row.receipts))],
      [`${paymentMethodLabel(row.method)} — líquido (centavos)`, String(Number(row.net))],
    ]) as ReportRows
  }

  return { summary, report }
}

function receiptPredicate(organizationId: string, filters: ReportFiltersInput): SQL {
  return sql`receipt.organization_id = ${organizationId}
    and receipt.local_date between ${filters.from} and ${filters.to}
    ${filters.unitId ? sql`and checkout.unit_id = ${filters.unitId}` : sql``}
    ${filters.professionalId ? sql`and exists (select 1 from revenue_receipt_lines filter_line where filter_line.organization_id = receipt.organization_id and filter_line.receipt_id = receipt.id and filter_line.snapshot->>'professionalId' = ${filters.professionalId})` : sql``}
    ${filters.serviceId ? sql`and exists (select 1 from revenue_receipt_lines filter_line where filter_line.organization_id = receipt.organization_id and filter_line.receipt_id = receipt.id and filter_line.snapshot->>'serviceId' = ${filters.serviceId})` : sql``}
    ${filters.paymentMethod ? sql`and exists (select 1 from revenue_receipt_tenders filter_tender where filter_tender.organization_id = receipt.organization_id and filter_tender.receipt_id = receipt.id and filter_tender.method = ${filters.paymentMethod})` : sql``}`
}

function linePredicate(filters: ReportFiltersInput, alias: "line"): SQL {
  return sql`${filters.professionalId ? sql`and ${sql.identifier(alias)}.snapshot->>'professionalId' = ${filters.professionalId}` : sql``}
    ${filters.serviceId ? sql`and ${sql.identifier(alias)}.snapshot->>'serviceId' = ${filters.serviceId}` : sql``}`
}

function filteredReceiptRevenue(filters: ReportFiltersInput): SQL {
  if (filters.professionalId || filters.serviceId)
    return sql`(select coalesce(sum(metric_line.net_cents), 0) from revenue_receipt_lines metric_line
      where metric_line.organization_id = receipt.organization_id and metric_line.receipt_id = receipt.id
        ${filters.professionalId ? sql`and metric_line.snapshot->>'professionalId' = ${filters.professionalId}` : sql``}
        ${filters.serviceId ? sql`and metric_line.snapshot->>'serviceId' = ${filters.serviceId}` : sql``})`
  if (filters.paymentMethod)
    return sql`(select coalesce(sum(metric_tender.applied_cents), 0) from revenue_receipt_tenders metric_tender
      where metric_tender.organization_id = receipt.organization_id and metric_tender.receipt_id = receipt.id
        and metric_tender.method = ${filters.paymentMethod})`
  return sql`receipt.total_cents`
}

function salesValueLabel(filters: ReportFiltersInput) {
  if (filters.professionalId || filters.serviceId) return "Receita dos itens filtrados (centavos)"
  if (filters.paymentMethod)
    return `Valor via ${paymentMethodLabel(filters.paymentMethod)} (centavos)`
  return "Faturamento líquido (centavos)"
}

function commissionPredicate(filters: ReportFiltersInput, alias: "fact"): SQL {
  return sql`${filters.professionalId ? sql`and ${sql.identifier(alias)}.professional_id = ${filters.professionalId}` : sql``}
    ${filters.serviceId ? sql`and ${sql.identifier(alias)}.service_id = ${filters.serviceId}` : sql``}`
}

function paymentMethodLabel(method: string) {
  return { pix: "Pix", cash: "Dinheiro", debit: "Débito", credit: "Crédito" }[method] ?? method
}

export type ReportingService = ReturnType<typeof createReportingService>
