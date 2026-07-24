import type { BasisPoints, MoneyCents } from "@/modules/revenue-operations/contracts"
import type {
  RankedMoneyItem,
  ReportFilters,
  ReportingFacets,
  ReportingFactSnapshot,
  ReportingResult,
} from "./contracts"

const MAX_RANKED_ITEMS = 8
const paymentLabels = {
  cash: "Dinheiro",
  credit: "Crédito",
  debit: "Débito",
  pix: "Pix",
} as const

export function deriveReportingResult({
  facts,
  filters,
  sourceDate,
  customerDataAvailable = true,
}: {
  customerDataAvailable?: boolean
  facts: readonly ReportingFactSnapshot[]
  filters: ReportFilters
  sourceDate: string
}): ReportingResult {
  const facets = deriveFacets(facts)
  const matchingFacts = facts.filter((fact) => matchesFilters(fact, filters))
  const scheduledFacts = matchingFacts.filter(({ saleId }) => !saleId)
  const paidFacts = matchingFacts.filter(
    ({ appointmentStatus, saleId }) => Boolean(saleId) && appointmentStatus === "completed",
  )
  const saleIds = new Set(paidFacts.map(({ saleId }) => saleId))
  const revenueTotal = sum(paidFacts.map(({ serviceNetCents }) => serviceNetCents))
  const commissionTotal = sum(paidFacts.map(({ commissionCents }) => commissionCents))
  const identifiableKeys = new Set(
    paidFacts.flatMap(({ customerAnalysisKey }) =>
      customerAnalysisKey ? [customerAnalysisKey] : [],
    ),
  )
  const unknownSaleIds = new Set(
    paidFacts.flatMap(({ customerAnalysisKey, saleId }) =>
      !customerAnalysisKey && saleId ? [saleId] : [],
    ),
  )
  const newKeys = new Set<string>()
  const returningKeys = new Set<string>()

  if (customerDataAvailable) {
    for (const key of identifiableKeys) {
      const firstVisit = facts
        .filter(
          (fact) =>
            fact.customerAnalysisKey === key &&
            Boolean(fact.saleId) &&
            fact.appointmentStatus === "completed",
        )
        .map(({ date }) => date)
        .sort()[0]
      if (firstVisit && firstVisit >= filters.from) newKeys.add(key)
      else returningKeys.add(key)
    }
  }

  const denominator = scheduledFacts.length
  const cancellations = scheduledFacts.filter(
    ({ appointmentStatus }) => appointmentStatus === "canceled",
  )
  const noShows = scheduledFacts.filter(({ appointmentStatus }) => appointmentStatus === "no-show")
  const revenueByDate = new Map<string, number>()
  for (const fact of paidFacts) {
    revenueByDate.set(fact.date, (revenueByDate.get(fact.date) ?? 0) + fact.serviceNetCents)
  }

  return {
    appliedFilters: filters,
    averageTicket: {
      paidSaleCount: saleIds.size,
      ticketCents: saleIds.size === 0 ? null : Math.round(revenueTotal / saleIds.size),
      totalRevenueCents: revenueTotal,
    },
    cancellations: {
      cancellationCount: cancellations.length,
      cancellationRateBasisPoints: rateBasisPoints(cancellations.length, denominator),
      denominator,
      noShowCount: noShows.length,
      noShowRateBasisPoints: rateBasisPoints(noShows.length, denominator),
    },
    commissions: {
      items: rankMoney(paidFacts, "professional"),
      totalCommissionCents: commissionTotal,
      totalServiceRevenueCents: revenueTotal,
    },
    customers: {
      identifiableCount: customerDataAvailable ? identifiableKeys.size : 0,
      newCount: customerDataAvailable ? newKeys.size : 0,
      newRateBasisPoints: customerDataAvailable
        ? rateBasisPoints(newKeys.size, identifiableKeys.size)
        : 0,
      returningCount: customerDataAvailable ? returningKeys.size : 0,
      returningRateBasisPoints: customerDataAvailable
        ? rateBasisPoints(returningKeys.size, identifiableKeys.size)
        : 0,
      unknownCount: customerDataAvailable ? unknownSaleIds.size : saleIds.size,
      unavailableReason: customerDataAvailable
        ? undefined
        : "A fonte de identidade está indisponível para este cenário.",
    },
    facets,
    professionalAttendance: {
      items: rankMoney(paidFacts, "professional"),
      unitLabel: "serviços realizados em vendas pagas",
    },
    revenue: {
      series: [...revenueByDate]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, valueCents]) => ({ date, valueCents })),
      totalCents: revenueTotal,
    },
    sourceDate,
    summary: {
      paidSaleCount: saleIds.size,
      performedServiceCount: paidFacts.length,
      totalCommissionCents: commissionTotal,
      totalRevenueCents: revenueTotal,
    },
    topServices: { items: rankMoney(paidFacts, "service") },
  }
}

function matchesFilters(fact: ReportingFactSnapshot, filters: ReportFilters) {
  return (
    fact.date >= filters.from &&
    fact.date <= filters.to &&
    (!filters.professionalId || fact.professionalId === filters.professionalId) &&
    (!filters.serviceId || fact.serviceId === filters.serviceId) &&
    (!filters.paymentMethod || fact.paymentMethod === filters.paymentMethod)
  )
}

function deriveFacets(facts: readonly ReportingFactSnapshot[]): ReportingFacets {
  return {
    paymentMethods: [
      ...new Set(facts.flatMap(({ paymentMethod }) => (paymentMethod ? [paymentMethod] : []))),
    ]
      .sort()
      .map((id) => ({ id, label: paymentLabels[id] })),
    professionals: uniqueFacets(
      facts.map(({ professionalId: id, professionalName: label }) => ({ id, label })),
    ),
    services: uniqueFacets(facts.map(({ serviceId: id, serviceName: label }) => ({ id, label }))),
  }
}

function uniqueFacets(values: readonly { id: string; label: string }[]) {
  return [...new Map(values.map((value) => [value.id, value])).values()].sort(
    (left, right) =>
      left.label.localeCompare(right.label, "pt-BR") || left.id.localeCompare(right.id),
  )
}

function rankMoney(
  facts: readonly ReportingFactSnapshot[],
  dimension: "professional" | "service",
): RankedMoneyItem[] {
  const items = new Map<string, RankedMoneyItem>()
  for (const fact of facts) {
    const id = dimension === "professional" ? fact.professionalId : fact.serviceId
    const label = dimension === "professional" ? fact.professionalName : fact.serviceName
    const current = items.get(id)
    items.set(id, {
      id,
      label,
      quantity: (current?.quantity ?? 0) + 1,
      valueCents:
        (current?.valueCents ?? 0) +
        (dimension === "professional" ? fact.commissionCents : fact.serviceNetCents),
    })
  }
  return [...items.values()]
    .sort(
      (left, right) =>
        right.quantity - left.quantity ||
        right.valueCents - left.valueCents ||
        left.label.localeCompare(right.label, "pt-BR") ||
        left.id.localeCompare(right.id),
    )
    .slice(0, MAX_RANKED_ITEMS)
}

function rateBasisPoints(numerator: number, denominator: number): BasisPoints {
  return denominator === 0 ? 0 : Math.round((numerator * 10_000) / denominator)
}

function sum(values: readonly MoneyCents[]) {
  return values.reduce((total, value) => total + value, 0)
}
