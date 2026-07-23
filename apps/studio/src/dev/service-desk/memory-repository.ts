import { format } from "date-fns"
import { MemoryScenarioEngine } from "@/dev/mock-engine/memory-scenario-engine"
import type { SchedulingRepository } from "@/modules/scheduling/contracts"
import type {
  QueueEntry,
  ServiceDeskQuery,
  ServiceDeskRepository,
  ServiceDeskScenarioId,
  ServiceDeskSnapshot,
  StartServiceInput,
  WalkInInput,
} from "@/modules/service-desk/contracts"
import { ServiceDeskTransitionError } from "@/modules/service-desk/contracts"
import {
  canTransition,
  filterQueueEntries,
  projectScheduledEntries,
  sortQueueEntries,
} from "@/modules/service-desk/projection"
import { createServiceDeskScenarios } from "./scenarios"

type Clock = { now: () => Date }

export class ServiceDeskMemoryRepository implements ServiceDeskRepository {
  readonly #clock: Clock
  readonly #engine: MemoryScenarioEngine<QueueEntry>
  readonly #scheduling: SchedulingRepository
  readonly #calledAppointmentIds = new Set<string>()
  #generation = 0
  #lastSnapshot?: ServiceDeskSnapshot
  #scenarioId: ServiceDeskScenarioId = "typical"
  #schedulingResetRequired = false
  #schedulingTail: Promise<void> = Promise.resolve()

  constructor(scheduling: SchedulingRepository, clock: Clock = createSourceClock()) {
    this.#scheduling = scheduling
    this.#clock = clock
    this.#engine = new MemoryScenarioEngine(createServiceDeskScenarios(clock.now()), "typical")
  }

  async getQueue(query: ServiceDeskQuery) {
    if (query.scenarioId !== this.#scenarioId) this.#selectScenario(query.scenarioId)
    const generation = this.#generation
    return this.#engine.execute("list", async () => {
      const now = this.#clock.now()
      const date = format(now, "yyyy-MM-dd")
      const schedule = await this.#withScheduling(async () => {
        this.#assertGeneration(generation)
        if (this.#schedulingResetRequired) {
          await this.#scheduling.reset()
          this.#assertGeneration(generation)
          this.#schedulingResetRequired = false
        }
        return this.#scheduling.getDay({
          endDate: date,
          focusDate: date,
          scenarioId: schedulingScenario(query.scenarioId),
          startDate: date,
          unitId: query.unitId,
        })
      })
      this.#assertGeneration(generation)
      const projected = projectScheduledEntries({
        appointments: schedule.appointments,
        calledAppointmentIds: this.#calledAppointmentIds,
        now,
      })
      const allEntries = sortQueueEntries([...projected, ...this.#engine.values()])
      const snapshot: ServiceDeskSnapshot = {
        entries: filterQueueEntries(allEntries, query, schedule.professionals, schedule.services),
        now: now.toISOString(),
        professionals: schedule.professionals,
        services: schedule.services,
        unavailableProfessionalIds:
          query.scenarioId === "unavailable-professional" ? ["professional-carlos"] : [],
        unitName: schedule.unitName,
      }
      this.#lastSnapshot = {
        ...snapshot,
        entries: allEntries,
      }
      return snapshot
    })
  }

  async addWalkIn(input: WalkInInput) {
    const generation = this.#generation
    return this.#engine.execute("create", () => {
      this.#assertGeneration(generation)
      this.#assertWalkIn(input)
      return this.#engine.create(
        {
          ...input,
          source: "walk-in",
          stage: "waiting",
        },
        "walk-in",
      )
    })
  }

  async call(entryId: string) {
    const generation = this.#generation
    return this.#engine.execute("update", () => {
      this.#assertGeneration(generation)
      const entry = this.#entry(entryId)
      if (entry.stage === "called") return entry
      if (!canTransition(entry.stage, "called")) {
        throw new ServiceDeskTransitionError("Somente clientes aguardando podem ser chamados.")
      }
      if (entry.source === "scheduled" && entry.appointmentId) {
        this.#calledAppointmentIds.add(entry.appointmentId)
        return { ...entry, stage: "called" as const }
      }
      const updated = this.#engine.update(entry.id, { stage: "called" })
      if (!updated) throw new ServiceDeskTransitionError("Atendimento não encontrado.")
      return updated
    })
  }

  async start(input: StartServiceInput) {
    const generation = this.#generation
    return this.#engine.execute("update", async () => {
      this.#assertGeneration(generation)
      const entry = this.#entry(input.entryId)
      if (entry.stage === "in-service") return entry
      if (!canTransition(entry.stage, "in-service")) {
        throw new ServiceDeskTransitionError("Chame o cliente antes de iniciar o atendimento.")
      }
      const professionalId =
        entry.preferenceKind === "specific" ? entry.professionalId : input.professionalId
      if (!professionalId) {
        throw new ServiceDeskTransitionError("Escolha o profissional que iniciará o atendimento.")
      }
      this.#assertEligible(entry, professionalId)
      if (entry.source === "scheduled" && entry.appointmentId) {
        const appointmentId = entry.appointmentId
        await this.#withScheduling(async () => {
          this.#assertGeneration(generation)
          await this.#scheduling.transition({ id: appointmentId, status: "in-progress" })
          this.#assertGeneration(generation)
        })
        this.#calledAppointmentIds.delete(appointmentId)
        const updated = {
          ...entry,
          assignedProfessionalId: professionalId,
          stage: "in-service" as const,
        }
        this.#rememberScheduledEntry(updated)
        return updated
      }
      const updated = this.#engine.update(entry.id, {
        assignedProfessionalId: professionalId,
        stage: "in-service",
      })
      if (!updated) throw new ServiceDeskTransitionError("Atendimento não encontrado.")
      return updated
    })
  }

  async reset() {
    this.#generation += 1
    const generation = this.#generation
    this.#engine.reset()
    this.#calledAppointmentIds.clear()
    this.#lastSnapshot = undefined
    await this.#withScheduling(async () => {
      await this.#scheduling.reset()
      this.#assertGeneration(generation)
      this.#schedulingResetRequired = false
    })
    if (this.#scenarioId === "next-failure") this.#engine.failNext()
  }

  #selectScenario(scenarioId: ServiceDeskScenarioId) {
    this.#generation += 1
    this.#scenarioId = scenarioId
    this.#engine.selectScenario(scenarioId)
    this.#calledAppointmentIds.clear()
    this.#lastSnapshot = undefined
    this.#schedulingResetRequired = true
    if (scenarioId === "next-failure") this.#engine.failNext()
  }

  #entry(id: string) {
    const entry =
      this.#engine.get(id) ?? this.#lastSnapshot?.entries.find((candidate) => candidate.id === id)
    if (!entry) throw new ServiceDeskTransitionError("Atendimento não encontrado.")
    if (entry.appointmentId && this.#calledAppointmentIds.has(entry.appointmentId)) {
      return { ...entry, stage: "called" as const }
    }
    return entry
  }

  #assertWalkIn(input: WalkInInput) {
    const snapshot = this.#lastSnapshot
    const service = snapshot?.services.find(({ id }) => id === input.serviceId)
    if (!service) throw new ServiceDeskTransitionError("Escolha um serviço disponível.")
    if (input.preferenceKind === "specific") {
      if (!input.professionalId) {
        throw new ServiceDeskTransitionError("Escolha o profissional específico.")
      }
      this.#assertEligible(
        { ...input, id: "pending", source: "walk-in", stage: "waiting" },
        input.professionalId,
      )
    }
  }

  #assertEligible(entry: QueueEntry, professionalId: string) {
    const snapshot = this.#lastSnapshot
    const service = snapshot?.services.find(({ id }) => id === entry.serviceId)
    const professional = snapshot?.professionals.find(({ id }) => id === professionalId)
    if (
      !service ||
      !professional ||
      !service.eligibleProfessionalIds.includes(professionalId) ||
      snapshot?.unavailableProfessionalIds.includes(professionalId)
    ) {
      throw new ServiceDeskTransitionError(
        "O profissional não está disponível para este serviço. Escolha outro profissional.",
      )
    }
  }

  #assertGeneration(generation: number) {
    if (generation !== this.#generation) {
      throw new ServiceDeskTransitionError(
        "A fila mudou durante a operação. Revise os dados e tente novamente.",
      )
    }
  }

  #rememberScheduledEntry(entry: QueueEntry) {
    if (!this.#lastSnapshot) return
    this.#lastSnapshot = {
      ...this.#lastSnapshot,
      entries: this.#lastSnapshot.entries.map((candidate) =>
        candidate.id === entry.id ? entry : candidate,
      ),
    }
  }

  async #withScheduling<TResult>(operation: () => Promise<TResult>) {
    const previous = this.#schedulingTail
    let release = () => {}
    this.#schedulingTail = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await operation()
    } finally {
      release()
    }
  }
}

export function createSourceClock(anchor = new Date()): Clock {
  const source = new Date(anchor)
  source.setHours(11, 30, 0, 0)
  return { now: () => new Date(source) }
}

function schedulingScenario(scenarioId: ServiceDeskScenarioId) {
  if (scenarioId === "empty") return "empty"
  if (scenarioId === "dense") return "dense"
  if (scenarioId === "slow") return "slow"
  return "normal"
}
