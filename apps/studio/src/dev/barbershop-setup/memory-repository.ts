import { MemoryScenarioEngine, SimulatedMockFailure } from "@/dev/mock-engine"
import type {
  AvailabilityQuery,
  AvailabilityResult,
  BarbershopSetupRepository,
  CopyAvailabilityToWeekdaysInput,
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
} from "@/modules/barbershop-setup/contracts"
import {
  SetupDependencyError,
  SetupOperationInvalidatedError,
  SetupValidationError,
} from "@/modules/barbershop-setup/contracts"
import { barbershopSetupScenarios } from "./scenarios"

export class BarbershopSetupMemoryRepository implements BarbershopSetupRepository {
  readonly #engine = new MemoryScenarioEngine<SetupRecord>(barbershopSetupScenarios, "single-unit")
  #failNextMutation = false
  #operationGeneration = 0

  constructor() {
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
          breaks: structuredClone(input.source.breaks),
          closed: input.source.closed,
          periods: structuredClone(input.source.periods),
        }
        validateAvailability(update)
        return update
      })
      for (const update of updates) this.#engine.update(update.id, update)
      return updates
    })
  }

  async updateAvailability(input: SetupAvailability) {
    return this.#mutate("update", () => {
      validateAvailability(input)
      const updated = this.#engine.update(input.id, input)
      if (updated?.kind !== "availability")
        throw new SetupValidationError("Disponibilidade não encontrada.")
      return updated
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
    if (kind === "professional") {
      const professional = input as SetupProfessional
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
  for (const range of [...record.periods, ...record.breaks]) {
    if (
      !/^\d{2}:\d{2}$/.test(range.start) ||
      !/^\d{2}:\d{2}$/.test(range.end) ||
      range.start >= range.end
    ) {
      throw new SetupValidationError("Informe um intervalo com início anterior ao fim.")
    }
  }
  const conflict = findConflicts([record])[0]
  if (conflict) throw new SetupValidationError(conflict)
}

function findConflicts(records: readonly SetupAvailability[]) {
  return records.flatMap((record) => {
    const weekday = weekdayLabels[record.day]
    if (record.closed && (record.periods.length > 0 || record.breaks.length > 0))
      return [`${weekday}: dia fechado contém horários.`]
    if (record.closed) return []

    const conflicts: string[] = []
    if (hasOverlaps(record.periods)) conflicts.push(`${weekday}: períodos de trabalho sobrepostos.`)
    if (hasOverlaps(record.breaks)) conflicts.push(`${weekday}: pausas sobrepostas.`)
    if (
      record.breaks.some((pause) => !record.periods.some((period) => containsRange(period, pause)))
    ) {
      conflicts.push(`${weekday}: pausa fora do período de trabalho.`)
    }

    const timeOff = parseTimeOffRange(record.timeOff)
    if (timeOff) {
      if (timeOff.start >= timeOff.end) {
        conflicts.push(`${weekday}: ausência contém intervalo inválido.`)
      } else if (!record.periods.some((period) => containsRange(period, timeOff))) {
        conflicts.push(`${weekday}: ausência fora do período de trabalho.`)
      } else if (record.breaks.some((pause) => rangesOverlap(pause, timeOff))) {
        conflicts.push(`${weekday}: ausência sobrepõe uma pausa.`)
      }
    }
    return conflicts
  })
}

function containsRange(container: TimeRange, range: TimeRange) {
  return range.start >= container.start && range.end <= container.end
}

function hasOverlaps(ranges: readonly TimeRange[]) {
  return ranges.some((range, index) =>
    ranges.slice(index + 1).some((candidate) => rangesOverlap(range, candidate)),
  )
}

function rangesOverlap(left: TimeRange, right: TimeRange) {
  return left.start < right.end && right.start < left.end
}

function parseTimeOffRange(timeOff?: string): TimeRange | undefined {
  const match = timeOff?.match(/(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})/)
  return match ? { start: match[1], end: match[2] } : undefined
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
