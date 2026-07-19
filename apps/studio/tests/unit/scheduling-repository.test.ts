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
