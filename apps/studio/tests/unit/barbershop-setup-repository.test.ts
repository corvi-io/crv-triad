import { describe, expect, it } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import { SimulatedMockFailure } from "@/dev/mock-engine"
import { SetupDependencyError, SetupValidationError } from "@/modules/barbershop-setup/contracts"

const listQuery = {
  kind: "unit" as const,
  page: 1,
  pageSize: 10 as const,
  scenarioId: "single-unit" as const,
  search: "",
  sort: { field: "name" as const, direction: "asc" as const },
  status: "all" as const,
}

describe("barbershop setup memory repository", () => {
  it("exposes every accepted deterministic scenario", () => {
    const repository = new BarbershopSetupMemoryRepository()
    expect(repository.scenarios().map(({ id }) => id)).toEqual([
      "new-business",
      "incomplete-setup",
      "single-unit",
      "multi-unit",
      "dense-catalogs",
      "availability-conflicts",
      "slow",
      "next-failure",
      "persistent-error",
    ])
  })

  it("isolates scenario changes and restores related records plus deterministic IDs", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("new-business")
    const first = await repository.create("unit", {
      address: "Rua Sintética, 10",
      businessHours: "Seg–Sex, 09:00–18:00",
      code: "SYN",
      name: "Unidade Sintética",
    })
    expect(first.id).toBe("unit-0001")
    expect((await repository.list({ ...listQuery, scenarioId: "new-business" })).totalCount).toBe(1)

    await repository.selectScenario("single-unit")
    expect((await repository.list(listQuery)).items.map(({ name }) => name)).not.toContain(
      "Unidade Sintética",
    )
    await repository.selectScenario("new-business")
    expect((await repository.list({ ...listQuery, scenarioId: "new-business" })).totalCount).toBe(0)

    const recreated = await repository.create("unit", {
      address: "Rua Sintética, 10",
      businessHours: "Seg–Sex, 09:00–18:00",
      code: "SYN",
      name: "Unidade Sintética",
    })
    expect(recreated.id).toBe(first.id)
    await repository.reset()
    expect((await repository.list({ ...listQuery, scenarioId: "new-business" })).totalCount).toBe(0)
  })

  it("blocks unsafe archive operations without orphaning relationships", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await expect(repository.setArchived("unit", "unit-center", true)).rejects.toBeInstanceOf(
      SetupDependencyError,
    )
    const page = await repository.list(listQuery)
    expect(page.items[0]).toMatchObject({ id: "unit-center", status: "active" })
  })

  it("fails exactly one mutation and then recovers", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("next-failure")
    await expect(
      repository.list({ ...listQuery, scenarioId: "next-failure" }),
    ).resolves.toMatchObject({
      totalCount: 1,
    })
    await expect(
      repository.update("unit", "unit-center", {
        address: "Avenida Sintética, 200",
        businessHours: "Seg–Sex, 09:00–18:00",
        code: "CTR",
        name: "Unidade Centro revisada",
      }),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
    await expect(
      repository.update("unit", "unit-center", {
        address: "Avenida Sintética, 200",
        businessHours: "Seg–Sex, 09:00–18:00",
        code: "CTR",
        name: "Unidade Centro revisada",
      }),
    ).resolves.toMatchObject({ name: "Unidade Centro revisada" })
  })

  it("keeps persistent load failure repeatable until scenario switch", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await expect(
      repository.list({ ...listQuery, scenarioId: "persistent-error" }),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
    await expect(
      repository.list({ ...listQuery, scenarioId: "persistent-error" }),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
    await repository.selectScenario("single-unit")
    await expect(repository.list(listQuery)).resolves.toMatchObject({ totalCount: 1 })
  })

  it("reports availability conflicts and rejects invalid ranges atomically", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const result = await repository.getAvailability({ scenarioId: "availability-conflicts" })
    expect(result.conflicts).toContain("Terça-feira: pausa fora do período de trabalho.")
    const monday = result.records.find(
      ({ day, professionalId }) => day === "monday" && professionalId === "professional-alpha",
    )
    expect(monday).toBeDefined()
    if (!monday) return
    await expect(
      repository.updateAvailability({
        ...monday,
        periods: [{ start: "18:00", end: "09:00" }],
      }),
    ).rejects.toBeInstanceOf(SetupValidationError)
    expect(
      (await repository.getAvailability({ scenarioId: "availability-conflicts" })).records.find(
        ({ id }) => id === monday.id,
      )?.periods,
    ).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "13:00", end: "18:00" },
    ])
  })

  it("uses distinct scenario query inputs so a slow result cannot replace the active result", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const slow = repository.getOverview("slow")
    await repository.selectScenario("multi-unit")
    const current = await repository.getOverview("multi-unit")
    await slow
    expect(current.items[0].description).toContain("2 unidade(s)")
    expect(repository.snapshot().scenarioId).toBe("multi-unit")
  })
})
