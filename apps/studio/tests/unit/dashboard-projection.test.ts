import { describe, expect, it } from "vitest"

import { createSchedulingRepository } from "@/dev/scheduling/entry"
import type { Appointment, ScheduleDay } from "@/modules/scheduling/contracts"
import { deriveDashboard } from "@/modules/scheduling/dashboard-projection"
import { dashboardBounds, validateDashboardSearch } from "@/modules/scheduling/dashboard-search"

const date = "2026-07-23"
const professionals = [
  { id: "professional-one", name: "Profissional Um" },
  { id: "professional-two", name: "Profissional Dois" },
]
const services = [
  {
    durationMinutes: 60,
    eligibleProfessionalIds: professionals.map(({ id }) => id),
    id: "service-main",
    name: "Serviço principal",
    priceCents: 10_000,
  },
]

function appointment(overrides: Partial<Appointment> & Pick<Appointment, "id">): Appointment {
  return {
    clientId: "client-one",
    customerName: "Cliente Sintético",
    customerPhone: "81900000000",
    date,
    durationMinutes: 60,
    notes: "",
    origin: "reception",
    paymentStatus: "pending",
    priceCents: 10_000,
    professionalId: "professional-one",
    serviceId: "service-main",
    start: "09:00",
    status: "confirmed",
    tags: [],
    unitId: "centro",
    ...overrides,
  }
}

const appointments: readonly Appointment[] = [
  appointment({
    id: "paid",
    paymentStatus: "paid",
    status: "completed",
  }),
  appointment({
    clientId: "client-two",
    durationMinutes: 30,
    id: "pending",
    priceCents: 5_000,
    start: "10:00",
    status: "completed",
  }),
  appointment({
    id: "upcoming",
    priceCents: 8_000,
    professionalId: "professional-two",
    start: "12:00",
  }),
  appointment({
    durationMinutes: 30,
    id: "canceled",
    priceCents: 4_000,
    professionalId: "professional-two",
    start: "13:00",
    status: "canceled",
  }),
  appointment({
    durationMinutes: 45,
    id: "no-show",
    priceCents: 6_000,
    professionalId: "professional-two",
    start: "14:00",
    status: "no-show",
  }),
]

const day: ScheduleDay = {
  appointments,
  date,
  endTime: "18:00",
  occupancies: [],
  periods: [
    {
      end: "12:00",
      id: "break-one",
      kind: "break",
      label: "Intervalo",
      professionalId: "professional-one",
      start: "11:00",
    },
  ],
  professionals,
  services,
  startTime: "08:00",
  unitName: "Centro",
}

describe("Dashboard search", () => {
  it("defaults unsafe state and bounds custom ranges to 31 inclusive days", () => {
    const search = validateDashboardSearch(
      {
        customEnd: "2026-09-30",
        customStart: date,
        period: "custom",
        professionalId: "Nome com PII",
        scenario: "unknown",
        unitId: "unknown",
      },
      date,
      ["normal"],
    )

    expect(search).toEqual({
      customEnd: "2026-08-22",
      customStart: date,
      date,
      period: "custom",
      professionalId: undefined,
      scenario: "normal",
      unitId: "centro",
    })
    expect(dashboardBounds(search)).toEqual({
      endDate: "2026-08-22",
      startDate: date,
    })
  })

  it("derives yesterday, week, and month bounds from the local date anchor", () => {
    expect(dashboardBounds(validateDashboardSearch({ period: "yesterday" }, date))).toEqual({
      endDate: "2026-07-22",
      startDate: "2026-07-22",
    })
    expect(dashboardBounds(validateDashboardSearch({ period: "this-week" }, date))).toEqual({
      endDate: "2026-07-26",
      startDate: "2026-07-20",
    })
    expect(dashboardBounds(validateDashboardSearch({ period: "this-month" }, date))).toEqual({
      endDate: "2026-07-31",
      startDate: "2026-07-01",
    })
  })
})

describe("Dashboard projection", () => {
  const model = deriveDashboard({
    bounds: { endDate: date, startDate: date },
    day,
    filters: { period: "today", unitId: "centro" },
    now: new Date(`${date}T11:00:00`),
    updatedAt: new Date(`${date}T11:00:00`).getTime(),
  })

  it("derives every supported KPI from the bounded scheduling records", () => {
    expect(model.metrics.map(({ value }) => value)).toEqual([
      "5",
      "2",
      "R$ 100,00",
      "R$ 100,00",
      "13%",
    ])
    expect(model.capacity).toMatchObject({
      availableMinutes: 1_140,
      bookedMinutes: 150,
      freeMinutes: 990,
    })
    expect(model.finance).toMatchObject({
      discounts: undefined,
      paidValue: "R$ 100,00",
      paymentMethods: undefined,
      pendingCompletedValue: "R$ 50,00",
      scheduledValue: "R$ 230,00",
    })
  })

  it("keeps cancellation and client labels factual", () => {
    expect(model.cancellations).toEqual({
      canceledCount: 1,
      noShowCount: 1,
      potentialValue: "R$ 100,00",
      rate: "40%",
    })
    expect(model.clients).toEqual({
      completedUniqueCount: 2,
      newClientCount: undefined,
      repeatedInPeriodCount: 1,
    })
  })

  it("orders and caps operational collections and computes professional availability", () => {
    expect(model.upcoming.map(({ id }) => id)).toEqual(["upcoming"])
    expect(model.attention.map(({ appointmentId }) => appointmentId)).toContain("pending")
    expect(model.professionals).toEqual([
      expect.objectContaining({
        availableMinutes: 540,
        bookedMinutes: 90,
        occupancyPercent: 17,
      }),
      expect.objectContaining({
        availableMinutes: 600,
        bookedMinutes: 60,
        occupancyPercent: 10,
      }),
    ])
    expect(model.services).toHaveLength(1)
    expect(model.services[0]).toMatchObject({ count: 5, paidValue: "R$ 100,00" })
  })

  it("drops a non-allowlisted professional filter instead of exposing a false empty result", () => {
    const filtered = deriveDashboard({
      bounds: { endDate: date, startDate: date },
      day,
      filters: {
        period: "today",
        professionalId: "professional-unknown",
        unitId: "centro",
      },
      now: new Date(`${date}T11:00:00`),
      updatedAt: 0,
    })

    expect(filtered.filters.professionalId).toBeUndefined()
    expect(filtered.metrics[0].value).toBe("5")
  })
})

describe("scheduling source identity", () => {
  it("returns the same session-memory repository to Dashboard and Agenda composition", () => {
    expect(createSchedulingRepository()).toBe(createSchedulingRepository())
  })
})
