import { describe, expect, it } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import type { AppointmentInput, ScheduleDayQuery } from "@/modules/scheduling/contracts"
import { ScheduleConflictError } from "@/modules/scheduling/contracts"
import { applyAppointmentReschedule } from "@/modules/scheduling/queries"

const SELECTED_AGENDA_DATE = "2026-07-22"

const query = (scenarioId = "normal", unitId: ScheduleDayQuery["unitId"] = "centro") => ({
  endDate: SELECTED_AGENDA_DATE,
  scenarioId,
  startDate: SELECTED_AGENDA_DATE,
  unitId,
})

const input = (overrides: Partial<AppointmentInput> = {}): AppointmentInput => ({
  clientId: "client-test",
  customerName: "Cliente Teste",
  customerPhone: "81900000000",
  date: SELECTED_AGENDA_DATE,
  durationMinutes: 35,
  notes: "",
  origin: "reception",
  paymentStatus: "pending",
  priceCents: 4500,
  professionalId: "professional-carlos",
  serviceId: "service-fade",
  start: "17:00",
  status: "confirmed",
  tags: [],
  unitId: "centro",
  ...overrides,
})

describe("scheduling memory repository", () => {
  it("returns the approved bounded fixture set and isolates units", async () => {
    const repository = new SchedulingMemoryRepository()
    const centro = await repository.getDay(query())
    const artesao = await repository.getDay(query("normal", "artesao"))

    expect(centro.appointments).toHaveLength(42)
    expect(centro.unitName).toBe("Centro")
    expect(centro.appointments.every(({ unitId }) => unitId === "centro")).toBe(true)
    expect(artesao.appointments).toEqual([])
  })

  it("keeps occupancy privacy-safe and excludes canceled/no-show", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay(query())

    expect(day.occupancies).toHaveLength(30)
    expect(day.occupancies[0]).toEqual(
      expect.objectContaining({ date: SELECTED_AGENDA_DATE, id: "kanban-01" }),
    )
    expect(day.occupancies[0]).not.toHaveProperty("customerName")
    expect(day.occupancies[0]).not.toHaveProperty("status")
  })

  it("projects data-bearing scenarios and occupancies onto the selected Agenda date", async () => {
    const repository = new SchedulingMemoryRepository()

    for (const [scenarioId, expectedCount] of [
      ["many-professionals", 42],
      ["all-statuses", 8],
    ] as const) {
      const day = await repository.getDay(query(scenarioId))
      expect(day.appointments).toHaveLength(expectedCount)
      expect(day.appointments.every(({ date }) => date === SELECTED_AGENDA_DATE)).toBe(true)
      expect(day.occupancies.every(({ date }) => date === SELECTED_AGENDA_DATE)).toBe(true)
    }

    const empty = await repository.getDay(query("empty"))
    expect(empty.appointments).toEqual([])
    expect(empty.occupancies).toEqual([])
  })

  it("keeps scenarios deterministic, resettable, and session-memory-only", async () => {
    const repository = new SchedulingMemoryRepository()
    const before = await repository.getDay(query())
    await repository.cancel(before.appointments[0].id, "client")
    await repository.reset()
    const after = await repository.getDay(query())

    expect(after.appointments).toEqual(before.appointments)
    expect(repository.scenarios().map(({ id }) => id)).toEqual([
      "normal",
      "empty",
      "empty-column",
      "filtered-empty",
      "all-statuses",
      "dense",
      "many-professionals",
      "long-content",
      "short-durations",
      "blocked",
      "walk-in",
      "conflict",
      "slow",
      "next-failure",
      "transition-rollback",
      "persistent-error",
    ])
  })

  it("requires cancellation and unpaid-completion decisions", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay(query())
    const pending = day.appointments.find(({ paymentStatus }) => paymentStatus === "pending")
    expect(pending).toBeDefined()
    if (!pending) return

    await expect(repository.transition({ id: pending.id, status: "canceled" })).rejects.toThrow(
      "Informe o motivo",
    )
    await expect(repository.transition({ id: pending.id, status: "completed" })).rejects.toThrow(
      "decisão de pagamento",
    )
    await expect(
      repository.transition({
        cancellationReason: "no-show",
        id: pending.id,
        status: "no-show",
      }),
    ).resolves.toMatchObject({ cancellationReason: "no-show", status: "no-show" })
  })

  it("updates status and payment atomically", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay(query())
    const candidate = day.appointments.find(({ status }) => status === "confirmed")
    expect(candidate).toBeDefined()
    if (!candidate) return

    await expect(
      repository.transition({ id: candidate.id, paymentStatus: "paid", status: "completed" }),
    ).resolves.toMatchObject({ paymentStatus: "paid", status: "completed" })
  })

  it("keeps generic edits status-neutral and reserves state changes for transitions", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay(query())
    const candidate = day.appointments.find(({ status }) => status === "confirmed")
    expect(candidate).toBeDefined()
    if (!candidate) return

    await expect(
      repository.update(candidate.id, { ...candidate, status: "completed" }),
    ).rejects.toThrow("Use a transição de status")
    await expect(
      repository.update(candidate.id, { ...candidate, paymentStatus: "paid" }),
    ).rejects.toThrow("Use a transição de status")
    await expect(
      repository.update(candidate.id, { ...candidate, notes: "Edição neutra a status." }),
    ).resolves.toMatchObject({
      notes: "Edição neutra a status.",
      paymentStatus: candidate.paymentStatus,
      status: candidate.status,
    })
  })

  it("reschedules start and professional without changing status and rebuilds occupancy atomically", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay(query())
    const candidate = day.appointments.find(({ id }) => id === "kanban-05")
    expect(candidate).toBeDefined()
    if (!candidate) return

    const optimistic = applyAppointmentReschedule(day, {
      appointment: candidate,
      professionalId: "professional-bruno",
      start: "14:00",
    })
    expect(optimistic.appointments.find(({ id }) => id === candidate.id)).toMatchObject({
      professionalId: "professional-bruno",
      start: "14:00",
      status: candidate.status,
    })
    expect(optimistic.occupancies.find(({ id }) => id === candidate.id)).toMatchObject({
      professionalId: "professional-bruno",
      start: "14:00",
    })

    await expect(
      repository.update(candidate.id, {
        ...candidate,
        professionalId: "professional-bruno",
        start: "14:00",
      }),
    ).resolves.toMatchObject({
      professionalId: "professional-bruno",
      start: "14:00",
      status: candidate.status,
    })
  })

  it("rejects terminal, ineligible, and out-of-hours allocation changes", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay(query())
    const terminal = day.appointments.find(({ status }) => status === "completed")
    const eligible = day.appointments.find(({ id }) => id === "kanban-05")
    expect(terminal).toBeDefined()
    expect(eligible).toBeDefined()
    if (!terminal || !eligible) return

    await expect(repository.update(terminal.id, { ...terminal, start: "14:00" })).rejects.toThrow(
      "finalizados não podem ser remarcados",
    )
    await expect(
      repository.update(eligible.id, {
        ...eligible,
        professionalId: "professional-inexistente",
        start: "14:00",
      }),
    ).rejects.toThrow("não está disponível para este serviço")
    await expect(repository.update(eligible.id, { ...eligible, start: "17:30" })).rejects.toThrow(
      "horário dentro do funcionamento",
    )
  })

  it("fails exactly the next transition in the rollback scenario", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay(query("transition-rollback"))

    await expect(
      repository.transition({ id: day.appointments[0].id, status: "waiting" }),
    ).rejects.toThrow("Intentional development failure")
    await expect(
      repository.transition({ id: day.appointments[0].id, status: "waiting" }),
    ).resolves.toMatchObject({ status: "waiting" })
  })

  it("isolates a delayed result from a later scenario selection", async () => {
    const repository = new SchedulingMemoryRepository()
    const slowRequest = repository.getDay(query("slow"))
    const empty = await repository.getDay(query("empty"))
    const slow = await slowRequest

    expect(empty.appointments).toEqual([])
    expect(slow.appointments).toHaveLength(42)
  })

  it("allows the default service to save an extra-professional slot", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay(query("many-professionals"))
    const service = day.services.find(({ id }) => id === "service-hair-beard")
    expect(service?.eligibleProfessionalIds).toContain("professional-extra-7")

    await expect(
      repository.create(
        input({
          durationMinutes: 45,
          priceCents: 6500,
          professionalId: "professional-extra-7",
          serviceId: "service-hair-beard",
        }),
      ),
    ).resolves.toMatchObject({ professionalId: "professional-extra-7", start: "17:00" })
  })

  it("rejects conflicts, unavailable periods, and off-grid starts", async () => {
    const repository = new SchedulingMemoryRepository()
    await repository.getDay(query("conflict"))
    await expect(repository.create(input({ start: "10:15" }))).rejects.toBeInstanceOf(
      ScheduleConflictError,
    )

    await repository.getDay(query("blocked"))
    await expect(
      repository.create(input({ professionalId: "professional-ana", start: "09:15" })),
    ).rejects.toThrow("coincide com uma pausa ou bloqueio")
    await expect(repository.create(input({ start: "11:10" }))).rejects.toThrow("15 em 15 minutos")
  })

  it("fails once and then recovers in the next-failure scenario", async () => {
    const repository = new SchedulingMemoryRepository()
    await expect(repository.getDay(query("next-failure"))).rejects.toThrow(
      "Intentional development failure",
    )
    await expect(repository.getDay(query("next-failure"))).resolves.toMatchObject({
      unitName: "Centro",
    })
  })

  it("keeps the persistent error active after date projection until the scenario changes", async () => {
    const repository = new SchedulingMemoryRepository()

    await expect(repository.getDay(query("persistent-error"))).rejects.toThrow(
      "Intentional development failure",
    )
    await expect(repository.getDay(query("persistent-error"))).rejects.toThrow(
      "Intentional development failure",
    )
    await expect(repository.getDay(query("normal"))).resolves.toMatchObject({
      appointments: expect.arrayContaining([
        expect.objectContaining({ date: SELECTED_AGENDA_DATE, id: "kanban-01" }),
      ]),
    })
  })
})
