import { describe, expect, it } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import {
  createDefaultAccessPolicy,
  normalizeAccessPolicy,
  validatePaymentMethods,
} from "@/modules/barbershop-setup/completion"
import { validateScheduleSearch, visibleScheduleBounds } from "@/modules/scheduling/agenda"
import {
  deriveWeeklyLayouts,
  sevenDayDates,
  weeklyDropError,
} from "@/modules/scheduling/weekly-agenda"

describe("first visual MLP completion contracts", () => {
  it("derives six resumable setup steps from required facts", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const firstUse = await repository.getCompletion("new-business")
    const complete = await repository.getCompletion("single-unit")

    expect(firstUse.readiness.steps.map(({ title }) => title)).toEqual([
      "Dados da barbearia",
      "Horários",
      "Profissionais",
      "Serviços",
      "Pagamentos e comissões",
      "Revisão",
    ])
    expect(firstUse.readiness.nextStepId).toBe("business")
    expect(complete.readiness.completedCount).toBe(6)
    expect(complete.readiness.nextStepId).toBe("review")
  })

  it("validates base and mixed payment combinations", () => {
    expect(() =>
      validatePaymentMethods([
        { active: false, id: "pix", label: "Pix" },
        { active: false, id: "cash", label: "Dinheiro" },
        { active: false, id: "debit", label: "Débito" },
        { active: false, id: "credit", label: "Crédito" },
        { active: false, id: "mixed", label: "Misto" },
      ]),
    ).toThrow("Ative pelo menos uma")
    expect(() =>
      validatePaymentMethods([
        { active: true, id: "pix", label: "Pix" },
        { active: false, id: "cash", label: "Dinheiro" },
        { active: false, id: "debit", label: "Débito" },
        { active: false, id: "credit", label: "Crédito" },
        { active: true, id: "mixed", label: "Misto" },
      ]),
    ).toThrow("exige pelo menos duas")
  })

  it("resolves one professional override and restores the default when cleared", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const original = await repository.resolveProfessionalService(
      "service-classic",
      "professional-alpha",
    )
    await repository.setProfessionalServiceOverride({
      durationMinutes: 60,
      priceCents: 7_500,
      professionalId: "professional-alpha",
      serviceId: "service-classic",
    })
    const overridden = await repository.resolveProfessionalService(
      "service-classic",
      "professional-alpha",
    )
    await repository.setProfessionalServiceOverride({
      professionalId: "professional-alpha",
      serviceId: "service-classic",
    })
    const restored = await repository.resolveProfessionalService(
      "service-classic",
      "professional-alpha",
    )

    expect(overridden).toMatchObject({
      durationMinutes: 60,
      priceCents: 7_500,
      source: "professional-override",
    })
    expect(restored).toEqual(original)
  })

  it("makes appointment creation consume the accepted resolved service contract", async () => {
    const repository = new SchedulingMemoryRepository("2026-07-26", {
      async resolveAppointmentService() {
        return { durationMinutes: 60, priceCents: 7_500 }
      },
    })
    const range = await repository.getRange({
      endDate: "2026-07-26",
      startDate: "2026-07-26",
      unitId: "centro",
    })
    const seed = range.appointments.find(({ status }) => status === "confirmed")
    expect(seed).toBeDefined()
    if (!seed) return
    const created = await repository.create({
      ...seed,
      clientId: "client-resolved-contract",
      customerName: "Cliente do contrato",
      date: "2026-07-27",
      durationMinutes: 15,
      priceCents: 1,
      start: "08:00",
    })

    expect(created).toMatchObject({ durationMinutes: 60, priceCents: 7_500 })
  })

  it("keeps access choices demonstrative and internally consistent", () => {
    const policy = createDefaultAccessPolicy()
    expect(policy["own-schedule-only"]).toBe(true)
    expect(
      normalizeAccessPolicy({
        ...policy,
        "access-other-professionals": true,
      }),
    ).toMatchObject({
      "access-other-professionals": true,
      "own-schedule-only": false,
    })
  })

  it("returns a bounded professional operational summary through the scheduling port", async () => {
    const scheduling = new SchedulingMemoryRepository("2026-07-26")
    const repository = new BarbershopSetupMemoryRepository(scheduling)
    await repository.getCompletion("single-unit")
    const summary = await repository.getProfessionalOperationalSummary(
      "professional-alpha",
      "2026-07-26",
    )

    expect(summary.agendaProfessionalId).toBe("professional-carlos")
    expect(summary.appointments.length).toBeGreaterThan(0)
    expect(summary.serviceAssignments).toHaveLength(4)
    expect(summary.unavailableReason).toBeUndefined()
  })

  it("maps setup professionals by stable identity and reports archived identities truthfully", async () => {
    const scheduling = new SchedulingMemoryRepository("2026-07-26")
    const repository = new BarbershopSetupMemoryRepository(scheduling, {
      "professional-alpha": "professional-joao",
    })
    const mapped = await repository.getProfessionalOperationalSummary(
      "professional-alpha",
      "2026-07-26",
    )
    expect(mapped.agendaProfessionalId).toBe("professional-joao")

    const professional = (
      await repository.list({
        kind: "professional",
        page: 1,
        pageSize: 10,
        scenarioId: "single-unit",
        search: "",
        sort: { direction: "asc", field: "name" },
        status: "all",
      })
    ).items.find(({ id }) => id === "professional-alpha")
    expect(professional?.kind).toBe("professional")
    if (professional?.kind !== "professional") return
    await repository.update("professional", professional.id, {
      accountAccess: professional.accountAccess,
      name: professional.name,
      role: professional.role,
      serviceIds: [],
      unitIds: professional.unitIds,
    })
    await repository.setArchived("professional", "professional-alpha", true)
    const archived = await repository.getProfessionalOperationalSummary(
      "professional-alpha",
      "2026-07-26",
    )
    expect(archived.agendaProfessionalId).toBeUndefined()
    expect(archived.appointments).toEqual([])
    expect(archived.unavailableReason).toContain("arquivado")
  })

  it("normalizes safe weekly URL state and returns exactly seven dates", () => {
    const search = validateScheduleSearch(
      {
        date: "2026-07-26",
        professional: "professional-carlos",
        scope: "week",
        unit: "centro",
        view: "board",
      },
      "2026-07-26",
    )
    const bounds = visibleScheduleBounds(search)
    expect(bounds).toEqual({ startDate: "2026-07-20", endDate: "2026-07-26" })
    expect(sevenDayDates(bounds.startDate)).toEqual([
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
    ])
    expect(search.professional).toBe("professional-carlos")
  })

  it("lays out overlaps deterministically and rejects invalid weekly drops", async () => {
    const repository = new SchedulingMemoryRepository("2026-07-26")
    const range = await repository.getRange({
      endDate: "2026-07-26",
      startDate: "2026-07-20",
      unitId: "centro",
    })
    const source = range.appointments.find(
      ({ status }) => !["completed", "canceled", "no-show"].includes(status),
    )
    expect(source).toBeDefined()
    if (!source) return
    const layouts = deriveWeeklyLayouts(range.appointments)
    expect([...layouts.keys()]).toEqual([...layouts.keys()].toSorted())
    expect(
      weeklyDropError(range, source, {
        date: source.date,
        professionalId: source.professionalId,
        start: source.start,
      }),
    ).toContain("já está")
    expect(
      weeklyDropError(range, source, {
        date: source.date,
        professionalId: "professional-bruno",
        start: "15:00",
      }),
    ).toContain("altere o profissional")
  })

  it("returns dated blocked periods and rejects their weekly destinations", async () => {
    const repository = new SchedulingMemoryRepository("2026-07-26")
    const range = await repository.getRange({
      endDate: "2026-07-26",
      scenarioId: "blocked",
      startDate: "2026-07-20",
      unitId: "centro",
    })
    const seed = range.appointments.find(
      ({ status }) => !["completed", "canceled", "no-show"].includes(status),
    )
    expect(seed).toBeDefined()
    if (!seed) return
    const source = {
      ...seed,
      professionalId: "professional-ana",
    }

    expect(range.periods).toEqual(
      expect.arrayContaining([expect.objectContaining({ date: "2026-07-26", kind: "blocked" })]),
    )
    expect(
      weeklyDropError(range, source, {
        date: "2026-07-26",
        professionalId: "professional-ana",
        start: "09:00",
      }),
    ).toContain("indisponível")
  })
})
