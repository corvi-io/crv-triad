import { describe, expect, it } from "vitest"

import { approvedBoardFixtures, SCHEDULING_FIXTURE_DATE } from "@/dev/scheduling/scenarios"
import {
  agendaColumns,
  columnForStatus,
  deriveAgendaResult,
  periodBounds,
  validateScheduleSearch,
} from "@/modules/scheduling/agenda"

const professionals = [
  { id: "professional-carlos", name: "Carlos Lima" },
  { id: "professional-bruno", name: "Bruno Rocha" },
  { id: "professional-ana", name: "Ana Clara" },
  { id: "professional-joao", name: "João Vitor" },
  { id: "professional-diego", name: "Diego Rodrigues" },
  { id: "professional-marcos", name: "Marcos Paulo" },
]
const services = [
  {
    durationMinutes: 45,
    eligibleProfessionalIds: professionals.map(({ id }) => id),
    id: "service-hair-beard",
    name: "Cabelo & Barba",
    priceCents: 6500,
  },
  {
    durationMinutes: 35,
    eligibleProfessionalIds: professionals.map(({ id }) => id),
    id: "service-fade",
    name: "Corte degradê",
    priceCents: 4500,
  },
]

describe("agenda derivation", () => {
  it("keeps transition status mapping while the primary board is organized by barber", () => {
    expect(agendaColumns.map(({ label }) => label)).toEqual([
      "Confirmados",
      "Check-in",
      "Em espera",
      "Em atendimento",
      "Finalizados",
      "Cancelados / No-show",
    ])
    expect(columnForStatus("canceled")).toBe("canceled-no-show")
    expect(columnForStatus("no-show")).toBe("canceled-no-show")
    expect(columnForStatus("scheduled")).toBeUndefined()
  })

  it("derives accent-insensitive search and status filtering from one result", () => {
    const target = approvedBoardFixtures.find(({ customerName }) => customerName === "João Paulo")
    expect(target).toBeDefined()
    if (!target) return

    const result = deriveAgendaResult(approvedBoardFixtures, professionals, services, {
      clientIds: [],
      endDate: SCHEDULING_FIXTURE_DATE,
      professionalIds: [],
      searchText: "Joao Paulo",
      serviceIds: [],
      startDate: SCHEDULING_FIXTURE_DATE,
      statusIds: [target.status],
      unitId: "centro",
    })

    expect(result.appointments).toEqual([target])
    expect(result.total).toBe(1)
    expect(result.totalValueCents).toBe(target.priceCents)
  })

  it("combines professional, client, service, status, date, and unit predicates", () => {
    const target = approvedBoardFixtures[1]
    const result = deriveAgendaResult(approvedBoardFixtures, professionals, services, {
      clientIds: [target.clientId],
      endDate: SCHEDULING_FIXTURE_DATE,
      professionalIds: [target.professionalId],
      searchText: "",
      serviceIds: [target.serviceId],
      startDate: SCHEDULING_FIXTURE_DATE,
      statusIds: [target.status],
      unitId: "centro",
    })
    expect(result.appointments).toEqual([target])
  })

  it("computes period bounds and defaults invalid URL state to the board", () => {
    expect(periodBounds("2026-07-21", "this-week")).toEqual({
      endDate: "2026-07-26",
      startDate: "2026-07-20",
    })
    expect(periodBounds("2026-07-21", "custom", "2026-07-22", "2026-07-25")).toEqual({
      endDate: "2026-07-25",
      startDate: "2026-07-22",
    })
    expect(
      validateScheduleSearch(
        {
          client: "Maria Silva",
          customStart: "2026-02-30",
          date: "2026-02-30",
          status: "invalid",
          unit: "invalid",
          view: "invalid",
        },
        "2026-07-21",
      ),
    ).toMatchObject({
      client: undefined,
      customStart: undefined,
      date: "2026-07-21",
      status: undefined,
      unit: "centro",
      view: "board",
    })
  })
})
