import { describe, expect, it } from "vitest"
import type { ReportingFactSnapshot } from "@/modules/reporting/contracts"
import { currentMonth, inclusiveDays, normalizeReportSearch } from "@/modules/reporting/filters"
import { deriveReportingResult } from "@/modules/reporting/projection"

const filters = { from: "2026-07-01", to: "2026-07-31" }
const facts: ReportingFactSnapshot[] = [
  appointment("appointment-completed", "completed"),
  appointment("appointment-canceled", "canceled"),
  appointment("appointment-no-show", "no-show"),
  sale("sale-a-line-a", "sale-a", "2026-07-05", "customer-returning", 6500, 2600),
  sale("sale-b-line-a", "sale-b", "2026-07-08", undefined, 3500, 1400),
  sale("prior-sale", "prior-sale", "2026-06-10", "customer-returning", 3500, 1400),
]

describe("reporting filters", () => {
  it("defaults to the injected source month and rejects invalid or overlong periods", () => {
    expect(currentMonth("2026-07-24")).toEqual({ from: "2026-07-01", to: "2026-07-31" })
    expect(inclusiveDays("2025-07-24", "2026-07-24")).toBe(366)
    expect(
      normalizeReportSearch(
        {
          from: "2025-07-23",
          paymentMethod: "crypto",
          professional: "../private",
          scenario: "not-real",
          to: "2026-07-24",
        },
        "2026-07-24",
      ),
    ).toEqual({
      from: "2026-07-01",
      paymentMethod: undefined,
      professional: undefined,
      scenario: "typical",
      service: undefined,
      to: "2026-07-31",
    })
  })
})

describe("reporting projection", () => {
  it("reconciles exact cents, commissions, rates, and customer identity limitations", () => {
    const result = deriveReportingResult({ facts, filters, sourceDate: "2026-07-24" })

    expect(result.summary).toEqual({
      paidSaleCount: 2,
      performedServiceCount: 2,
      totalCommissionCents: 4000,
      totalRevenueCents: 10000,
    })
    expect(result.averageTicket.ticketCents).toBe(5000)
    expect(result.cancellations).toEqual({
      cancellationCount: 1,
      cancellationRateBasisPoints: 3333,
      denominator: 3,
      noShowCount: 1,
      noShowRateBasisPoints: 3333,
    })
    expect(result.customers).toMatchObject({
      identifiableCount: 1,
      newCount: 0,
      returningCount: 1,
      unknownCount: 1,
    })
    expect(result.customers.returningRateBasisPoints).toBe(10000)
  })

  it("applies every filter at the repository projection boundary and stays zero-safe", () => {
    const result = deriveReportingResult({
      facts,
      filters: { ...filters, paymentMethod: "cash", professionalId: "professional-bruno" },
      sourceDate: "2026-07-24",
    })

    expect(result.summary.totalRevenueCents).toBe(0)
    expect(result.averageTicket.ticketCents).toBeNull()
    expect(result.cancellations.denominator).toBe(0)
  })

  it("uses deterministic ranking tie breaks", () => {
    const tied = [
      sale("line-z", "sale-z", "2026-07-05", "z", 3500, 1000, "service-z", "Barba"),
      sale("line-a", "sale-a", "2026-07-06", "a", 3500, 1000, "service-a", "Acabamento"),
    ]
    const result = deriveReportingResult({ facts: tied, filters, sourceDate: "2026-07-24" })
    expect(result.topServices.items.map(({ id }) => id)).toEqual(["service-a", "service-z"])
  })

  it("marks every paid sale unknown when customer identity is unavailable", () => {
    const result = deriveReportingResult({
      customerDataAvailable: false,
      facts,
      filters,
      sourceDate: "2026-07-24",
    })

    expect(result.customers).toMatchObject({
      identifiableCount: 0,
      newCount: 0,
      returningCount: 0,
      unknownCount: 2,
      unavailableReason: "A fonte de identidade está indisponível para este cenário.",
    })
  })
})

function appointment(id: string, status: ReportingFactSnapshot["appointmentStatus"]) {
  return {
    appointmentStatus: status,
    commissionCents: 0,
    commissionRateBasisPoints: 0,
    customerAnalysisKey: id,
    date: "2026-07-05",
    id,
    professionalId: "professional-ana",
    professionalName: "Ana",
    serviceId: "service-cut",
    serviceName: "Corte",
    serviceNetCents: 0,
  } satisfies ReportingFactSnapshot
}

function sale(
  id: string,
  saleId: string,
  date: string,
  customerAnalysisKey: string | undefined,
  serviceNetCents: number,
  commissionCents: number,
  serviceId = "service-cut",
  serviceName = "Corte",
) {
  return {
    appointmentStatus: "completed",
    commissionCents,
    commissionRateBasisPoints: 4000,
    customerAnalysisKey,
    date,
    id,
    paymentMethod: "pix",
    professionalId: "professional-ana",
    professionalName: "Ana",
    saleId,
    serviceId,
    serviceName,
    serviceNetCents,
  } satisfies ReportingFactSnapshot
}
