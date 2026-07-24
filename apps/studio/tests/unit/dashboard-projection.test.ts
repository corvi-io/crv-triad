import { describe, expect, it } from "vitest"

import { createSchedulingRepository } from "@/dev/scheduling/entry"
import type { Appointment, ScheduleDay } from "@/modules/scheduling/contracts"
import { deriveDashboard } from "@/modules/scheduling/dashboard-projection"
import {
  dashboardBounds,
  dashboardComparisonBounds,
  validateDashboardSearch,
} from "@/modules/scheduling/dashboard-search"

const date = "2026-07-23"
const previousDate = "2026-07-22"
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

  it("drops a syntactically safe professional outside the loaded allowlist", () => {
    expect(
      validateDashboardSearch(
        { professionalId: "professional-unknown" },
        date,
        ["normal"],
        professionals.map(({ id }) => id),
      ).professionalId,
    ).toBeUndefined()
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
    expect(dashboardComparisonBounds({ endDate: "2026-07-26", startDate: "2026-07-20" })).toEqual({
      endDate: "2026-07-19",
      startDate: "2026-07-13",
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

  it("uses paid-sale projections instead of appointment catalog prices", () => {
    const projected = deriveDashboard({
      bounds: { endDate: date, startDate: date },
      day,
      filters: { period: "today", unitId: "centro" },
      now: new Date(`${date}T11:00:00`),
      paidSales: [
        {
          appointmentId: "paid",
          completedAt: `${date}T10:00:00.000Z`,
          discountCents: 1_000,
          lineValues: [
            {
              professionalId: "professional-one",
              serviceId: "service-main",
              valueCents: 8_000,
            },
          ],
          payments: [
            { method: "pix", valueCents: 3_000 },
            { method: "debit", valueCents: 5_000 },
          ],
          totalCents: 8_000,
          unitId: "centro",
        },
      ],
      updatedAt: 0,
    })

    expect(projected.metrics[2].value).toBe("R$ 80,00")
    expect(projected.finance).toMatchObject({
      discounts: "R$ 10,00",
      paidValue: "R$ 80,00",
      paymentMethods: [
        { label: "Débito", value: "R$ 50,00" },
        { label: "Pix", value: "R$ 30,00" },
      ],
    })
    expect(projected.professionals[0].paidValue).toBe("R$ 80,00")
    expect(projected.services[0].paidValue).toBe("R$ 80,00")
  })

  it("excludes walk-in revenue outside the active professional filter", () => {
    const projected = deriveDashboard({
      bounds: { endDate: date, startDate: date },
      day: { ...day, appointments: [] },
      filters: {
        period: "today",
        professionalId: "professional-one",
        unitId: "centro",
      },
      now: new Date(`${date}T11:00:00`),
      paidSales: [
        {
          completedAt: `${date}T10:00:00.000Z`,
          discountCents: 500,
          lineValues: [
            {
              professionalId: "professional-two",
              serviceId: "service-main",
              valueCents: 8_000,
            },
          ],
          payments: [{ method: "pix", valueCents: 8_000 }],
          totalCents: 8_000,
          unitId: "centro",
        },
      ],
      updatedAt: 0,
    })

    expect(projected.metrics[1].value).toBe("0")
    expect(projected.metrics[2].value).toBe("R$ 0,00")
    expect(projected.finance).toMatchObject({
      discounts: undefined,
      paidValue: "R$ 0,00",
      paymentMethods: undefined,
    })
    expect(projected.professionals).toMatchObject([{ paidValue: "R$ 0,00" }])
    expect(projected.services).toEqual([])
  })

  it("compares KPIs with the bounded immediately preceding scheduling period", () => {
    const compared = deriveDashboard({
      bounds: { endDate: date, startDate: date },
      comparisonBounds: { endDate: previousDate, startDate: previousDate },
      day: {
        ...day,
        appointments: [
          ...appointments,
          appointment({
            date: previousDate,
            id: "previous-paid",
            paymentStatus: "paid",
            priceCents: 5_000,
            status: "completed",
          }),
          appointment({
            clientId: "client-previous",
            date: previousDate,
            id: "previous-confirmed",
            start: "11:00",
          }),
        ],
      },
      filters: { period: "today", unitId: "centro" },
      now: new Date(`${date}T11:00:00`),
      updatedAt: 0,
    })

    expect(compared.metrics.map(({ comparison }) => comparison)).toEqual([
      { amount: "+3", direction: "up", percentage: "+150%", periodLabel: "dia anterior" },
      { amount: "+1", direction: "up", percentage: "+100%", periodLabel: "dia anterior" },
      {
        amount: "+R$ 50,00",
        direction: "up",
        percentage: "+100%",
        periodLabel: "dia anterior",
      },
      {
        amount: "+R$ 50,00",
        direction: "up",
        percentage: "+100%",
        periodLabel: "dia anterior",
      },
      { amount: "+2 p.p.", direction: "up", percentage: "+18%", periodLabel: "dia anterior" },
    ])
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

  it("marks current professional state unavailable when the selected range excludes today", () => {
    const historical = deriveDashboard({
      bounds: { endDate: "2026-07-22", startDate: "2026-07-22" },
      day,
      filters: { period: "yesterday", unitId: "centro" },
      now: new Date(`${date}T11:00:00`),
      updatedAt: 0,
    })

    expect(historical.professionals.map(({ state }) => state)).toEqual([
      "Indisponível — período não inclui hoje",
      "Indisponível — período não inclui hoje",
    ])
  })

  it("does not present future or ended in-progress appointments as currently underway", () => {
    const temporalStates = deriveDashboard({
      bounds: { endDate: date, startDate: date },
      day: {
        ...day,
        appointments: [
          appointment({
            id: "future-in-progress",
            start: "11:00",
            status: "in-progress",
          }),
          appointment({
            durationMinutes: 60,
            id: "ended-in-progress",
            professionalId: "professional-two",
            start: "08:00",
            status: "in-progress",
          }),
        ],
      },
      filters: { period: "today", unitId: "centro" },
      now: new Date(`${date}T10:00:00`),
      updatedAt: 0,
    })

    expect(temporalStates.professionals.map(({ state }) => state)).toEqual([
      "Próximo às 11:00",
      "Disponível",
    ])
  })

  it("detects conflicts inside date and professional groups despite interleaved records", () => {
    const interleaved = deriveDashboard({
      bounds: { endDate: date, startDate: date },
      day: {
        ...day,
        appointments: [
          appointment({ durationMinutes: 120, id: "one-early", start: "09:00" }),
          appointment({
            durationMinutes: 15,
            id: "two-between",
            professionalId: "professional-two",
            start: "09:15",
          }),
          appointment({ durationMinutes: 15, id: "one-overlap", start: "09:30" }),
        ],
      },
      filters: { period: "today", unitId: "centro" },
      now: new Date(`${date}T12:00:00`),
      updatedAt: 0,
    })

    expect(interleaved.attention).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          appointmentId: "one-overlap",
          title: "Conflito de horário às 09:30",
        }),
      ]),
    )
  })

  it("caps operational collections and returns safe values for zero denominators", () => {
    const cappedServices = Array.from({ length: 7 }, (_, index) => ({
      ...services[0],
      id: `service-${index}`,
      name: `Serviço ${index}`,
    }))
    const capped = deriveDashboard({
      bounds: { endDate: date, startDate: date },
      day: {
        ...day,
        appointments: cappedServices.map((service, index) => {
          const startMinutes = 12 * 60 + index * 15
          return appointment({
            durationMinutes: 15,
            id: `waiting-${index}`,
            serviceId: service.id,
            start: `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`,
            status: "waiting",
          })
        }),
        services: cappedServices,
      },
      filters: { period: "today", unitId: "centro" },
      now: new Date(`${date}T11:00:00`),
      updatedAt: 0,
    })
    expect(capped.upcoming).toHaveLength(5)
    expect(capped.attention).toHaveLength(4)
    expect(capped.services).toHaveLength(5)

    const empty = deriveDashboard({
      bounds: { endDate: date, startDate: date },
      day: { ...day, appointments: [], endTime: "08:00", periods: [], startTime: "08:00" },
      filters: { period: "today", unitId: "centro" },
      now: new Date(`${date}T11:00:00`),
      updatedAt: 0,
    })
    expect(empty.metrics.map(({ value }) => value)).toEqual([
      "0",
      "0",
      "R$ 0,00",
      "Indisponível",
      "0%",
    ])
    expect(empty.metrics.every(({ comparison }) => comparison.amount === "Base indisponível")).toBe(
      true,
    )
    expect(empty.capacity).toMatchObject({
      availableMinutes: 0,
      bookedMinutes: 0,
      freeMinutes: 0,
    })
    expect(empty.cancellations.rate).toBe("0%")
  })
})

describe("scheduling source identity", () => {
  it("returns the same session-memory repository to Dashboard and Agenda composition", () => {
    expect(createSchedulingRepository()).toBe(createSchedulingRepository())
  })
})
