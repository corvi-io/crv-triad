import { describe, expect, it } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ScheduleConflictError } from "@/modules/scheduling/contracts"

describe("scheduling memory repository", () => {
  it("returns a bounded synthetic day and applies URL-facing filters", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay({
      date: "2026-07-19",
      professionalId: "professional-ana",
      scenarioId: "all-statuses",
      status: "scheduled",
    })
    expect(day.startTime).toBe("08:00")
    expect(day.endTime).toBe("18:00")
    expect(day.professionals.map(({ id }) => id)).toEqual(["professional-ana"])
    expect(
      day.appointments.every(
        ({ professionalId, status }) =>
          professionalId === "professional-ana" && status === "scheduled",
      ),
    ).toBe(true)
  })

  it("keeps scenarios deterministic and resettable", async () => {
    const repository = new SchedulingMemoryRepository()
    const before = await repository.getDay({ date: "2026-07-19", scenarioId: "normal" })
    await repository.cancel(before.appointments[0].id)
    await repository.reset()
    const after = await repository.getDay({ date: "2026-07-19", scenarioId: "normal" })
    expect(after.appointments).toEqual(before.appointments)
    expect(repository.scenarios().map(({ id }) => id)).toEqual([
      "normal",
      "empty",
      "all-statuses",
      "dense",
      "many-professionals",
      "long-content",
      "blocked",
      "walk-in",
      "conflict",
      "slow",
      "next-failure",
      "persistent-error",
    ])
  })

  it("rejects conflicts and insufficient space with recoverable messages", async () => {
    const repository = new SchedulingMemoryRepository()
    await repository.getDay({ date: "2026-07-19", scenarioId: "conflict" })
    await expect(
      repository.create({
        customerName: "Cliente Teste",
        customerPhone: "(81) 90000-0000",
        date: "2026-07-19",
        durationMinutes: 45,
        notes: "",
        origin: "reception",
        priceCents: 5500,
        professionalId: "professional-ana",
        serviceId: "service-cut",
        start: "10:15",
        status: "scheduled",
      }),
    ).rejects.toBeInstanceOf(ScheduleConflictError)
  })

  it.each([
    ["break", "normal", "professional-bruno", "12:00"],
    ["blocked", "normal", "professional-carla", "16:15"],
    ["scenario block", "blocked", "professional-ana", "09:15"],
  ])("rejects %s period overlaps", async (_label, scenarioId, professionalId, start) => {
    const repository = new SchedulingMemoryRepository()
    await repository.getDay({ date: "2026-07-19", scenarioId })

    await expect(
      repository.create({
        customerName: "Cliente Teste",
        customerPhone: "81900000000",
        date: "2026-07-19",
        durationMinutes: 45,
        notes: "",
        origin: "reception",
        priceCents: 5500,
        professionalId,
        serviceId: "service-cut",
        start,
        status: "scheduled",
      }),
    ).rejects.toThrow("coincide com uma pausa ou bloqueio")
  })

  it("rejects off-grid starts for direct create and update calls", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay({ date: "2026-07-19", scenarioId: "normal" })
    const offGrid = { ...day.appointments[0], start: "11:10" }

    await expect(repository.create(offGrid)).rejects.toThrow("15 em 15 minutos")
    await expect(repository.update(day.appointments[0].id, offGrid)).rejects.toThrow(
      "15 em 15 minutos",
    )
  })

  it("keeps the blocked scenario seed outside unavailable periods", async () => {
    const repository = new SchedulingMemoryRepository()
    const day = await repository.getDay({ date: "2026-07-19", scenarioId: "blocked" })

    expect(day.appointments).toEqual([
      expect.objectContaining({ professionalId: "professional-ana", start: "13:00" }),
    ])
  })

  it("rejects unavailable-period updates while keeping walk-in markers non-blocking", async () => {
    const repository = new SchedulingMemoryRepository()
    const normalDay = await repository.getDay({ date: "2026-07-19", scenarioId: "normal" })
    const existing = normalDay.appointments[0]
    const { id, ...input } = existing

    await expect(
      repository.update(id, {
        ...input,
        professionalId: "professional-bruno",
        start: "12:00",
      }),
    ).rejects.toThrow("coincide com uma pausa ou bloqueio")

    await repository.getDay({ date: "2026-07-19", scenarioId: "walk-in" })
    await expect(
      repository.create({
        ...input,
        start: "11:30",
      }),
    ).resolves.toMatchObject({ professionalId: "professional-ana", start: "11:30" })
  })

  it("fails once and then recovers in the next-failure scenario", async () => {
    const repository = new SchedulingMemoryRepository()
    await expect(
      repository.getDay({ date: "2026-07-19", scenarioId: "next-failure" }),
    ).rejects.toThrow("Intentional development failure")
    await expect(
      repository.getDay({ date: "2026-07-19", scenarioId: "next-failure" }),
    ).resolves.toMatchObject({ unitName: "Unidade sintética Centro" })
  })
})
