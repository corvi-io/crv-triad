import { describe, expect, it, vi } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import type { ServiceDeskQuery } from "@/modules/service-desk/contracts"
import { ServiceSessionNotFoundError } from "@/modules/service-desk/contracts"

const anchor = new Date("2026-07-23T11:30:00-03:00")
const clock = { now: () => new Date(anchor) }
const query = (overrides: Partial<ServiceDeskQuery> = {}): ServiceDeskQuery => ({
  preference: "all",
  priority: "all",
  professionalId: "all",
  scenarioId: "typical",
  search: "",
  stage: "all",
  unitId: "centro",
  ...overrides,
})

function createRepository() {
  const scheduling = new SchedulingMemoryRepository("2026-07-23")
  return { repository: new ServiceDeskMemoryRepository(scheduling, clock), scheduling }
}

describe("service desk memory repository", () => {
  it("owns the service session lifecycle through ready for payment", async () => {
    const { repository, scheduling } = createRepository()
    const snapshot = await repository.getQueue(query())
    const entry = snapshot.entries.find(
      (candidate) => candidate.source === "scheduled" && candidate.stage === "waiting",
    )
    if (!entry?.appointmentId) throw new Error("Expected a scheduled fixture.")
    await repository.call(entry.id)
    const started = await repository.start({ entryId: entry.id })
    if (!started.sessionId) throw new Error("Expected a service session.")
    const initial = await repository.getSession(started.sessionId)
    expect(initial.items).toHaveLength(1)
    expect(initial.items[0]).toMatchObject({
      professionalId: entry.professionalId,
      source: "initial",
    })
    const added = await repository.addServiceItem({
      operationId: "add-lifecycle",
      professionalId: "professional-bruno",
      serviceId: "service-fade",
      sessionId: initial.id,
    })
    expect(added.items).toHaveLength(2)
    await expect(
      repository.removeServiceItem({
        itemId: initial.items[0].id,
        operationId: "remove-initial",
        sessionId: initial.id,
      }),
    ).rejects.toThrow("inicial")
    await repository.assignServiceItemProfessional({
      itemId: added.items[1].id,
      operationId: "assign-lifecycle",
      professionalId: "professional-ana",
      sessionId: initial.id,
    })
    expect(
      (
        await repository.updateSessionNotes({
          notes: "  Registro operacional.  ",
          operationId: "notes-lifecycle",
          sessionId: initial.id,
        })
      ).notes,
    ).toBe("Registro operacional.")
    const finishInput = { operationId: "finish-lifecycle", sessionId: initial.id }
    const finished = await repository.finishSession(finishInput)
    expect(finished.status).toBe("ready-for-payment")
    expect((await repository.finishSession(finishInput)).status).toBe("ready-for-payment")
    const day = await scheduling.getDay({
      endDate: "2026-07-23",
      startDate: "2026-07-23",
      unitId: "centro",
    })
    expect(day.appointments.find(({ id }) => id === entry.appointmentId)?.status).toBe(
      "in-progress",
    )
  })

  it("reconstructs a deterministic service-session fixture after reload", async () => {
    const { repository } = createRepository()
    const session = await repository.getSession("session-walk-in-fulfillment-ready")
    expect(session).toMatchObject({
      id: "session-walk-in-fulfillment-ready",
      status: "ready-for-payment",
    })
  })

  it("deduplicates exact mutation retries at the memory boundary", async () => {
    const { repository } = createRepository()
    const initial = await repository.getSession("session-walk-in-fulfillment-single")
    const addInput = {
      operationId: "retry-add",
      professionalId: "professional-ana",
      serviceId: "service-fade",
      sessionId: initial.id,
    }
    expect((await repository.addServiceItem(addInput)).items).toHaveLength(2)
    const added = await repository.addServiceItem(addInput)
    expect(added.items).toHaveLength(2)

    const addedItem = added.items[1]
    const assignInput = {
      itemId: addedItem.id,
      operationId: "retry-assign",
      professionalId: "professional-bruno",
      sessionId: initial.id,
    }
    expect((await repository.assignServiceItemProfessional(assignInput)).items[1]).toMatchObject({
      professionalId: "professional-bruno",
    })
    expect((await repository.assignServiceItemProfessional(assignInput)).items[1]).toMatchObject({
      professionalId: "professional-bruno",
    })

    const notesInput = {
      notes: "Registro sem dados pessoais.",
      operationId: "retry-notes",
      sessionId: initial.id,
    }
    expect((await repository.updateSessionNotes(notesInput)).notes).toBe(notesInput.notes)
    expect((await repository.updateSessionNotes(notesInput)).notes).toBe(notesInput.notes)

    const removeInput = {
      itemId: addedItem.id,
      operationId: "retry-remove",
      sessionId: initial.id,
    }
    expect((await repository.removeServiceItem(removeInput)).items).toHaveLength(1)
    expect((await repository.removeServiceItem(removeInput)).items).toHaveLength(1)

    const finishInput = { operationId: "retry-finish", sessionId: initial.id }
    expect((await repository.finishSession(finishInput)).status).toBe("ready-for-payment")
    expect((await repository.finishSession(finishInput)).status).toBe("ready-for-payment")
  })

  it("rejects a regressed source clock before every session mutation and preserves snapshots", async () => {
    const cases = [
      {
        name: "add",
        mutate: (repository: ServiceDeskMemoryRepository, sessionId: string, _itemId: string) =>
          repository.addServiceItem({
            operationId: "clock-add",
            professionalId: "professional-ana",
            serviceId: "service-fade",
            sessionId,
          }),
      },
      {
        name: "remove",
        mutate: (repository: ServiceDeskMemoryRepository, sessionId: string, itemId: string) =>
          repository.removeServiceItem({ itemId, operationId: "clock-remove", sessionId }),
      },
      {
        name: "assign",
        mutate: (repository: ServiceDeskMemoryRepository, sessionId: string, itemId: string) =>
          repository.assignServiceItemProfessional({
            itemId,
            operationId: "clock-assign",
            professionalId: "professional-bruno",
            sessionId,
          }),
      },
      {
        name: "notes",
        mutate: (repository: ServiceDeskMemoryRepository, sessionId: string, _itemId: string) =>
          repository.updateSessionNotes({
            notes: "Não deve persistir.",
            operationId: "clock-notes",
            sessionId,
          }),
      },
      {
        name: "finish",
        mutate: (repository: ServiceDeskMemoryRepository, sessionId: string, _itemId: string) =>
          repository.finishSession({ operationId: "clock-finish", sessionId }),
      },
    ]

    for (const candidate of cases) {
      let sourceNow = new Date(anchor)
      const scheduling = new SchedulingMemoryRepository("2026-07-23")
      const repository = new ServiceDeskMemoryRepository(scheduling, {
        now: () => new Date(sourceNow),
      })
      const before = await repository.getSession("session-walk-in-fulfillment-multiple")
      const itemId = before.items[1].id
      sourceNow = new Date("2026-07-23T10:30:00-03:00")
      await expect(candidate.mutate(repository, before.id, itemId), candidate.name).rejects.toThrow(
        "relógio de origem",
      )
      sourceNow = new Date(anchor)
      expect(await repository.getSession(before.id), candidate.name).toEqual(before)
    }
  })

  it("uses a distinct missing-session error", async () => {
    const { repository } = createRepository()
    await expect(repository.getSession("session-missing")).rejects.toBeInstanceOf(
      ServiceSessionNotFoundError,
    )
  })

  it("shares the scheduled source and transitions the original appointment", async () => {
    const { repository, scheduling } = createRepository()
    const initial = await repository.getQueue(query())
    const scheduled = initial.entries.find(
      (entry) => entry.source === "scheduled" && entry.stage === "waiting",
    )
    if (!scheduled?.appointmentId) throw new Error("Expected one scheduled waiting entry.")
    const called = await repository.call(scheduled.id)
    expect(called.stage).toBe("called")
    const started = await repository.start({ entryId: scheduled.id })
    expect(started.stage).toBe("in-service")
    expect((await repository.start({ entryId: scheduled.id })).stage).toBe("in-service")
    const day = await scheduling.getDay({
      endDate: "2026-07-23",
      startDate: "2026-07-23",
      unitId: "centro",
    })
    expect(day.appointments.find(({ id }) => id === scheduled?.appointmentId)?.status).toBe(
      "in-progress",
    )
  })

  it("keeps walk-ins out of Agenda and requires a human assignment", async () => {
    const { repository, scheduling } = createRepository()
    const before = await scheduling.getDay({
      endDate: "2026-07-23",
      startDate: "2026-07-23",
      unitId: "centro",
    })
    await repository.getQueue(query())
    const created = await repository.addWalkIn({
      arrivalAt: anchor.toISOString(),
      customerName: "Pessoa Temporária",
      preferenceKind: "first-available",
      priority: "normal",
      serviceId: "service-simple-cut",
      unitId: "centro",
    })
    await repository.call(created.id)
    await expect(repository.start({ entryId: created.id })).rejects.toThrow(
      "Escolha o profissional",
    )
    const started = await repository.start({
      entryId: created.id,
      professionalId: "professional-ana",
    })
    expect(started).toMatchObject({
      assignedProfessionalId: "professional-ana",
      source: "walk-in",
      stage: "in-service",
    })
    const after = await scheduling.getDay({
      endDate: "2026-07-23",
      startDate: "2026-07-23",
      unitId: "centro",
    })
    expect(after.appointments.map(({ id }) => id)).toEqual(before.appointments.map(({ id }) => id))
  })

  it("rejects unavailable professionals atomically and allows recovery", async () => {
    const { repository } = createRepository()
    const snapshot = await repository.getQueue(query({ scenarioId: "unavailable-professional" }))
    const entry = snapshot.entries.find(({ id }) => id === "walk-in-unavailable")
    if (!entry) throw new Error("Expected the unavailable-professional fixture.")
    await expect(repository.start({ entryId: entry.id })).rejects.toThrow("não está disponível")
    const unchanged = await repository.getQueue(query({ scenarioId: "unavailable-professional" }))
    expect(unchanged.entries.find(({ id }) => id === entry.id)?.stage).toBe("called")
  })

  it("fails the next operation before writes and resets deterministic records", async () => {
    const { repository } = createRepository()
    await expect(repository.getQueue(query({ scenarioId: "next-failure" }))).rejects.toThrow()
    const recovered = await repository.getQueue(query({ scenarioId: "next-failure" }))
    const originalIds = recovered.entries.map(({ id }) => id)
    const walkIn = recovered.entries.find(({ source }) => source === "walk-in")
    if (!walkIn) throw new Error("Expected one walk-in fixture.")
    await repository.call(walkIn.id)
    await repository.reset()
    const reset = await repository
      .getQueue(query({ scenarioId: "next-failure" }))
      .catch(() => repository.getQueue(query({ scenarioId: "next-failure" })))
    expect(reset.entries.map(({ id }) => id)).toEqual(originalIds)
  })

  it("keeps persistent errors stable without returning false empty data", async () => {
    const { repository } = createRepository()
    await expect(repository.getQueue(query({ scenarioId: "persistent-error" }))).rejects.toThrow()
    await expect(repository.getQueue(query({ scenarioId: "persistent-error" }))).rejects.toThrow()
  })

  it("discards a delayed read after the scenario generation changes", async () => {
    const { repository } = createRepository()
    const delayed = repository.getQueue(query({ scenarioId: "slow" }))
    const current = await repository.getQueue(query({ scenarioId: "typical" }))
    expect(current.entries.length).toBeGreaterThan(0)
    await expect(delayed).rejects.toThrow("A fila mudou durante a operação")
  })

  it("makes repeated call and start commands idempotent", async () => {
    const { repository } = createRepository()
    const snapshot = await repository.getQueue(query({ scenarioId: "first-available" }))
    const entry = snapshot.entries.find(({ id }) => id === "walk-in-first-available")
    if (!entry) throw new Error("Expected the first-available fixture.")
    expect((await repository.call(entry.id)).stage).toBe("called")
    expect((await repository.call(entry.id)).stage).toBe("called")
    const input = { entryId: entry.id, professionalId: "professional-ana" }
    expect((await repository.start(input)).stage).toBe("in-service")
    expect((await repository.start(input)).stage).toBe("in-service")
  })

  it("rolls back a scheduled start invalidated by reset before it can affect the next generation", async () => {
    const { repository, scheduling } = createRepository()
    const snapshot = await repository.getQueue(query())
    const entry = snapshot.entries.find(
      (candidate) => candidate.source === "scheduled" && candidate.stage === "waiting",
    )
    if (!entry?.appointmentId) throw new Error("Expected one scheduled waiting entry.")
    await repository.call(entry.id)

    const originalTransition = scheduling.transition.bind(scheduling)
    let releaseTransition = () => {}
    let markTransitionStarted = () => {}
    const transitionStarted = new Promise<void>((resolve) => {
      markTransitionStarted = resolve
    })
    const transitionGate = new Promise<void>((resolve) => {
      releaseTransition = resolve
    })
    vi.spyOn(scheduling, "transition").mockImplementation(async (input) => {
      markTransitionStarted()
      await transitionGate
      return originalTransition(input)
    })

    const staleStart = repository.start({ entryId: entry.id })
    await transitionStarted
    const reset = repository.reset()
    releaseTransition()
    await expect(staleStart).rejects.toThrow("A fila mudou durante a operação")
    await reset

    const day = await scheduling.getDay({
      endDate: "2026-07-23",
      startDate: "2026-07-23",
      unitId: "centro",
    })
    expect(day.appointments.find(({ id }) => id === entry.appointmentId)?.status).toBe("arrived")
  })
})
