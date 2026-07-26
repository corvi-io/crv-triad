import { MemoryScenarioEngine, SimulatedMockFailure } from "@/dev/mock-engine"
import {
  availabilityBlocks,
  blockDateSetIsSubset,
  blockDateSetsIntersect,
  isCanonicalDate,
  weekdayForDate,
} from "@/modules/barbershop-setup/availability-dates"
import {
  createDefaultPaymentMethods,
  deriveSetupReadiness,
  resolveProfessionalService,
  validatePaymentMethods,
  validateProfessionalServiceOverride,
} from "@/modules/barbershop-setup/completion"
import type {
  AvailabilityBlockType,
  AvailabilityQuery,
  AvailabilityResult,
  AvailabilityTimeBlock,
  BarbershopProfile,
  BarbershopSetupRepository,
  CopyAvailabilityToWeekdaysInput,
  PaymentMethodSetting,
  ProfessionalOperationalSummary,
  ProfessionalServiceOverride,
  ResolvedProfessionalService,
  SetupAvailability,
  SetupEntity,
  SetupEntityInput,
  SetupEntityKind,
  SetupEntityPage,
  SetupListQuery,
  SetupOverview,
  SetupProfessional,
  SetupRecord,
  SetupScenarioId,
  SetupService,
  SetupUnit,
  TimeRange,
  UpdateAvailabilityBatchInput,
  UpdatePaymentMethodsInput,
  Weekday,
} from "@/modules/barbershop-setup/contracts"
import {
  SetupDependencyError,
  SetupOperationInvalidatedError,
  SetupValidationError,
} from "@/modules/barbershop-setup/contracts"
import type { SchedulingRepository } from "@/modules/scheduling/contracts"
import { barbershopSetupScenarios } from "./scenarios"

export class BarbershopSetupMemoryRepository implements BarbershopSetupRepository {
  readonly #engine = new MemoryScenarioEngine<SetupRecord>(barbershopSetupScenarios, "single-unit")
  readonly #completionByScenario = new Map<
    string,
    {
      paymentMethods: readonly PaymentMethodSetting[]
      profile: BarbershopProfile
      serviceOverrides: readonly ProfessionalServiceOverride[]
    }
  >()
  #failNextMutation = false
  #operationGeneration = 0
  readonly #schedulingRepository?: SchedulingRepository

  constructor(schedulingRepository?: SchedulingRepository) {
    this.#schedulingRepository = schedulingRepository
    this.#normalizeProfessionalServiceRelations()
  }

  scenarios() {
    return barbershopSetupScenarios.map(({ description, id, label }) => ({
      description,
      id,
      label,
    }))
  }

  snapshot(scenarioId?: SetupScenarioId) {
    if (scenarioId) this.#ensureScenario(scenarioId)
    const snapshot = this.#engine.snapshot
    const records = this.#engine.values()
    return {
      ...snapshot,
      failureMode: this.#failNextMutation ? "next" : snapshot.failureMode,
      scenarioId: snapshot.scenarioId as SetupScenarioId,
      professionalCount: records.filter(({ kind }) => kind === "professional").length,
      serviceCount: records.filter(({ kind }) => kind === "service").length,
      unitCount: records.filter(({ kind }) => kind === "unit").length,
    }
  }

  async getOverview(scenarioId: SetupScenarioId): Promise<SetupOverview> {
    this.#ensureScenario(scenarioId)
    const records = this.#engine.values()
    return this.#engine.execute("list", () => {
      const units = records.filter(
        (record): record is SetupUnit => record.kind === "unit" && record.status === "active",
      )
      const professionals = records.filter(
        (record): record is SetupProfessional =>
          record.kind === "professional" && record.status === "active",
      )
      const services = records.filter(
        (record): record is SetupService => record.kind === "service" && record.status === "active",
      )
      const availability = records.filter(
        (record): record is SetupAvailability => record.kind === "availability" && !record.closed,
      )
      const items = [
        {
          section: "units" as const,
          title: "Cadastrar a operação",
          description:
            units.length > 0
              ? `${units.length} unidade(s) ativa(s).`
              : "Adicione a primeira unidade.",
          complete: units.length > 0,
        },
        {
          section: "professionals" as const,
          title: "Conectar profissionais",
          description:
            professionals.length > 0 && professionals.every(({ unitIds }) => unitIds.length > 0)
              ? `${professionals.length} profissional(is) com unidade.`
              : "Há profissionais ausentes ou sem unidade.",
          complete:
            professionals.length > 0 && professionals.every(({ unitIds }) => unitIds.length > 0),
        },
        {
          section: "services" as const,
          title: "Definir serviços",
          description:
            services.length > 0 &&
            services.every(
              ({ professionalIds, unitIds }) => professionalIds.length > 0 && unitIds.length > 0,
            )
              ? `${services.length} serviço(s) relacionado(s).`
              : "Adicione serviços e seus vínculos.",
          complete:
            services.length > 0 &&
            services.every(
              ({ professionalIds, unitIds }) => professionalIds.length > 0 && unitIds.length > 0,
            ),
        },
        {
          section: "availability" as const,
          title: "Configurar disponibilidade",
          description:
            availability.length > 0
              ? "Semana de trabalho disponível para revisão."
              : "Defina dias e horários de trabalho.",
          complete: availability.length > 0,
        },
      ]
      return {
        completedCount: items.filter(({ complete }) => complete).length,
        items,
        totalCount: items.length,
      }
    })
  }

  async getCompletion(scenarioId: SetupScenarioId) {
    this.#ensureScenario(scenarioId)
    return this.#engine.execute("list", () => {
      const state = this.#completionState(scenarioId)
      const records = this.#engine.values()
      const units = records.filter((record): record is SetupUnit => record.kind === "unit")
      const professionals = records.filter(
        (record): record is SetupProfessional => record.kind === "professional",
      )
      const services = records.filter((record): record is SetupService => record.kind === "service")
      const availability = records.filter(
        (record): record is SetupAvailability => record.kind === "availability",
      )
      return {
        ...structuredClone(state),
        readiness: deriveSetupReadiness({
          availability,
          paymentMethods: state.paymentMethods,
          profile: state.profile,
          professionals,
          services,
          units,
        }),
      }
    })
  }

  async getActivePaymentMethodIds() {
    return this.#completionState()
      .paymentMethods.filter(
        (setting): setting is PaymentMethodSetting & { id: "pix" | "cash" | "debit" | "credit" } =>
          setting.active && setting.id !== "mixed",
      )
      .map(({ id }) => id)
  }

  async updateProfile(input: BarbershopProfile) {
    return this.#mutate("update", () => {
      const normalized = {
        ...input,
        displayName: input.displayName.trim(),
        email: input.email.trim().toLocaleLowerCase("pt-BR"),
        phone: input.phone.replace(/\D/g, ""),
      }
      if (normalized.displayName.length < 2)
        throw new SetupValidationError("Informe o nome de exibição da barbearia.")
      if (!/^\d{10,11}$/.test(normalized.phone))
        throw new SetupValidationError("Informe um telefone válido.")
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email))
        throw new SetupValidationError("Informe um e-mail válido.")
      const primaryUnit = normalized.primaryUnitId
        ? this.#engine.get(normalized.primaryUnitId)
        : undefined
      if (primaryUnit?.kind !== "unit" || primaryUnit.status !== "active")
        throw new SetupValidationError("Selecione uma unidade principal ativa.")
      this.#completionState().profile = normalized
      return structuredClone(normalized)
    })
  }

  async updatePaymentMethods(input: UpdatePaymentMethodsInput) {
    return this.#mutate("update", () => {
      const settings = validatePaymentMethods(input.settings)
      this.#completionState().paymentMethods = settings
      return structuredClone(settings)
    })
  }

  async setProfessionalServiceOverride(input: ProfessionalServiceOverride) {
    return this.#mutate("update", () => {
      const state = this.#completionState()
      const service = this.#engine.get(input.serviceId)
      const professional = this.#engine.get(input.professionalId)
      if (service?.kind !== "service" || professional?.kind !== "professional")
        throw new SetupValidationError("Serviço ou profissional não encontrado.")
      const withoutPair = state.serviceOverrides.filter(
        (candidate) =>
          candidate.serviceId !== input.serviceId ||
          candidate.professionalId !== input.professionalId,
      )
      if (input.priceCents === undefined && input.durationMinutes === undefined) {
        state.serviceOverrides = withoutPair
        return undefined
      }
      resolveProfessionalService(service, professional, input)
      const override = validateProfessionalServiceOverride(input)
      state.serviceOverrides = [...withoutPair, override]
      return structuredClone(override)
    })
  }

  async resolveProfessionalService(
    serviceId: string,
    professionalId: string,
  ): Promise<ResolvedProfessionalService> {
    const service = this.#engine.get(serviceId)
    const professional = this.#engine.get(professionalId)
    if (service?.kind !== "service" || professional?.kind !== "professional")
      throw new SetupValidationError("Serviço ou profissional não encontrado.")
    const override = this.#completionState().serviceOverrides.find(
      (candidate) =>
        candidate.serviceId === serviceId && candidate.professionalId === professionalId,
    )
    return resolveProfessionalService(service, professional, override)
  }

  async getProfessionalOperationalSummary(
    professionalId: string,
    date: string,
  ): Promise<ProfessionalOperationalSummary> {
    const professional = this.#engine.get(professionalId)
    if (professional?.kind !== "professional")
      throw new SetupValidationError("Profissional não encontrado.")
    const services = this.#engine
      .values()
      .filter(
        (record): record is SetupService =>
          record.kind === "service" && professional.serviceIds.includes(record.id),
      )
    const serviceAssignments = services.map((service) => {
      const override = this.#completionState().serviceOverrides.find(
        (candidate) =>
          candidate.serviceId === service.id && candidate.professionalId === professional.id,
      )
      return resolveProfessionalService(service, professional, override)
    })
    const availability = this.#engine
      .values()
      .filter(
        (record): record is SetupAvailability =>
          record.kind === "availability" && record.professionalId === professionalId,
      )
    if (!this.#schedulingRepository) {
      return {
        agendaDate: date,
        appointments: [],
        availabilityLabel: availability.some(({ closed }) => !closed)
          ? "Disponibilidade configurada"
          : "Sem disponibilidade configurada",
        commissionLabel: `${(professional.commissionBasisPoints ?? 0) / 100}% padrão`,
        professionalId,
        serviceAssignments,
        unavailableReason: "A Agenda está indisponível nesta composição.",
      }
    }
    const range = await this.#schedulingRepository.getRange({
      endDate: date,
      focusDate: date,
      startDate: date,
      unitId: "centro",
    })
    const setupProfessionals = this.#engine
      .values()
      .filter(
        (record): record is SetupProfessional =>
          record.kind === "professional" && record.status === "active",
      )
    const agendaProfessionalId =
      range.professionals[setupProfessionals.findIndex(({ id }) => id === professionalId)]?.id
    return {
      agendaProfessionalId,
      agendaDate: date,
      appointments: range.appointments
        .filter((appointment) => appointment.professionalId === agendaProfessionalId)
        .map(({ customerName, id, start, status }) => ({ customerName, id, start, status })),
      availabilityLabel: availability.some(({ closed }) => !closed)
        ? "Disponibilidade configurada"
        : "Sem disponibilidade configurada",
      commissionLabel: `${(professional.commissionBasisPoints ?? 0) / 100}% padrão`,
      professionalId,
      serviceAssignments,
    }
  }

  async list(query: SetupListQuery): Promise<SetupEntityPage> {
    this.#ensureScenario(query.scenarioId)
    const records = this.#engine.values()
    return this.#engine.execute("list", () => {
      const needle = query.search.trim().toLocaleLowerCase("pt-BR")
      const items = records
        .filter((record): record is SetupEntity => record.kind === query.kind)
        .filter((record) => query.status === "all" || record.status === query.status)
        .filter((record) => needle.length === 0 || entitySearchText(record).includes(needle))
        .sort((left, right) => {
          const compared = left[query.sort.field].localeCompare(right[query.sort.field], "pt-BR")
          return query.sort.direction === "asc" ? compared : -compared
        })
      const totalPages = Math.max(1, Math.ceil(items.length / query.pageSize))
      const page = Math.min(Math.max(1, query.page), totalPages)
      const start = (page - 1) * query.pageSize
      return {
        items: items.slice(start, start + query.pageSize),
        page,
        pageSize: query.pageSize,
        totalCount: items.length,
        totalPages,
      }
    })
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
    this.#ensureScenario(query.scenarioId)
    const records = this.#engine.values()
    return this.#engine.execute("list", () => {
      const units = records.filter(
        (record): record is SetupUnit => record.kind === "unit" && record.status === "active",
      )
      const professionals = records.filter(
        (record): record is SetupProfessional =>
          record.kind === "professional" && record.status === "active",
      )
      const services = records.filter(
        (record): record is SetupService => record.kind === "service" && record.status === "active",
      )
      const availability = records
        .filter((record): record is SetupAvailability => record.kind === "availability")
        .filter((record) => !query.unitId || record.unitId === query.unitId)
        .filter((record) => !query.professionalId || record.professionalId === query.professionalId)
      return {
        units,
        professionals,
        services,
        records: availability,
        conflicts: findConflicts(availability),
      }
    })
  }

  async create(kind: SetupEntityKind, input: SetupEntityInput) {
    return this.#mutate("create", () => {
      this.#validateEntityInput(kind, input)
      const created = this.#engine.create(
        { ...input, kind, status: "active" } as unknown as Omit<SetupRecord, "id">,
        kind,
      ) as SetupEntity
      if (created.kind === "professional") {
        this.#applyProfessionalServiceSelection(created.id, created.serviceIds)
      }
      this.#normalizeProfessionalServiceRelations()
      return this.#entity(kind, created.id)
    })
  }

  async update(kind: SetupEntityKind, id: string, input: SetupEntityInput) {
    return this.#mutate("update", () => {
      this.#validateEntityInput(kind, input)
      const current = this.#entity(kind, id)
      const updated = this.#engine.update(id, {
        ...input,
        kind,
        status: current.status,
      } as Partial<SetupRecord>)
      if (!updated || updated.kind === "availability")
        throw new SetupValidationError("Registro não encontrado.")
      if (updated.kind === "professional") {
        this.#applyProfessionalServiceSelection(updated.id, updated.serviceIds)
      }
      this.#normalizeProfessionalServiceRelations()
      return this.#entity(kind, id)
    })
  }

  async setArchived(kind: SetupEntityKind, id: string, archived: boolean) {
    return this.#mutate("update", () => {
      const current = this.#entity(kind, id)
      if (archived) this.#assertNoDependencies(current)
      const updated = this.#engine.update(id, {
        status: archived ? "archived" : "active",
      } as Partial<SetupRecord>)
      if (!updated || updated.kind === "availability")
        throw new SetupValidationError("Registro não encontrado.")
      this.#normalizeProfessionalServiceRelations()
      return this.#entity(kind, id)
    })
  }

  async copyAvailabilityToWeekdays(input: CopyAvailabilityToWeekdaysInput) {
    return this.#mutate("update", () => {
      validateAvailability(input.source)
      const source = this.#engine.get(input.source.id)
      if (source?.kind !== "availability")
        throw new SetupValidationError("Disponibilidade de origem não encontrada.")
      const targetIds = [...new Set(input.targetIds)]
      const updates = targetIds.map((targetId) => {
        const target = this.#engine.get(targetId)
        if (
          target?.kind !== "availability" ||
          target.id === source.id ||
          target.day === "saturday" ||
          target.day === "sunday" ||
          target.professionalId !== source.professionalId ||
          target.unitId !== source.unitId
        ) {
          throw new SetupValidationError("Selecione apenas dias úteis do mesmo vínculo.")
        }
        const update: SetupAvailability = {
          ...target,
          breaks: input.source.breaks.map((block) => ({
            ...structuredClone(block),
            id: `${block.seriesId}-${target.day}-break`,
          })),
          closed: input.source.closed,
          periods: input.source.periods.map((block) => ({
            ...structuredClone(block),
            id: `${block.seriesId}-${target.day}-available`,
          })),
        }
        validateAvailability(update)
        return update
      })
      for (const update of updates) this.#engine.update(update.id, update)
      return updates
    })
  }

  async updateAvailability(input: SetupAvailability) {
    const [updated] = await this.updateAvailabilityBatch({ records: [input] })
    return updated
  }

  async updateAvailabilityBatch(input: UpdateAvailabilityBatchInput) {
    return this.#mutate("update", () => {
      const records = [...new Map(input.records.map((record) => [record.id, record])).values()]
      if (records.length === 0)
        throw new SetupValidationError("Selecione pelo menos um dia para atualizar.")
      const relationshipDays = records.map(
        ({ day, professionalId, unitId }) => `${professionalId}:${unitId}:${day}`,
      )
      if (new Set(relationshipDays).size !== relationshipDays.length)
        throw new SetupValidationError("Cada dia do vínculo deve aparecer apenas uma vez.")
      for (const record of records) {
        validateAvailability(record)
        const current = this.#engine.get(record.id)
        if (current && current.kind !== "availability")
          throw new SetupValidationError("Disponibilidade não encontrada.")
        if (
          current?.kind === "availability" &&
          (current.professionalId !== record.professionalId || current.unitId !== record.unitId)
        )
          throw new SetupValidationError("Disponibilidade não encontrada.")
        const professional = this.#engine.get(record.professionalId)
        const unit = this.#engine.get(record.unitId)
        if (
          professional?.kind !== "professional" ||
          professional.status !== "active" ||
          !professional.unitIds.includes(record.unitId) ||
          unit?.kind !== "unit" ||
          unit.status !== "active"
        )
          throw new SetupValidationError("Selecione um vínculo ativo entre profissional e unidade.")
        if (
          !current &&
          this.#engine
            .values()
            .some(
              (candidate) =>
                candidate.kind === "availability" &&
                candidate.professionalId === record.professionalId &&
                candidate.unitId === record.unitId &&
                candidate.day === record.day,
            )
        )
          throw new SetupValidationError("Este dia já possui disponibilidade configurada.")
      }
      validateAvailabilitySeries(mergeAvailabilityRecords(this.#engine.values(), records))
      return records.map((record) => {
        const current = this.#engine.get(record.id)
        if (current?.kind === "availability") {
          const updated = this.#engine.update(record.id, record)
          if (updated?.kind === "availability") return updated
          throw new SetupValidationError("Disponibilidade não encontrada.")
        }
        const { id: _draftId, ...input } = record
        return this.#engine.create(input, "availability") as SetupAvailability
      })
    })
  }

  async selectScenario(id: SetupScenarioId) {
    this.#operationGeneration += 1
    this.#engine.selectScenario(id)
    this.#failNextMutation = id === "next-failure"
    this.#normalizeProfessionalServiceRelations()
  }

  async reset() {
    this.#operationGeneration += 1
    this.#engine.reset()
    this.#completionByScenario.delete(this.#engine.snapshot.scenarioId)
    this.#failNextMutation = this.#engine.snapshot.scenarioId === "next-failure"
    this.#normalizeProfessionalServiceRelations()
  }

  #ensureScenario(id: SetupScenarioId) {
    if (this.#engine.snapshot.scenarioId !== id) {
      this.#operationGeneration += 1
      this.#engine.selectScenario(id)
      this.#failNextMutation = id === "next-failure"
      this.#normalizeProfessionalServiceRelations()
    }
  }

  #completionState(scenarioId = this.#engine.snapshot.scenarioId) {
    const existing = this.#completionByScenario.get(scenarioId)
    if (existing) return existing
    const records = this.#engine.values()
    const primaryUnit = records.find(
      (record): record is SetupUnit => record.kind === "unit" && record.status === "active",
    )
    const incomplete = scenarioId === "new-business" || scenarioId === "incomplete-setup"
    const state = {
      paymentMethods: createDefaultPaymentMethods(incomplete ? [] : undefined),
      profile: {
        displayName: incomplete ? "" : "Barbearia TRIAD",
        email: incomplete ? "" : "contato@example.test",
        phone: incomplete ? "" : "81999990000",
        primaryUnitId: primaryUnit?.id,
      },
      serviceOverrides: [] as readonly ProfessionalServiceOverride[],
    }
    this.#completionByScenario.set(scenarioId, state)
    return state
  }

  async #mutate<TResult>(operation: "create" | "update", action: () => TResult) {
    if (this.#failNextMutation) {
      this.#failNextMutation = false
      throw new SimulatedMockFailure(operation)
    }
    const generation = this.#operationGeneration
    const scenarioId = this.#engine.snapshot.scenarioId
    return this.#engine.execute(operation, () => {
      if (
        generation !== this.#operationGeneration ||
        scenarioId !== this.#engine.snapshot.scenarioId
      ) {
        throw new SetupOperationInvalidatedError()
      }
      return action()
    })
  }

  #entity(kind: SetupEntityKind, id: string) {
    const record = this.#engine.get(id)
    if (!record || record.kind !== kind) throw new SetupValidationError("Registro não encontrado.")
    return record as SetupEntity
  }

  #validateEntityInput(kind: SetupEntityKind, input: SetupEntityInput) {
    if (!("name" in input) || input.name.trim().length < 2)
      throw new SetupValidationError("Informe um nome com pelo menos 2 caracteres.")
    if (kind === "service") {
      const service = input as SetupService
      if (service.durationMinutes < 15)
        throw new SetupValidationError("Informe duração mínima de 15 minutos.")
      if (service.priceCents < 0) throw new SetupValidationError("Informe um preço válido.")
      this.#assertActiveRelations("unit", service.unitIds)
      this.#assertActiveRelations("professional", service.professionalIds)
      this.#assertProfessionalsServeUnits(service.professionalIds, service.unitIds)
    }
    if (kind === "unit") {
      const unit = input as SetupUnit
      if (
        unit.businessHours.days.length === 0 ||
        unit.businessHours.start >= unit.businessHours.end
      )
        throw new SetupValidationError("Informe dias e um período de funcionamento válido.")
    }
    if (kind === "professional") {
      const professional = input as SetupProfessional
      if (professional.contactPhone && !/^\d{10,11}$/.test(professional.contactPhone))
        throw new SetupValidationError("Informe um telefone profissional válido.")
      if (
        professional.contactEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(professional.contactEmail)
      )
        throw new SetupValidationError("Informe um e-mail profissional válido.")
      if (
        professional.commissionBasisPoints !== undefined &&
        (!Number.isInteger(professional.commissionBasisPoints) ||
          professional.commissionBasisPoints < 0 ||
          professional.commissionBasisPoints > 10_000)
      )
        throw new SetupValidationError("Informe uma comissão entre 0% e 100%.")
      if (
        professional.accessPolicy?.["own-schedule-only"] &&
        professional.accessPolicy["access-other-professionals"]
      )
        throw new SetupValidationError(
          "O acesso somente à própria Agenda não permite dados de outros profissionais.",
        )
      this.#assertActiveRelations("unit", professional.unitIds)
      this.#assertActiveRelations("service", professional.serviceIds)
      this.#assertServicesServeUnits(professional.serviceIds, professional.unitIds)
    }
  }

  #assertProfessionalsServeUnits(professionalIds: readonly string[], unitIds: readonly string[]) {
    const selectedUnits = new Set(unitIds)
    const professionals = this.#engine
      .values()
      .filter(
        (record): record is SetupProfessional =>
          record.kind === "professional" && professionalIds.includes(record.id),
      )
    if (
      professionals.some(
        (professional) => !professional.unitIds.some((id) => selectedUnits.has(id)),
      )
    ) {
      throw new SetupValidationError(
        "Selecione apenas profissionais que atendam a pelo menos uma unidade do serviço.",
      )
    }
  }

  #assertServicesServeUnits(serviceIds: readonly string[], unitIds: readonly string[]) {
    const selectedUnits = new Set(unitIds)
    const services = this.#engine
      .values()
      .filter(
        (record): record is SetupService =>
          record.kind === "service" && serviceIds.includes(record.id),
      )
    if (services.some((service) => !service.unitIds.some((id) => selectedUnits.has(id)))) {
      throw new SetupValidationError(
        "Selecione apenas serviços disponíveis em pelo menos uma unidade do profissional.",
      )
    }
  }

  #assertActiveRelations(kind: SetupEntityKind, ids: readonly string[]) {
    const records = this.#engine.values()
    if (
      ids.some(
        (id) =>
          !records.some(
            (record) => record.kind === kind && record.id === id && record.status === "active",
          ),
      )
    ) {
      throw new SetupValidationError("Selecione somente vínculos ativos deste cenário.")
    }
  }

  #applyProfessionalServiceSelection(professionalId: string, selectedIds: readonly string[]) {
    const selected = new Set(selectedIds)
    for (const record of this.#engine.values()) {
      if (record.kind !== "service") continue
      const professionalIds = new Set(record.professionalIds)
      if (selected.has(record.id)) professionalIds.add(professionalId)
      else professionalIds.delete(professionalId)
      this.#engine.update(record.id, {
        professionalIds: [...professionalIds],
      } as Partial<SetupRecord>)
    }
  }

  #normalizeProfessionalServiceRelations() {
    const records = this.#engine.values()
    const services = records.filter((record): record is SetupService => record.kind === "service")
    for (const record of records) {
      if (record.kind !== "professional") continue
      this.#engine.update(record.id, {
        serviceIds: services
          .filter(({ professionalIds }) => professionalIds.includes(record.id))
          .map(({ id }) => id),
      } as Partial<SetupRecord>)
    }
  }

  #assertNoDependencies(entity: SetupEntity) {
    const records = this.#engine.values()
    const hasDependencies =
      entity.kind === "unit"
        ? records.some(
            (record) =>
              (record.kind === "professional" || record.kind === "service") &&
              record.status === "active" &&
              record.unitIds.includes(entity.id),
          )
        : entity.kind === "professional"
          ? records.some(
              (record) =>
                record.kind === "service" &&
                record.status === "active" &&
                record.professionalIds.includes(entity.id),
            )
          : entity.professionalIds.some((professionalId) =>
              records.some(
                (record) =>
                  record.kind === "professional" &&
                  record.id === professionalId &&
                  record.status === "active",
              ),
            )
    if (hasDependencies) {
      throw new SetupDependencyError(
        "Este item ainda possui vínculos ativos. Remova ou ajuste os vínculos antes de arquivar.",
      )
    }
  }
}

function entitySearchText(entity: SetupEntity) {
  const detail =
    entity.kind === "unit"
      ? `${entity.code} ${entity.address}`
      : entity.kind === "professional"
        ? entity.role
        : `${entity.category} ${entity.description}`
  return `${entity.name} ${detail}`.toLocaleLowerCase("pt-BR")
}

function validateAvailability(record: SetupAvailability) {
  if (!record.closed && record.periods.length === 0)
    throw new SetupValidationError("Adicione pelo menos um período ou marque o dia como fechado.")
  const blocks = [...record.periods, ...record.breaks, ...record.absences]
  if (new Set(blocks.map(({ id }) => id)).size !== blocks.length)
    throw new SetupValidationError("Os blocos de disponibilidade devem ser únicos.")
  for (const range of blocks) {
    if (
      !/^\d{2}:\d{2}$/.test(range.start) ||
      !/^\d{2}:\d{2}$/.test(range.end) ||
      range.start >= range.end
    ) {
      throw new SetupValidationError("Informe um intervalo com início anterior ao fim.")
    }
    const isOneOff = Boolean(range.occurrenceDate)
    const isRecurring = Boolean(range.recurrenceStart)
    if (isOneOff === isRecurring)
      throw new SetupValidationError("Informe uma data exata ou o início da recorrência.")
    if (range.occurrenceDate && !isCanonicalDate(range.occurrenceDate))
      throw new SetupValidationError("Informe uma data válida para o bloco.")
    if (range.occurrenceDate && weekdayForDate(range.occurrenceDate) !== record.day)
      throw new SetupValidationError("A data do bloco deve corresponder ao dia configurado.")
    if (range.occurrenceDate && range.occurrenceDate !== undefined) {
      if (range.recurrenceUntil || range.excludedDates.length > 0)
        throw new SetupValidationError("Um bloco pontual não pode conter regras de recorrência.")
    }
    if (range.recurrenceStart && !isCanonicalDate(range.recurrenceStart))
      throw new SetupValidationError("Informe uma data inicial válida para a recorrência.")
    if (range.recurrenceUntil && !isCanonicalDate(range.recurrenceUntil))
      throw new SetupValidationError("Informe uma data final válida para a recorrência.")
    if (
      range.recurrenceStart &&
      range.recurrenceUntil &&
      range.recurrenceUntil < range.recurrenceStart
    )
      throw new SetupValidationError("A data final deve ser igual ou posterior à data inicial.")
    if (
      new Set(range.excludedDates).size !== range.excludedDates.length ||
      range.excludedDates.some(
        (date) =>
          !isCanonicalDate(date) ||
          (range.recurrenceStart && date < range.recurrenceStart) ||
          (range.recurrenceUntil && date > range.recurrenceUntil),
      )
    )
      throw new SetupValidationError("Informe datas de exceção únicas dentro da recorrência.")
  }
  const conflict = findConflicts([record])[0]
  if (conflict) throw new SetupValidationError(conflict)
}

function findConflicts(records: readonly SetupAvailability[]) {
  return records.flatMap((record) => {
    const weekday = weekdayLabels[record.day]
    if (
      record.closed &&
      (record.periods.length > 0 || record.breaks.length > 0 || record.absences.length > 0)
    )
      return [`${weekday}: dia fechado contém horários.`]
    if (record.closed) return []

    const conflicts: string[] = []
    if (hasOverlaps(record.periods, record.day))
      conflicts.push(`${weekday}: períodos de trabalho sobrepostos.`)
    if (hasOverlaps(record.breaks, record.day)) conflicts.push(`${weekday}: pausas sobrepostas.`)
    if (
      record.breaks.some((pause) => !isBlockCoveredByPeriods(pause, record.periods, record.day))
    ) {
      conflicts.push(`${weekday}: pausa fora do período de trabalho.`)
    }

    if (hasOverlaps(record.absences, record.day))
      conflicts.push(`${weekday}: ausências sobrepostas.`)
    for (const absence of record.absences) {
      if (!isBlockCoveredByPeriods(absence, record.periods, record.day)) {
        conflicts.push(`${weekday}: ausência fora do período de trabalho.`)
      } else if (
        record.breaks.some(
          (pause) =>
            rangesOverlap(pause, absence) && blockDateSetsIntersect(pause, absence, record.day),
        )
      ) {
        conflicts.push(`${weekday}: ausência sobrepõe uma pausa.`)
      }
    }
    return conflicts
  })
}

function containsRange(container: TimeRange, range: TimeRange) {
  return range.start >= container.start && range.end <= container.end
}

function isBlockCoveredByPeriods(
  block: AvailabilityTimeBlock,
  periods: readonly AvailabilityTimeBlock[],
  day: Weekday,
) {
  return periods.some(
    (period) =>
      containsRange(period, block) &&
      blockDateSetIsSubset(block, { ...period, excludedDates: [] }, day),
  )
}

function hasOverlaps(ranges: readonly AvailabilityTimeBlock[], day: Weekday) {
  return ranges.some((range, index) =>
    ranges
      .slice(index + 1)
      .some(
        (candidate) =>
          rangesOverlap(range, candidate) && blockDateSetsIntersect(range, candidate, day),
      ),
  )
}

function rangesOverlap(left: TimeRange, right: TimeRange) {
  return left.start < right.end && right.start < left.end
}

function mergeAvailabilityRecords(
  current: readonly SetupRecord[],
  updates: readonly SetupAvailability[],
) {
  const byRelationshipDay = new Map(
    updates.map((record) => [availabilityRelationshipDay(record), record]),
  )
  const merged = current
    .filter((record): record is SetupAvailability => record.kind === "availability")
    .map((record) => byRelationshipDay.get(availabilityRelationshipDay(record)) ?? record)
  const existingKeys = new Set(merged.map(availabilityRelationshipDay))
  return [
    ...merged,
    ...updates.filter((record) => !existingKeys.has(availabilityRelationshipDay(record))),
  ]
}

function availabilityRelationshipDay(record: SetupAvailability) {
  return `${record.professionalId}:${record.unitId}:${record.day}`
}

function validateAvailabilitySeries(records: readonly SetupAvailability[]) {
  const series = new Map<
    string,
    Array<{
      block: AvailabilityTimeBlock
      type: AvailabilityBlockType
    }>
  >()
  for (const record of records) {
    for (const item of availabilityBlocks(record)) {
      const key = `${record.professionalId}:${record.unitId}:${item.block.seriesId}`
      series.set(key, [...(series.get(key) ?? []), item])
    }
  }
  for (const items of series.values()) {
    const [reference, ...rest] = items
    if (!reference) continue
    if (
      rest.some(
        ({ block, type }) =>
          type !== reference.type ||
          block.start !== reference.block.start ||
          block.end !== reference.block.end ||
          block.occurrenceDate !== reference.block.occurrenceDate ||
          block.recurrenceStart !== reference.block.recurrenceStart ||
          block.recurrenceUntil !== reference.block.recurrenceUntil ||
          JSON.stringify(block.excludedDates) !== JSON.stringify(reference.block.excludedDates),
      )
    )
      throw new SetupValidationError("Os blocos da recorrência devem compartilhar a mesma regra.")
  }
}

const weekdayLabels = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
} as const
