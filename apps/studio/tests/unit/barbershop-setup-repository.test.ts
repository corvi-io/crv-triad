import { describe, expect, it } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import { SimulatedMockFailure } from "@/dev/mock-engine"
import { projectAvailability } from "@/modules/barbershop-setup/availability-dates"
import type {
  BusinessHours,
  SetupAvailability,
  Weekday,
} from "@/modules/barbershop-setup/contracts"
import {
  SetupDependencyError,
  SetupOperationInvalidatedError,
  SetupValidationError,
} from "@/modules/barbershop-setup/contracts"

const standardBusinessHours: BusinessHours = {
  days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  start: "09:00",
  end: "18:00",
}

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
      businessHours: standardBusinessHours,
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
      businessHours: standardBusinessHours,
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

  it("synchronizes professional and service relationships on create and update", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const created = await repository.create("service", {
      category: "Apresentação",
      description: "Serviço sintético para testar vínculos.",
      durationMinutes: 30,
      name: "Serviço relacionado",
      priceCents: 4200,
      professionalIds: ["professional-alpha"],
      unitIds: ["unit-center"],
    })
    expect(created.kind).toBe("service")
    if (created.kind !== "service") return

    const professionals = await repository.list({
      ...listQuery,
      kind: "professional",
      pageSize: 20,
    })
    expect(professionals.items.find(({ id }) => id === "professional-alpha")).toMatchObject({
      serviceIds: expect.arrayContaining([created.id]),
    })

    await repository.update("service", created.id, {
      category: created.category,
      description: created.description,
      durationMinutes: created.durationMinutes,
      name: created.name,
      priceCents: created.priceCents,
      professionalIds: ["professional-bravo"],
      unitIds: created.unitIds,
    })
    const updatedProfessionals = await repository.list({
      ...listQuery,
      kind: "professional",
      pageSize: 20,
    })
    expect(updatedProfessionals.items.find(({ id }) => id === "professional-alpha")).toMatchObject({
      serviceIds: expect.not.arrayContaining([created.id]),
    })
    expect(updatedProfessionals.items.find(({ id }) => id === "professional-bravo")).toMatchObject({
      serviceIds: expect.arrayContaining([created.id]),
    })
    await expect(repository.setArchived("service", created.id, true)).rejects.toBeInstanceOf(
      SetupDependencyError,
    )
  })

  it("requires every selected service professional to serve a selected unit", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("multi-unit")
    const input = {
      category: "Apresentação",
      description: "Serviço sintético para testar elegibilidade por unidade.",
      durationMinutes: 30,
      name: "Serviço por unidade",
      priceCents: 4200,
      unitIds: ["unit-center"],
    }

    await expect(
      repository.create("service", {
        ...input,
        professionalIds: ["professional-bravo"],
      }),
    ).rejects.toThrow(
      "Selecione apenas profissionais que atendam a pelo menos uma unidade do serviço.",
    )

    const created = await repository.create("service", {
      ...input,
      professionalIds: ["professional-alpha"],
    })
    expect(created).toMatchObject({ professionalIds: ["professional-alpha"] })

    const bravo = (
      await repository.list({
        ...listQuery,
        kind: "professional",
        pageSize: 20,
        scenarioId: "multi-unit",
      })
    ).items.find(({ id }) => id === "professional-bravo")
    expect(bravo?.kind).toBe("professional")
    if (bravo?.kind !== "professional") return
    await expect(
      repository.update("professional", bravo.id, {
        accountAccess: bravo.accountAccess,
        name: bravo.name,
        role: bravo.role,
        serviceIds: [...bravo.serviceIds, created.id],
        unitIds: bravo.unitIds,
      }),
    ).rejects.toThrow(
      "Selecione apenas serviços disponíveis em pelo menos uma unidade do profissional.",
    )
  })

  it("keeps relationship rollback and reset coherent", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("next-failure")
    const service = (
      await repository.list({ ...listQuery, kind: "service", scenarioId: "next-failure" })
    ).items.find(({ id }) => id === "service-classic")
    expect(service?.kind).toBe("service")
    if (service?.kind !== "service") return

    await expect(
      repository.update("service", service.id, {
        category: service.category,
        description: service.description,
        durationMinutes: service.durationMinutes,
        name: service.name,
        priceCents: service.priceCents,
        professionalIds: ["professional-alpha"],
        unitIds: service.unitIds,
      }),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
    expect(
      (
        await repository.list({
          ...listQuery,
          kind: "professional",
          pageSize: 20,
          scenarioId: "next-failure",
        })
      ).items.find(({ id }) => id === "professional-bravo"),
    ).toMatchObject({ serviceIds: expect.arrayContaining([service.id]) })

    await repository.update("service", service.id, {
      category: service.category,
      description: service.description,
      durationMinutes: service.durationMinutes,
      name: service.name,
      priceCents: service.priceCents,
      professionalIds: ["professional-alpha"],
      unitIds: service.unitIds,
    })
    await repository.reset()
    expect(
      (
        await repository.list({
          ...listQuery,
          kind: "professional",
          pageSize: 20,
          scenarioId: "next-failure",
        })
      ).items.find(({ id }) => id === "professional-bravo"),
    ).toMatchObject({ serviceIds: expect.arrayContaining([service.id]) })
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
        businessHours: standardBusinessHours,
        code: "CTR",
        name: "Unidade Centro revisada",
      }),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
    await expect(
      repository.update("unit", "unit-center", {
        address: "Avenida Sintética, 200",
        businessHours: standardBusinessHours,
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
    expect(result.conflicts).toContain("Segunda-feira: períodos de trabalho sobrepostos.")
    expect(result.conflicts).toContain("Terça-feira: pausa fora do período de trabalho.")
    expect(result.conflicts).toContain("Quarta-feira: pausas sobrepostas.")
    expect(result.conflicts).toContain("Sexta-feira: ausência fora do período de trabalho.")
    expect(result.conflicts).toContain("Sábado: dia fechado contém horários.")
    const nonConflictingSelection = await repository.getAvailability({
      professionalId: "professional-bravo",
      scenarioId: "availability-conflicts",
      unitId: "unit-center",
    })
    expect(nonConflictingSelection.records).toHaveLength(7)
    expect(
      nonConflictingSelection.records.every(
        ({ professionalId, unitId }) =>
          professionalId === "professional-bravo" && unitId === "unit-center",
      ),
    ).toBe(true)
    expect(nonConflictingSelection.conflicts).toEqual([])
    const monday = result.records.find(
      ({ day, professionalId }) => day === "monday" && professionalId === "professional-alpha",
    )
    expect(monday).toBeDefined()
    if (!monday) return
    await expect(
      repository.updateAvailability({
        ...monday,
        periods: [{ ...monday.periods[0], start: "18:00", end: "09:00" }],
      }),
    ).rejects.toBeInstanceOf(SetupValidationError)
    expect(
      (await repository.getAvailability({ scenarioId: "availability-conflicts" })).records.find(
        ({ id }) => id === monday.id,
      )?.periods,
    ).toEqual([
      expect.objectContaining({ start: "09:00", end: "13:00" }),
      expect.objectContaining({ start: "12:00", end: "18:00" }),
    ])
  })

  it("copies weekdays atomically and rolls every target back on failure", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("next-failure")
    const before = await repository.getAvailability({ scenarioId: "next-failure" })
    const source = before.records.find(
      ({ day, professionalId }) => day === "monday" && professionalId === "professional-alpha",
    )
    expect(source).toBeDefined()
    if (!source) return
    const targetIds = before.records
      .filter(
        ({ day, professionalId }) =>
          professionalId === source.professionalId &&
          day !== source.day &&
          day !== "saturday" &&
          day !== "sunday",
      )
      .map(({ id }) => id)
    const changedSource = {
      ...source,
      periods: [{ ...source.periods[0], start: "10:00", end: "17:00" }],
    }

    await expect(
      repository.copyAvailabilityToWeekdays({ source: changedSource, targetIds }),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
    const afterFailure = await repository.getAvailability({ scenarioId: "next-failure" })
    expect(
      afterFailure.records.filter(({ id }) => targetIds.includes(id)).map(({ periods }) => periods),
    ).toEqual(
      before.records.filter(({ id }) => targetIds.includes(id)).map(({ periods }) => periods),
    )

    await repository.copyAvailabilityToWeekdays({ source: changedSource, targetIds })
    const afterSuccess = await repository.getAvailability({ scenarioId: "next-failure" })
    expect(
      afterSuccess.records
        .filter(({ id }) => targetIds.includes(id))
        .every(({ periods }) => periods[0]?.start === "10:00"),
    ).toBe(true)
  })

  it("updates a recurring availability batch atomically", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("next-failure")
    const before = await repository.getAvailability({
      professionalId: "professional-alpha",
      scenarioId: "next-failure",
      unitId: "unit-center",
    })
    const targets = before.records.filter(({ day }) => day === "monday" || day === "tuesday")
    const updates = targets.map((record) => ({
      ...record,
      breaks: [
        ...record.breaks,
        {
          excludedDates: [],
          id: `batch-${record.day}`,
          recurrenceStart: "2026-01-01",
          seriesId: "batch-series",
          start: "14:00",
          end: "15:00",
        },
      ],
    }))

    await expect(repository.updateAvailabilityBatch({ records: updates })).rejects.toBeInstanceOf(
      SimulatedMockFailure,
    )
    expect(
      (
        await repository.getAvailability({
          professionalId: "professional-alpha",
          scenarioId: "next-failure",
          unitId: "unit-center",
        })
      ).records
        .flatMap(({ breaks }) => breaks)
        .some(({ seriesId }) => seriesId === "batch-series"),
    ).toBe(false)

    await repository.updateAvailabilityBatch({ records: updates })
    expect(
      (
        await repository.getAvailability({
          professionalId: "professional-alpha",
          scenarioId: "next-failure",
          unitId: "unit-center",
        })
      ).records
        .flatMap(({ breaks }) => breaks)
        .filter(({ seriesId }) => seriesId === "batch-series"),
    ).toHaveLength(2)
  })

  it("stores one dated override without changing later series occurrences", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const before = await repository.getAvailability({
      professionalId: "professional-alpha",
      scenarioId: "single-unit",
      unitId: "unit-center",
    })
    const exceptionDate = "2026-07-20"
    const monday = before.records.find(({ day }) => day === "monday")
    expect(monday).toBeDefined()
    if (!monday) return

    const excludeDate = (block: (typeof monday.periods)[number]) => ({
      ...block,
      excludedDates: [...block.excludedDates, exceptionDate],
    })
    const updates = before.records.map((record) => ({
      ...record,
      absences: record.absences.map(excludeDate),
      breaks: record.breaks.map(excludeDate),
      periods: record.periods.map(excludeDate),
    }))
    const mondayUpdate = updates.find(({ day }) => day === "monday")
    if (!mondayUpdate) return
    mondayUpdate.periods = [
      ...mondayUpdate.periods,
      {
        end: "17:00",
        excludedDates: [],
        id: "monday-override",
        occurrenceDate: exceptionDate,
        seriesId: "monday-override",
        start: "10:00",
      },
    ]

    await repository.updateAvailabilityBatch({ records: updates })
    const after = await repository.getAvailability({
      professionalId: "professional-alpha",
      scenarioId: "single-unit",
      unitId: "unit-center",
    })
    const occurrences = projectAvailability(after.records, {
      start: exceptionDate,
      end: "2026-07-27",
    }).filter(({ day, type }) => day === "monday" && type === "available")

    expect(occurrences).toEqual([
      expect.objectContaining({ date: exceptionDate, start: "10:00", end: "17:00" }),
      expect.objectContaining({ date: "2026-07-27", start: "09:00", end: "18:00" }),
    ])
  })

  it("creates a complete week for a newly linked professional and unit", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("incomplete-setup")
    const professional = (
      await repository.list({
        ...listQuery,
        kind: "professional",
        scenarioId: "incomplete-setup",
      })
    ).items[0]
    expect(professional?.kind).toBe("professional")
    if (professional?.kind !== "professional") return
    await repository.update("professional", professional.id, {
      accountAccess: professional.accountAccess,
      name: professional.name,
      role: professional.role,
      serviceIds: [],
      unitIds: ["unit-center"],
    })

    const days: readonly Weekday[] = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]
    const records: SetupAvailability[] = days.map((day) => ({
      absences: [],
      breaks: [],
      closed: day !== "monday",
      day,
      id: `availability-draft-${day}`,
      kind: "availability",
      periods:
        day === "monday"
          ? [
              {
                excludedDates: [],
                end: "18:00",
                id: "new-week-monday",
                recurrenceStart: "2026-01-01",
                seriesId: "new-week",
                start: "09:00",
              },
            ]
          : [],
      professionalId: professional.id,
      unitId: "unit-center",
    }))

    await expect(
      repository.updateAvailabilityBatch({
        records: [records[0], { ...records[0], id: "duplicate-monday" }],
      }),
    ).rejects.toThrow("Cada dia do vínculo deve aparecer apenas uma vez.")
    expect(
      (
        await repository.getAvailability({
          professionalId: professional.id,
          scenarioId: "incomplete-setup",
          unitId: "unit-center",
        })
      ).records,
    ).toEqual([])

    await expect(repository.updateAvailabilityBatch({ records })).resolves.toHaveLength(7)
    const created = await repository.getAvailability({
      professionalId: professional.id,
      scenarioId: "incomplete-setup",
      unitId: "unit-center",
    })
    expect(created.records).toHaveLength(7)
    expect(created.records.find(({ day }) => day === "monday")?.periods).toEqual([
      expect.objectContaining({ seriesId: "new-week", start: "09:00", end: "18:00" }),
    ])
  })

  it("keeps destination-specific absences when copying recurring weekday hours", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const availability = await repository.getAvailability({
      professionalId: "professional-alpha",
      scenarioId: "single-unit",
      unitId: "unit-center",
    })
    const source = availability.records.find(({ day }) => day === "monday")
    const target = availability.records.find(({ day }) => day === "thursday")
    expect(source).toBeDefined()
    expect(target).toBeDefined()
    if (!source || !target) return
    await repository.updateAvailability({
      ...target,
      absences: [
        {
          excludedDates: [],
          id: "absence-thursday",
          recurrenceStart: "2026-01-01",
          seriesId: "absence-thursday",
          start: "14:00",
          end: "15:00",
        },
      ],
    })
    await repository.copyAvailabilityToWeekdays({
      source: {
        ...source,
        absences: [
          {
            excludedDates: [],
            id: "absence-monday",
            recurrenceStart: "2026-01-01",
            seriesId: "absence-monday",
            start: "15:00",
            end: "16:00",
          },
        ],
      },
      targetIds: [target.id],
    })
    const copiedTarget = (
      await repository.getAvailability({
        professionalId: "professional-alpha",
        scenarioId: "single-unit",
        unitId: "unit-center",
      })
    ).records.find(({ id }) => id === target.id)
    expect(copiedTarget?.absences).toEqual([
      expect.objectContaining({ start: "14:00", end: "15:00" }),
    ])
  })

  it("uses distinct scenario query inputs so a slow result cannot replace the active result", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const slow = repository.getOverview("slow")
    await repository.selectScenario("multi-unit")
    const current = await repository.getOverview("multi-unit")
    const slowResult = await slow
    expect(slowResult.items[0]).toMatchObject({ description: "1 unidade(s) ativa(s)." })
    expect(current.items[0].description).toContain("2 unidade(s)")
    expect(repository.snapshot().scenarioId).toBe("multi-unit")
  })

  it("invalidates delayed mutations after reset and scenario switch", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("slow")
    const delayedAfterReset = repository.update("unit", "unit-center", {
      address: "Rua Sintética, 20",
      businessHours: { ...standardBusinessHours, start: "10:00", end: "17:00" },
      code: "ALT",
      name: "Unidade atrasada",
    })
    await repository.reset()
    await expect(delayedAfterReset).rejects.toBeInstanceOf(SetupOperationInvalidatedError)
    expect((await repository.list({ ...listQuery, scenarioId: "slow" })).items[0]).toMatchObject({
      name: "Unidade Centro",
    })

    const delayedAfterSwitch = repository.update("unit", "unit-center", {
      address: "Rua Sintética, 30",
      businessHours: { ...standardBusinessHours, start: "10:00", end: "17:00" },
      code: "ALT",
      name: "Outra unidade atrasada",
    })
    await repository.selectScenario("multi-unit")
    await expect(delayedAfterSwitch).rejects.toBeInstanceOf(SetupOperationInvalidatedError)
    expect((await repository.list({ ...listQuery, scenarioId: "multi-unit" })).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "unit-center", name: "Unidade Centro" }),
      ]),
    )
  })
})
