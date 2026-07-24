import { format } from "date-fns"
import { MemoryScenarioEngine } from "@/dev/mock-engine/memory-scenario-engine"
import type { SchedulingRepository } from "@/modules/scheduling/contracts"
import type {
  AddServiceItemInput,
  AssignServiceItemProfessionalInput,
  QueueEntry,
  ServiceDeskQuery,
  ServiceDeskRepository,
  ServiceDeskScenarioId,
  ServiceDeskSnapshot,
  ServiceSession,
  SessionItemInput,
  SessionMutationInput,
  StartServiceInput,
  UpdateSessionNotesInput,
  WalkInInput,
} from "@/modules/service-desk/contracts"
import {
  ServiceDeskTransitionError,
  ServiceSessionNotFoundError,
} from "@/modules/service-desk/contracts"
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
  readonly #appliedSessionOperations = new Set<string>()
  readonly #seededScenarioSessions = new Set<string>()
  readonly #sessions = new Map<string, ServiceSession>()
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
      const allEntries = sortQueueEntries([...projected, ...this.#engine.values()]).map((entry) => {
        const session = this.#sessions.get(`session-${entry.id}`)
        return session?.status === "ready-for-payment"
          ? { ...entry, sessionId: session.id, stage: "ready-for-payment" as const }
          : session
            ? { ...entry, sessionId: session.id }
            : entry
      })
      const snapshot: ServiceDeskSnapshot = {
        entries: [],
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
      for (const entry of allEntries) {
        const professionalId = entry.assignedProfessionalId ?? entry.professionalId
        if (entry.stage === "in-service" && professionalId) {
          this.#seedScenarioSession(this.#createSession(entry, professionalId), query.scenarioId)
        }
      }
      const entriesWithSessions = allEntries.map((entry) => {
        const session = this.#sessions.get(`session-${entry.id}`)
        if (!session) return entry
        return {
          ...entry,
          sessionId: session.id,
          stage:
            session.status === "ready-for-payment"
              ? ("ready-for-payment" as const)
              : ("in-service" as const),
        }
      })
      this.#lastSnapshot = { ...snapshot, entries: entriesWithSessions }
      return {
        ...snapshot,
        entries: filterQueueEntries(
          entriesWithSessions,
          query,
          schedule.professionals,
          schedule.services,
        ),
      }
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

  async getSession(sessionId: string) {
    if (!this.#sessions.has(sessionId)) {
      const scenarioId = serviceSessionScenarioFromId(sessionId)
      if (scenarioId) {
        await this.getQueue({
          preference: "all",
          priority: "all",
          professionalId: "all",
          scenarioId,
          search: "",
          stage: "all",
          unitId: "centro",
        })
      }
    }
    const generation = this.#generation
    return this.#engine.execute("list", () => {
      this.#assertGeneration(generation)
      const session = this.#sessions.get(sessionId)
      if (!session) throw new ServiceSessionNotFoundError()
      return this.#withNow(session)
    })
  }

  async addServiceItem(input: AddServiceItemInput) {
    return this.#mutateSession("add", input, (session, now) => {
      this.#assertSessionActive(session)
      this.#assertSessionEligible(session, input.serviceId, input.professionalId)
      return {
        ...session,
        items: [
          ...session.items,
          {
            addedAt: now,
            id: `service-item-${input.operationId}`,
            professionalId: input.professionalId,
            serviceId: input.serviceId,
            source: "added" as const,
          },
        ],
      }
    })
  }

  async removeServiceItem(input: SessionItemInput) {
    return this.#mutateSession("remove", input, (session) => {
      this.#assertSessionActive(session)
      const item = session.items.find(({ id }) => id === input.itemId)
      if (!item) throw new ServiceDeskTransitionError("Serviço não encontrado.")
      if (item.source === "initial") {
        throw new ServiceDeskTransitionError("O serviço inicial não pode ser removido.")
      }
      return { ...session, items: session.items.filter(({ id }) => id !== input.itemId) }
    })
  }

  async assignServiceItemProfessional(input: AssignServiceItemProfessionalInput) {
    return this.#mutateSession("assign", input, (session) => {
      this.#assertSessionActive(session)
      const item = session.items.find(({ id }) => id === input.itemId)
      if (!item) throw new ServiceDeskTransitionError("Serviço não encontrado.")
      this.#assertSessionEligible(session, item.serviceId, input.professionalId)
      return {
        ...session,
        items: session.items.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, professionalId: input.professionalId }
            : candidate,
        ),
      }
    })
  }

  async updateSessionNotes(input: UpdateSessionNotesInput) {
    return this.#mutateSession("notes", input, (session) => {
      this.#assertSessionActive(session)
      const notes = input.notes.trim()
      if (notes.length > 500) {
        throw new ServiceDeskTransitionError("Use no máximo 500 caracteres nas observações.")
      }
      return { ...session, notes }
    })
  }

  async finishSession(input: SessionMutationInput) {
    return this.#mutateSession("finish", input, (session, now) => {
      if (session.status === "ready-for-payment") return session
      this.#assertSessionActive(session)
      for (const item of session.items) {
        this.#assertSessionEligible(session, item.serviceId, item.professionalId)
      }
      return {
        ...session,
        finishedAt: now,
        status: "ready-for-payment" as const,
      }
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
          sessionId: this.#createSession(entry, professionalId).id,
          stage: "in-service" as const,
        }
        this.#rememberScheduledEntry(updated)
        return updated
      }
      const updated = this.#engine.update(entry.id, {
        assignedProfessionalId: professionalId,
        sessionId: this.#createSession(entry, professionalId).id,
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
    this.#appliedSessionOperations.clear()
    this.#calledAppointmentIds.clear()
    this.#seededScenarioSessions.clear()
    this.#sessions.clear()
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
    this.#appliedSessionOperations.clear()
    this.#calledAppointmentIds.clear()
    this.#seededScenarioSessions.clear()
    this.#sessions.clear()
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

  #createSession(entry: QueueEntry, professionalId: string) {
    const id = `session-${entry.id}`
    const current = this.#sessions.get(id)
    if (current) return current
    const snapshot = this.#lastSnapshot
    if (!snapshot) throw new ServiceDeskTransitionError("Carregue a fila antes de iniciar.")
    const now = this.#clock.now().toISOString()
    const session: ServiceSession = {
      appointmentId: entry.appointmentId,
      customerName: entry.customerName,
      id,
      items: [
        {
          addedAt: now,
          id: `service-item-initial-${entry.id}`,
          professionalId,
          serviceId: entry.serviceId,
          source: "initial",
        },
      ],
      notes: "",
      now,
      professionals: snapshot.professionals,
      queueEntryId: entry.id,
      services: snapshot.services,
      source: entry.source,
      startedAt: now,
      status: "in-progress",
      unitId: entry.unitId,
      unitName: snapshot.unitName,
      unavailableProfessionalIds: snapshot.unavailableProfessionalIds,
    }
    this.#sessions.set(id, session)
    return session
  }

  async #mutateSession(
    kind: "add" | "assign" | "finish" | "notes" | "remove",
    input: SessionMutationInput,
    update: (session: ServiceSession, now: string) => ServiceSession,
  ) {
    const generation = this.#generation
    return this.#engine.execute("update", () => {
      this.#assertGeneration(generation)
      const session = this.#sessions.get(input.sessionId)
      if (!session) throw new ServiceSessionNotFoundError()
      const now = this.#assertSessionClock(session)
      const operationKey = `${generation}:${input.sessionId}:${kind}:${input.operationId}`
      if (this.#appliedSessionOperations.has(operationKey)) return { ...session, now }
      const updated = update(session, now)
      this.#assertGeneration(generation)
      this.#sessions.set(input.sessionId, updated)
      this.#appliedSessionOperations.add(operationKey)
      return { ...updated, now }
    })
  }

  #assertSessionClock(session: ServiceSession) {
    const now = this.#clock.now().toISOString()
    if (now < session.startedAt) {
      throw new ServiceDeskTransitionError(
        "O relógio de origem está anterior ao início do atendimento. Revise a fonte e tente novamente.",
      )
    }
    return now
  }

  #withNow(session: ServiceSession) {
    return { ...session, now: this.#clock.now().toISOString() }
  }

  #assertSessionActive(session: ServiceSession) {
    if (session.status !== "in-progress") {
      throw new ServiceDeskTransitionError("Este atendimento já está pronto para pagamento.")
    }
  }

  #assertSessionEligible(session: ServiceSession, serviceId: string, professionalId: string) {
    const service = session.services.find(({ id }) => id === serviceId)
    const professional = session.professionals.find(({ id }) => id === professionalId)
    if (
      !service ||
      !professional ||
      !service.eligibleProfessionalIds.includes(professionalId) ||
      session.unavailableProfessionalIds.includes(professionalId)
    ) {
      throw new ServiceDeskTransitionError(
        "O profissional não está disponível para este serviço. Escolha outro profissional.",
      )
    }
  }

  #seedScenarioSession(session: ServiceSession, scenarioId: ServiceDeskScenarioId) {
    const seedKey = `${this.#generation}:${scenarioId}:${session.id}`
    if (!scenarioId.startsWith("fulfillment-") || this.#seededScenarioSessions.has(seedKey)) return
    const secondProfessional =
      scenarioId === "fulfillment-multi-professional" ? "professional-bruno" : "professional-ana"
    if (["fulfillment-multiple", "fulfillment-multi-professional"].includes(scenarioId)) {
      this.#sessions.set(session.id, {
        ...session,
        items: [
          ...session.items,
          {
            addedAt: session.startedAt,
            id: `service-item-added-${scenarioId}`,
            professionalId: secondProfessional,
            serviceId: "service-fade",
            source: "added",
          },
        ],
      })
    }
    if (scenarioId === "fulfillment-long-running") {
      const startedAt = new Date(this.#clock.now())
      startedAt.setHours(7, 0, 0, 0)
      this.#sessions.set(session.id, { ...session, startedAt: startedAt.toISOString() })
    }
    if (scenarioId === "fulfillment-long-labels") {
      this.#sessions.set(session.id, {
        ...session,
        notes:
          "Observação sintética extensa para validar quebra de linha sem dados pessoais reais.",
      })
    }
    if (scenarioId === "fulfillment-no-eligible") {
      this.#sessions.set(session.id, {
        ...session,
        unavailableProfessionalIds: session.professionals.map(({ id }) => id),
      })
    }
    if (scenarioId === "fulfillment-ready") {
      this.#sessions.set(session.id, {
        ...session,
        finishedAt: session.now,
        status: "ready-for-payment",
      })
    }
    this.#seededScenarioSessions.add(seedKey)
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

function serviceSessionScenarioFromId(sessionId: string): ServiceDeskScenarioId | undefined {
  const marker = "session-walk-in-"
  if (!sessionId.startsWith(marker)) return undefined
  const candidate = sessionId.slice(marker.length) as ServiceDeskScenarioId
  return candidate.startsWith("fulfillment-") ? candidate : undefined
}
