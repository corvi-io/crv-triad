import { describe, expect, it } from "vitest"
import { approvedKanbanFixtures, SCHEDULING_FIXTURE_DATE } from "@/dev/scheduling/scenarios"
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
]
const services = [
  {
    durationMinutes: 45,
    eligibleProfessionalIds: professionals.map(({ id }) => id),
    id: "service-hair-beard",
    name: "Cabelo & Barba",
    priceCents: 6500,
  },
]

describe("agenda derivation", () => {
  it("keeps the approved column order and distinct terminal statuses", () => {
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

  it("derives cards, counts, summary, and accent-insensitive search from one result", () => {
    const result = deriveAgendaResult(approvedKanbanFixtures, professionals, services, {
      clientIds: [],
      endDate: SCHEDULING_FIXTURE_DATE,
      professionalIds: [],
      searchText: "Joao",
      serviceIds: [],
      startDate: SCHEDULING_FIXTURE_DATE,
      unitId: "centro",
    })

    expect(result.appointments.map(({ customerName }) => customerName)).toEqual(["João Vitor"])
    expect(result.boardAppointments).toHaveLength(1)
    expect(result.counts.confirmed).toBe(1)
    expect(result.total).toBe(1)
    expect(result.totalValueCents).toBe(6500)
  })

  it("combines professional, client, service, date, and unit predicates", () => {
    const target = approvedKanbanFixtures[1]
    const result = deriveAgendaResult(approvedKanbanFixtures, professionals, services, {
      clientIds: [target.clientId],
      endDate: SCHEDULING_FIXTURE_DATE,
      professionalIds: [target.professionalId],
      searchText: "",
      serviceIds: [target.serviceId],
      startDate: SCHEDULING_FIXTURE_DATE,
      unitId: "centro",
    })
    expect(result.appointments).toEqual([target])
  })

  it("computes deterministic period bounds and validates non-sensitive URL state", () => {
    expect(periodBounds("2026-07-21", "this-week")).toEqual({
      endDate: "2026-07-26",
      startDate: "2026-07-20",
    })
    expect(periodBounds("2026-07-21", "custom", "2026-07-25", "2026-07-22")).toEqual({
      endDate: "2026-07-21",
      startDate: "2026-07-21",
    })
    expect(
      validateScheduleSearch(
        {
          client: "Maria Silva",
          customStart: "2026-02-30",
          date: "2026-02-30",
          unit: "invalid",
          view: "invalid",
        },
        "2026-07-21",
      ),
    ).toMatchObject({
      client: undefined,
      customStart: undefined,
      date: "2026-07-21",
      unit: "centro",
      view: "kanban",
    })
  })
})
