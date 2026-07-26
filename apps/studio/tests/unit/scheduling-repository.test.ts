import { describe, expect, it } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import type { AppointmentInput, ScheduleDayQuery } from "@/modules/scheduling/contracts"
import { ScheduleConflictError, ScheduleRangeError } from "@/modules/scheduling/contracts"
import { applyAppointmentReschedule } from "@/modules/scheduling/queries"
import { getScheduleRange } from "@/modules/scheduling/range"

const SELECTED_AGENDA_DATE = "2026-07-22"
const createRepository = () => new SchedulingMemoryRepository(SELECTED_AGENDA_DATE)

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
    const repository = createRepository()
    const centro = await repository.getRange(query())
    const artesao = await repository.getRange(query("normal", "artesao"))

    expect(centro.appointments).toHaveLength(42)
    expect(centro.unitName).toBe("Centro")
    expect(centro.appointments.every(({ unitId }) => unitId === "centro")).toBe(true)
    expect(artesao.appointments).toEqual([])
  })

  it("keeps occupancy privacy-safe and excludes canceled/no-show", async () => {
    const repository = createRepository()
    const day = await repository.getRange(query())

    expect(day.occupancies).toHaveLength(31)
    expect(day.occupancies[0]).toEqual(
      expect.objectContaining({ date: SELECTED_AGENDA_DATE, id: "kanban-01" }),
    )
    expect(day.occupancies[0]).not.toHaveProperty("customerName")
    expect(day.occupancies[0]).not.toHaveProperty("status")
  })

  it("rejects every repository interval except an exact day or seven days", async () => {
    const repository = createRepository()
    await expect(
      repository.getRange({
        ...query(),
        endDate: "2026-07-23",
        startDate: "2026-07-22",
      }),
    ).rejects.toBeInstanceOf(ScheduleRangeError)
    await expect(
      repository.getRange({
        ...query(),
        endDate: "2026-07-27",
        startDate: "2026-07-22",
      }),
    ).rejects.toThrow("intervalos exatos de um ou sete dias")
  })

  it("applies every appointment filter in the repository while retaining hidden occupancies", async () => {
    const repository = createRepository()
    const full = await repository.getRange(query())
    const seed = full.appointments[0]
    expect(seed).toBeDefined()
    if (!seed) return
    const filtered = await repository.getRange({
      ...query(),
      clientIds: [seed.clientId],
      professionalIds: [seed.professionalId],
      search: seed.customerName,
      serviceIds: [seed.serviceId],
      statusIds: [seed.status],
    })

    expect(filtered.appointments.length).toBeGreaterThan(0)
    expect(
      filtered.appointments.every(
        (appointment) =>
          appointment.clientId === seed.clientId &&
          appointment.professionalId === seed.professionalId &&
          appointment.serviceId === seed.serviceId &&
          appointment.status === seed.status &&
          appointment.customerName === seed.customerName,
      ),
    ).toBe(true)
    expect(filtered.professionals.map(({ id }) => id)).toEqual([seed.professionalId])
    expect(filtered.occupancies).toEqual(full.occupancies)
  })

  it("keeps the prior canonical day identical across Dashboard and subsequent Agenda reads", async () => {
    const repository = createRepository()
    const day = await getScheduleRange(repository, {
      endDate: SELECTED_AGENDA_DATE,
      focusDate: SELECTED_AGENDA_DATE,
      scenarioId: "normal",
      startDate: "2026-07-21",
      unitId: "centro",
    })
    const dashboardPriorIds = day.appointments
      .filter(({ date }) => date === "2026-07-21")
      .map(({ id }) => id)
      .toSorted()
    const agendaPrior = await repository.getRange({
      endDate: "2026-07-21",
      scenarioId: "normal",
      startDate: "2026-07-21",
      unitId: "centro",
    })
    const independentAgendaPrior = await createRepository().getRange({
      endDate: "2026-07-21",
      scenarioId: "normal",
      startDate: "2026-07-21",
      unitId: "centro",
    })
    const incorrectlyShiftedDay = await repository.getRange({
      endDate: "2026-07-20",
      scenarioId: "normal",
      startDate: "2026-07-20",
      unitId: "centro",
    })
    const currentAgain = await repository.getRange(query())

    expect(day.appointments.filter(({ date }) => date === SELECTED_AGENDA_DATE)).toHaveLength(42)
    expect(dashboardPriorIds).toHaveLength(30)
    expect(agendaPrior.appointments.map(({ id }) => id).toSorted()).toEqual(dashboardPriorIds)
    expect(independentAgendaPrior.appointments.map(({ id }) => id).toSorted()).toEqual(
      dashboardPriorIds,
    )
    expect(incorrectlyShiftedDay.appointments).toEqual([])
    expect(currentAgain.appointments).toHaveLength(42)
    expect(currentAgain.appointments.map(({ id }) => id).toSorted()).toEqual(
      day.appointments
        .filter(({ date }) => date === SELECTED_AGENDA_DATE)
        .map(({ id }) => id)
        .toSorted(),
    )
    expect(
      day.appointments.filter(
        ({ date, start }) => date === SELECTED_AGENDA_DATE && start === "16:00",
      ),
    ).toHaveLength(6)
  })

  it("projects data-bearing scenarios and occupancies onto the selected Agenda date", async () => {
    const repository = createRepository()

    for (const [scenarioId, expectedCount] of [
      ["many-professionals", 42],
      ["all-statuses", 8],
    ] as const) {
      const day = await repository.getRange(query(scenarioId))
      expect(day.appointments).toHaveLength(expectedCount)
      expect(day.appointments.every(({ date }) => date === SELECTED_AGENDA_DATE)).toBe(true)
      expect(day.occupancies.every(({ date }) => date === SELECTED_AGENDA_DATE)).toBe(true)
    }

    const empty = await repository.getRange(query("empty"))
    expect(empty.appointments).toEqual([])
    expect(empty.occupancies).toEqual([])
  })

  it("keeps scenarios deterministic, resettable, and session-memory-only", async () => {
    const repository = createRepository()
    const before = await repository.getRange(query())
    await repository.cancel(before.appointments[0].id, "client")
    await repository.reset()
    const after = await repository.getRange(query())

    expect(after.appointments).toEqual(before.appointments)
    expect(repository.scenarios().map(({ id }) => id)).toEqual([
      "normal",
      "typical-week",
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
    const repository = createRepository()
    const day = await repository.getRange(query())
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
    const repository = createRepository()
    const day = await repository.getRange(query())
    const candidate = day.appointments.find(({ status }) => status === "confirmed")
    expect(candidate).toBeDefined()
    if (!candidate) return

    await expect(
      repository.transition({ id: candidate.id, paymentStatus: "paid", status: "completed" }),
    ).resolves.toMatchObject({ paymentStatus: "paid", status: "completed" })
  })

  it("keeps generic edits status-neutral and reserves state changes for transitions", async () => {
    const repository = createRepository()
    const day = await repository.getRange(query())
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
    const repository = createRepository()
    const day = await repository.getRange(query())
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
    const repository = createRepository()
    const day = await repository.getRange(query())
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
    const repository = createRepository()
    const day = await repository.getRange(query("transition-rollback"))

    await expect(
      repository.transition({ id: day.appointments[0].id, status: "waiting" }),
    ).rejects.toThrow("Intentional development failure")
    await expect(
      repository.transition({ id: day.appointments[0].id, status: "waiting" }),
    ).resolves.toMatchObject({ status: "waiting" })
  })

  it("isolates a delayed result from a later scenario selection", async () => {
    const repository = createRepository()
    const slowRequest = repository.getRange(query("slow"))
    const empty = await repository.getRange(query("empty"))
    const slow = await slowRequest

    expect(empty.appointments).toEqual([])
    expect(slow.appointments).toHaveLength(42)
  })

  it("allows the default service to save an extra-professional slot", async () => {
    const repository = createRepository()
    const day = await repository.getRange(query("many-professionals"))
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
    const repository = createRepository()
    await repository.getRange(query("conflict"))
    await expect(repository.create(input({ start: "10:15" }))).rejects.toBeInstanceOf(
      ScheduleConflictError,
    )

    await repository.getRange(query("blocked"))
    await expect(
      repository.create(input({ professionalId: "professional-ana", start: "09:15" })),
    ).rejects.toThrow("coincide com uma pausa ou bloqueio")
    await expect(repository.create(input({ start: "11:10" }))).rejects.toThrow("15 em 15 minutos")
  })

  it("fails once and then recovers in the next-failure scenario", async () => {
    const repository = createRepository()
    await expect(repository.getRange(query("next-failure"))).rejects.toThrow(
      "Intentional development failure",
    )
    await expect(repository.getRange(query("next-failure"))).resolves.toMatchObject({
      unitName: "Centro",
    })
  })

  it("keeps the persistent error active after scenario projection until the scenario changes", async () => {
    const repository = createRepository()

    await expect(repository.getRange(query("persistent-error"))).rejects.toThrow(
      "Intentional development failure",
    )
    await expect(repository.getRange(query("persistent-error"))).rejects.toThrow(
      "Intentional development failure",
    )
    await expect(repository.getRange(query("normal"))).resolves.toMatchObject({
      appointments: expect.arrayContaining([
        expect.objectContaining({ date: SELECTED_AGENDA_DATE, id: "kanban-01" }),
      ]),
    })
  })
})
