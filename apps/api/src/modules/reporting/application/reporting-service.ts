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
    const grossAllocation = allocatedLineAmount(filters, "gross_cents")
    const result = await db.execute<SummaryRow>(sql`
      with filtered_receipts as (
        select receipt.*
        from revenue_receipts receipt
        join revenue_checkouts checkout
          on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
        where ${receiptPredicate(actor.organizationId, filters)}
      ), filtered_lines as (
        select line.*, ${grossAllocation} allocated_gross_cents
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
        (select coalesce(sum(allocated_gross_cents), 0) from filtered_lines)::text gross_cents,
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
  ): Promise<ReportRows> {
    const includeReversals = config.reportType === "sales_revenue" && config.includeReversals
    const current = await periodSalesMetrics(organizationId, filters)
    const days = Math.round((Date.parse(filters.to) - Date.parse(filters.from)) / 86_400_000) + 1
    const previousTo = shiftDate(filters.from, -1)
    const previousFrom = shiftDate(previousTo, -(days - 1))
    const previous = await periodSalesMetrics(organizationId, {
      ...filters,
      from: previousFrom,
      to: previousTo,
    })
    const netAfterRefunds = current.net - (includeReversals ? current.refunds : 0)
    const previousNet = previous.net - (includeReversals ? previous.refunds : 0)
    return [
      ["Serviços concluídos", String(current.services)],
      ["Vendas pagas", String(current.sales)],
      ["Receita bruta (centavos)", String(current.gross)],
      ["Receita líquida (centavos)", String(netAfterRefunds)],
      ["Estornos (centavos)", String(includeReversals ? current.refunds : 0)],
      [
        "Ticket médio (centavos)",
        String(current.sales ? Math.round(current.net / current.sales) : 0),
      ],
      ["Período anterior — receita líquida (centavos)", String(previousNet)],
      ["Variação contra período anterior (centavos)", String(netAfterRefunds - previousNet)],
    ] as ReportRows

    async function periodSalesMetrics(orgId: string, period: ReportFiltersInput) {
      const netAllocation = allocatedLineAmount(period, "net_cents")
      const grossAllocation = allocatedLineAmount(period, "gross_cents")
      const result = await db.execute<{
        sales: string
        services: string
        gross: string
        net: string
        refunds: string
      }>(sql`
      select count(distinct receipt.id) filter (where receipt.status = 'active')::text sales,
        count(*) filter (where receipt.status = 'active')::text services,
        coalesce(sum(${grossAllocation}) filter (where receipt.status = 'active'), 0)::text gross,
        coalesce(sum(${netAllocation}) filter (where receipt.status = 'active'), 0)::text net,
        coalesce(sum(${netAllocation}) filter (where receipt.status = 'reversed'), 0)::text refunds
      from revenue_receipts receipt
      join revenue_checkouts checkout
        on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
      join revenue_receipt_lines line
        on line.organization_id = receipt.organization_id and line.receipt_id = receipt.id
      where ${receiptPredicate(orgId, period)} ${linePredicate(period, "line")}
      `)
      const row = result.rows[0]
      return {
        sales: Number(row?.sales ?? 0),
        services: Number(row?.services ?? 0),
        gross: Number(row?.gross ?? 0),
        net: Number(row?.net ?? 0),
        refunds: Number(row?.refunds ?? 0),
      }
    }
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
      completed_appointments: string
      cancelled: string
      no_shows: string
      sales: string
      revenue: string
    }>(sql`
      with revenue as (
        select line.snapshot->>'professionalId' professional_id,
          max(line.snapshot->>'professionalName') professional_name,
          count(distinct receipt.id) sales,
          coalesce(sum(line.net_cents), 0) revenue
        from revenue_receipt_lines line
        join revenue_receipts receipt
          on receipt.organization_id = line.organization_id and receipt.id = line.receipt_id
        join revenue_checkouts checkout
          on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
        where ${receiptPredicate(organizationId, filters)} and receipt.status = 'active'
          ${linePredicate(filters, "line")}
        group by line.snapshot->>'professionalId'
      ), scheduled as (
        select professional_id, max(professional_name) professional_name,
          count(*) filter (where status = 'completed') completed_appointments,
          count(*) filter (where status = 'canceled') cancelled,
          count(*) filter (where status = 'no-show') no_shows
        from scheduling_appointments
        where organization_id = ${organizationId} and date between ${filters.from} and ${filters.to}
          ${filters.unitId ? sql`and unit_id = ${filters.unitId}` : sql``}
          ${filters.professionalId ? sql`and professional_id = ${filters.professionalId}` : sql``}
          ${filters.serviceId ? sql`and service_id = ${filters.serviceId}` : sql``}
        group by professional_id
      ), universe as (
        select professional_id, professional_name from revenue
        union
        select professional_id, professional_name from scheduled
      )
      select universe.professional_id, max(universe.professional_name) professional_name,
        coalesce(max(scheduled.completed_appointments), 0)::text completed_appointments,
        coalesce(max(scheduled.cancelled), 0)::text cancelled,
        coalesce(max(scheduled.no_shows), 0)::text no_shows,
        coalesce(max(revenue.sales), 0)::text sales,
        coalesce(max(revenue.revenue), 0)::text revenue
      from universe
      left join revenue using (professional_id)
      left join scheduled using (professional_id)
      group by universe.professional_id
      order by ${ranking === "appointments" ? sql`coalesce(max(scheduled.completed_appointments), 0)` : sql`coalesce(max(revenue.revenue), 0)`} desc,
        universe.professional_id
      limit 500
    `)
    return result.rows.flatMap((row): ReportRows => {
      const revenue = Number(row.revenue)
      const sales = Number(row.sales)
      return [
        [
          `${row.professional_name} — agendamentos concluídos`,
          String(Number(row.completed_appointments)),
        ],
        [`${row.professional_name} — receita (centavos)`, String(revenue)],
        [
          `${row.professional_name} — ticket médio (centavos)`,
          String(sales ? Math.round(revenue / sales) : 0),
        ],
        [`${row.professional_name} — cancelamentos`, String(Number(row.cancelled))],
        [`${row.professional_name} — ausências`, String(Number(row.no_shows))],
      ]
    }) as ReportRows
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
      reversals: string
      service_revenue: string
      commission: string
      barbershop: string
    }>(sql`
      select fact.professional_id, fact.professional_name,
        count(*) filter (where fact.kind = 'earned')::text facts,
        count(*) filter (where fact.kind = 'reversal')::text reversals,
        coalesce(sum(fact.net_base_cents), 0)::text service_revenue,
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
      [
        `${row.professional_name} — receita de serviços (centavos)`,
        String(Number(row.service_revenue)),
      ],
      [`${row.professional_name} — barbearia (centavos)`, String(Number(row.barbershop))],
      [`${row.professional_name} — fatos`, String(Number(row.facts))],
      [`${row.professional_name} — estornos`, String(Number(row.reversals))],
    ]) as ReportRows
  }

  async function customerRows(organizationId: string, filters: ReportFiltersInput) {
    const result = await db.execute<{
      new_count: string
      returning_count: string
      unknown_count: string
    }>(sql`
      with qualifying_sales as (
        select receipt.id, checkout.client_id
        from revenue_receipts receipt
        join revenue_checkouts checkout
          on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
        where ${receiptPredicate(organizationId, filters)} and receipt.status = 'active'
      ), qualifying as (
        select distinct checkout.client_id
        from revenue_receipts receipt
        join revenue_checkouts checkout
          on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
        where ${receiptPredicate(organizationId, filters)} and receipt.status = 'active'
          and checkout.client_id is not null
      ), first_receipt as (
        select checkout.client_id, min(receipt.local_date) first_date
        from revenue_receipts receipt
        join revenue_checkouts checkout
          on checkout.organization_id = receipt.organization_id and checkout.id = receipt.checkout_id
        where receipt.organization_id = ${organizationId} and receipt.status = 'active'
          and checkout.client_id is not null
        group by checkout.client_id
      )
      select count(*) filter (where first_date >= ${filters.from})::text new_count,
        count(*) filter (where first_date < ${filters.from})::text returning_count,
        (select count(*) from qualifying_sales where client_id is null)::text unknown_count
      from qualifying join first_receipt using (client_id)
    `)
    const newCount = Number(result.rows[0]?.new_count ?? 0)
    const returningCount = Number(result.rows[0]?.returning_count ?? 0)
    const identifiableCount = newCount + returningCount
    return [
      ["Clientes únicos identificados", String(identifiableCount)],
      ["Clientes novos", String(newCount)],
      ["Clientes recorrentes", String(returningCount)],
      ["Clientes sem identidade estável", String(Number(result.rows[0]?.unknown_count ?? 0))],
      ["Novos (basis points)", String(rateBasisPoints(newCount, identifiableCount))],
      ["Recorrentes (basis points)", String(rateBasisPoints(returningCount, identifiableCount))],
    ] as ReportRows
  }

  async function cancellationRows(
    organizationId: string,
    filters: ReportFiltersInput,
    config: ReportConfigSnapshot,
  ): Promise<ReportRows> {
    const result = await db.execute<{
      cancelled: string
      no_shows: string
      denominator: string
      affected_value: string
    }>(sql`
      select count(*) filter (where status = 'canceled')::text cancelled,
        count(*) filter (where status = 'no-show')::text no_shows,
        count(*)::text denominator,
        coalesce(sum(price_cents) filter (where status in ('canceled', 'no-show')), 0)::text affected_value
      from scheduling_appointments
      where organization_id = ${organizationId} and date between ${filters.from} and ${filters.to}
        ${filters.unitId ? sql`and unit_id = ${filters.unitId}` : sql``}
        ${filters.professionalId ? sql`and professional_id = ${filters.professionalId}` : sql``}
        ${filters.serviceId ? sql`and service_id = ${filters.serviceId}` : sql``}
    `)
    const row = result.rows[0]
    const cancelled = Number(row?.cancelled ?? 0)
    const noShows = Number(row?.no_shows ?? 0)
    const denominator = Number(row?.denominator ?? 0)
    const typed = config.reportType === "cancellations_no_shows" ? config : null
    return [
      ...(typed?.includeCancelled === false
        ? []
        : ([["Cancelamentos", String(cancelled)]] as ReportRows)),
      ...(typed?.includeNoShows === false ? [] : ([["Ausências", String(noShows)]] as ReportRows)),
      ["Agendamentos no denominador", String(denominator)],
      ["Taxa de cancelamento (basis points)", String(rateBasisPoints(cancelled, denominator))],
      ["Taxa de ausência (basis points)", String(rateBasisPoints(noShows, denominator))],
      ["Valor afetado (centavos)", String(Number(row?.affected_value ?? 0))],
    ] as ReportRows
  }

  async function cashRows(
    organizationId: string,
    filters: ReportFiltersInput,
    config: ReportConfigSnapshot,
  ) {
    const includeReversals = config.reportType === "cash_payments" && config.includeReversals
    const result = await db.execute<{
      method: string
      receipts: string
      reversals: string
      gross: string
      reversed: string
      net: string
    }>(sql`
      select tender.method,
        count(*) filter (where receipt.status = 'active')::text receipts,
        count(*) filter (where receipt.status = 'reversed')::text reversals,
        coalesce(sum(tender.applied_cents) filter (where receipt.status = 'active'), 0)::text gross,
        coalesce(sum(tender.applied_cents) filter (where receipt.status = 'reversed'), 0)::text reversed,
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
      [`${paymentMethodLabel(row.method)} — recibos`, String(Number(row.receipts))],
      [`${paymentMethodLabel(row.method)} — recebido bruto (centavos)`, String(Number(row.gross))],
      [`${paymentMethodLabel(row.method)} — estornos`, String(Number(row.reversals))],
      [`${paymentMethodLabel(row.method)} — estornado (centavos)`, String(Number(row.reversed))],
      [`${paymentMethodLabel(row.method)} — líquido (centavos)`, String(Number(row.net))],
    ]) as ReportRows
  }

  return { summary, report }
}

function receiptPredicate(organizationId: string, filters: ReportFiltersInput): SQL {
  return sql`receipt.organization_id = ${organizationId}
    and receipt.local_date between ${filters.from} and ${filters.to}
    ${filters.unitId ? sql`and checkout.unit_id = ${filters.unitId}` : sql``}
    ${
      filters.professionalId || filters.serviceId
        ? sql`and exists (
      select 1 from revenue_receipt_lines filter_line
      where filter_line.organization_id = receipt.organization_id
        and filter_line.receipt_id = receipt.id
        ${filters.professionalId ? sql`and filter_line.snapshot->>'professionalId' = ${filters.professionalId}` : sql``}
        ${filters.serviceId ? sql`and filter_line.snapshot->>'serviceId' = ${filters.serviceId}` : sql``}
    )`
        : sql``
    }
    ${filters.paymentMethod ? sql`and exists (select 1 from revenue_receipt_tenders filter_tender where filter_tender.organization_id = receipt.organization_id and filter_tender.receipt_id = receipt.id and filter_tender.method = ${filters.paymentMethod})` : sql``}`
}

function linePredicate(filters: ReportFiltersInput, alias: "line"): SQL {
  return sql`${filters.professionalId ? sql`and ${sql.identifier(alias)}.snapshot->>'professionalId' = ${filters.professionalId}` : sql``}
    ${filters.serviceId ? sql`and ${sql.identifier(alias)}.snapshot->>'serviceId' = ${filters.serviceId}` : sql``}`
}

function filteredReceiptRevenue(filters: ReportFiltersInput): SQL {
  return sql`(select coalesce(sum(${allocatedLineAmount(filters, "net_cents", "metric_line")}), 0) from revenue_receipt_lines metric_line
    where metric_line.organization_id = receipt.organization_id and metric_line.receipt_id = receipt.id
      ${filters.professionalId ? sql`and metric_line.snapshot->>'professionalId' = ${filters.professionalId}` : sql``}
      ${filters.serviceId ? sql`and metric_line.snapshot->>'serviceId' = ${filters.serviceId}` : sql``})`
}

function allocatedLineAmount(
  filters: ReportFiltersInput,
  column: "gross_cents" | "net_cents",
  alias = "line",
): SQL {
  const line = sql.identifier(alias)
  const amount = sql`${line}.${sql.identifier(column)}`
  if (!filters.paymentMethod) return amount
  return sql`(
    select coalesce(max(case when ranked.method = ${filters.paymentMethod}
      then ranked.base_cents + case when ranked.allocation_rank <= ranked.leftover_cents then 1 else 0 end
      end), 0)
    from (
      select allocated.*,
        row_number() over (
          order by allocated.remainder desc,
            case allocated.method when 'pix' then 1 when 'cash' then 2 when 'debit' then 3 else 4 end
        ) allocation_rank,
        allocated.amount_cents - sum(allocated.base_cents) over () leftover_cents
      from (
        select tender.method, ${amount} amount_cents,
          floor((${amount}::numeric * tender.applied_cents) / nullif(receipt.total_cents, 0))::bigint base_cents,
          mod(${amount} * tender.applied_cents, nullif(receipt.total_cents, 0)) remainder
        from revenue_receipt_tenders tender
        where tender.organization_id = receipt.organization_id and tender.receipt_id = receipt.id
      ) allocated
    ) ranked
  )`
}

function commissionPredicate(filters: ReportFiltersInput, alias: "fact"): SQL {
  return sql`${filters.professionalId ? sql`and ${sql.identifier(alias)}.professional_id = ${filters.professionalId}` : sql``}
    ${filters.serviceId ? sql`and ${sql.identifier(alias)}.service_id = ${filters.serviceId}` : sql``}`
}

function paymentMethodLabel(method: string) {
  return { pix: "Pix", cash: "Dinheiro", debit: "Débito", credit: "Crédito" }[method] ?? method
}

function rateBasisPoints(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Math.round((numerator * 10_000) / denominator)
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export type ReportingService = ReturnType<typeof createReportingService>
