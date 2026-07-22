import { MemoryScenarioEngine, SimulatedMockFailure } from "@/dev/mock-engine"
import type {
  AvailabilityQuery,
  AvailabilityResult,
  BarbershopSetupRepository,
  SetupAvailability,
  SetupEntity,
  SetupEntityInput,
  SetupEntityKind,
  SetupEntityPage,
  SetupListQuery,
  SetupOverview,
  SetupProfessional,
  SetupRecord,
  SetupRuntimeSnapshot,
  SetupScenarioId,
  SetupService,
  SetupUnit,
} from "@/modules/barbershop-setup/contracts"
import { SetupDependencyError, SetupValidationError } from "@/modules/barbershop-setup/contracts"
import { barbershopSetupScenarios } from "./scenarios"

export class BarbershopSetupMemoryRepository implements BarbershopSetupRepository {
  readonly #engine = new MemoryScenarioEngine<SetupRecord>(barbershopSetupScenarios, "single-unit")
  #failNextMutation = false

  scenarios() {
    return barbershopSetupScenarios.map(({ description, id, label }) => ({
      description,
      id,
      label,
    }))
  }

  snapshot(scenarioId?: SetupScenarioId): SetupRuntimeSnapshot {
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
    return this.#engine.execute("list", () => {
      const records = this.#engine.values()
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
    return this.#engine.execute("list", () => {
      const needle = query.search.trim().toLocaleLowerCase("pt-BR")
      const items = this.#engine
        .values()
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
    return this.#engine.execute("list", () => {
      const records = this.#engine.values()
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
      return this.#engine.create(
        { ...input, kind, status: "active" } as unknown as Omit<SetupRecord, "id">,
        kind,
      ) as SetupEntity
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
      return updated
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
      return updated
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
    this.#engine.selectScenario(id)
    this.#failNextMutation = id === "next-failure"
  }

  async reset() {
    this.#engine.reset()
    this.#failNextMutation = this.#engine.snapshot.scenarioId === "next-failure"
  }

  #ensureScenario(id: SetupScenarioId) {
    if (this.#engine.snapshot.scenarioId !== id) {
      this.#engine.selectScenario(id)
      this.#failNextMutation = id === "next-failure"
    }
  }

  async #mutate<TResult>(operation: "create" | "update", action: () => TResult) {
    if (this.#failNextMutation) {
      this.#failNextMutation = false
      throw new SimulatedMockFailure(operation)
    }
    return this.#engine.execute(operation, action)
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
          : records.some(
              (record) =>
                record.kind === "professional" &&
                record.status === "active" &&
                record.serviceIds.includes(entity.id),
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
  if (record.closed) return
  if (record.periods.length === 0)
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
  if (findConflicts([record]).length > 0)
    throw new SetupValidationError(
      "A pausa deve ficar dentro de um período e não pode ultrapassá-lo.",
    )
}

function findConflicts(records: readonly SetupAvailability[]) {
  return records.flatMap((record) => {
    if (record.closed && (record.periods.length > 0 || record.breaks.length > 0))
      return [`${weekdayLabels[record.day]}: dia fechado contém horários.`]
    return record.breaks
      .filter(
        (pause) =>
          !record.periods.some((period) => pause.start >= period.start && pause.end <= period.end),
      )
      .map(() => `${weekdayLabels[record.day]}: pausa fora do período de trabalho.`)
  })
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
