import { describe, expect, it } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import type { ServiceDeskQuery } from "@/modules/service-desk/contracts"

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
})
