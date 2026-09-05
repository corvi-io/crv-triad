import { describe, expect, it } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import type { AvailabilityTimeBlock, SetupAvailability } from "@/modules/barbershop-setup/contracts"

describe("local availability adapter preserves data on rejected recurrence commands", () => {
  it.each<Partial<AvailabilityTimeBlock>>([
    { start: "invalid" },
    { end: "invalid" },
    { start: "18:00", end: "09:00" },
    { recurrenceStart: undefined },
    { recurrenceStart: undefined, occurrenceDate: "2026-02-30" },
    { recurrenceStart: undefined, occurrenceDate: "2026-09-08" },
    { recurrenceStart: undefined, occurrenceDate: "2026-09-07", recurrenceUntil: "2026-09-07" },
    { recurrenceStart: undefined, occurrenceDate: "2026-09-07", excludedDates: ["2026-09-07"] },
    { recurrenceStart: "2026-02-30" },
    { recurrenceUntil: "2026-02-30" },
    { recurrenceStart: "2026-09-07", recurrenceUntil: "2026-09-01" },
    { excludedDates: ["2026-09-07", "2026-09-07"] },
    { excludedDates: ["invalid"] },
    { recurrenceStart: "2026-09-07", excludedDates: ["2026-08-31"] },
    { recurrenceUntil: "2026-09-07", excludedDates: ["2026-09-14"] },
  ])("rejects invalid recurrence input %j without changing persisted periods", async (patch) => {
    const repository = new BarbershopSetupMemoryRepository()
    const query = {
      scenarioId: "single-unit",
      unitId: "unit-center",
      professionalId: "professional-alpha",
    }
    const before = await repository.getAvailability(query)
    const monday = before.records.find((item) => item.day === "monday")
    if (!monday) throw new Error("Missing fixture Monday")
    const period: AvailabilityTimeBlock = {
      id: "invalid-period",
      seriesId: "invalid-period",
      start: "09:00",
      end: "18:00",
      recurrenceStart: "2026-01-05",
      excludedDates: [],
      ...patch,
    }
    await expect(
      repository.updateAvailability({ ...monday, breaks: [], absences: [], periods: [period] }),
    ).rejects.toThrow()
    expect((await repository.getAvailability(query)).records).toEqual(before.records)
  })
  it.each(["missing-period", "duplicate-period"])("rejects %s atomically", async (variant) => {
    const repository = new BarbershopSetupMemoryRepository()
    const query = {
      scenarioId: "single-unit",
      unitId: "unit-center",
      professionalId: "professional-alpha",
    }
    const before = await repository.getAvailability(query)
    const monday = before.records.find((item) => item.day === "monday")
    if (!monday) throw new Error("Missing fixture Monday")
    const input: SetupAvailability = {
      ...monday,
      closed: false,
      periods: variant === "missing-period" ? [] : [monday.periods[0], monday.periods[0]],
    }
    await expect(repository.updateAvailability(input)).rejects.toThrow()
    expect((await repository.getAvailability(query)).records).toEqual(before.records)
  })
  it.each([
    { id: "unit-center" },
    { id: "another-day" },
    { professionalId: "unknown" },
    { unitId: "unknown" },
  ])("rejects invalid availability identity %j without partial writes", async (patch) => {
    const repository = new BarbershopSetupMemoryRepository()
    const query = {
      scenarioId: "single-unit",
      unitId: "unit-center",
      professionalId: "professional-alpha",
    }
    const before = await repository.getAvailability(query)
    const monday = before.records.find((item) => item.day === "monday")
    if (!monday) throw new Error("Missing Monday")
    await expect(repository.updateAvailability({ ...monday, ...patch })).rejects.toThrow()
    expect((await repository.getAvailability(query)).records).toEqual(before.records)
  })
  it("rejects empty batches and duplicate days before applying any update", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const query = {
      scenarioId: "single-unit",
      unitId: "unit-center",
      professionalId: "professional-alpha",
    }
    const before = await repository.getAvailability(query)
    const monday = before.records.find((item) => item.day === "monday")
    if (!monday) throw new Error("Missing Monday")
    await expect(repository.updateAvailabilityBatch({ records: [] })).rejects.toThrow(
      "Selecione pelo menos um dia",
    )
    await expect(
      repository.updateAvailabilityBatch({ records: [monday, { ...monday, id: "duplicate" }] }),
    ).rejects.toThrow("Cada dia")
    for (const target of [
      monday.id,
      "unknown",
      before.records.find((item) => item.day === "saturday")?.id ?? "unknown",
    ])
      await expect(
        repository.copyAvailabilityToWeekdays({ source: monday, targetIds: [target] }),
      ).rejects.toThrow()
    await expect(
      repository.copyAvailabilityToWeekdays({
        source: { ...monday, id: "unknown" },
        targetIds: [],
      }),
    ).rejects.toThrow("origem")
    expect((await repository.getAvailability(query)).records).toEqual(before.records)
  })
})
