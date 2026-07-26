import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"
import { MemoryScenarioEngine } from "@/dev/mock-engine/memory-scenario-engine"
import type {
  AppointmentCatalogPort,
  AppointmentInput,
  AppointmentTransitionInput,
  Professional,
  ScheduleDay,
  ScheduleDayQuery,
  SchedulePeriod,
  SchedulingRepository,
  Service,
} from "@/modules/scheduling/contracts"
import { ScheduleConflictError, ScheduleRangeError } from "@/modules/scheduling/contracts"
import { SCHEDULING_FIXTURE_DATE, schedulingScenarios } from "./scenarios"

const baseProfessionals: readonly Professional[] = [
  { id: "professional-carlos", name: "Carlos Lima" },
  { id: "professional-bruno", name: "Bruno Rocha" },
  { id: "professional-ana", name: "Ana Clara" },
  { id: "professional-joao", name: "João Vitor" },
  { id: "professional-diego", name: "Diego Rodrigues" },
  { id: "professional-marcos", name: "Marcos Paulo" },
]
const extraProfessionals: readonly Professional[] = Array.from({ length: 7 }, (_, index) => ({
  id: `professional-extra-${index + 7}`,
  name: `Profissional Sintético ${index + 7}`,
}))
const allProfessionals = [...baseProfessionals, ...extraProfessionals]
const services: readonly Service[] = [
  {
    id: "service-hair-beard",
    name: "Cabelo & Barba",
    durationMinutes: 45,
    priceCents: 6500,
    eligibleProfessionalIds: allProfessionals.map(({ id }) => id),
  },
  {
    id: "service-fade",
    name: "Corte degradê",
    durationMinutes: 35,
    priceCents: 4500,
    eligibleProfessionalIds: allProfessionals.map(({ id }) => id),
  },
  {
    id: "service-cut-beard",
    name: "Corte & Barba",
    durationMinutes: 45,
    priceCents: 6500,
    eligibleProfessionalIds: allProfessionals.map(({ id }) => id),
  },
  {
    id: "service-simple-cut",
    name: "Corte simples",
    durationMinutes: 30,
    priceCents: 3500,
    eligibleProfessionalIds: allProfessionals.map(({ id }) => id),
  },
]

export class SchedulingMemoryRepository implements SchedulingRepository {
  readonly #engine = new MemoryScenarioEngine(schedulingScenarios, "normal")
  #mutationFailureArmed = false
  readonly #projectionDate: string
  readonly #catalog?: AppointmentCatalogPort
  #projectedScenarioId?: string

  constructor(projectionDate = format(new Date(), "yyyy-MM-dd"), catalog?: AppointmentCatalogPort) {
    this.#projectionDate = projectionDate
    this.#catalog = catalog
  }

  scenarios() {
    return schedulingScenarios.map(({ description, id, label }) => ({ description, id, label }))
  }

  async getRange(query: ScheduleDayQuery): Promise<ScheduleDay> {
    const rangeLength = differenceInCalendarDays(parseISO(query.endDate), parseISO(query.startDate))
    if (
      !Number.isFinite(rangeLength) ||
      (rangeLength !== 0 && rangeLength !== 6) ||
      (query.focusDate && (query.focusDate < query.startDate || query.focusDate > query.endDate))
    ) {
      throw new ScheduleRangeError("A Agenda aceita intervalos exatos de um ou sete dias.")
    }
    if (query.scenarioId && query.scenarioId !== this.#engine.snapshot.scenarioId) {
      this.#engine.selectScenario(query.scenarioId)
      if (query.scenarioId === "next-failure") this.#engine.failNext()
      this.#mutationFailureArmed = query.scenarioId === "transition-rollback"
    }
    const scenarioId = this.#engine.snapshot.scenarioId
    this.#projectScenarioAppointments(scenarioId)
    const scenarioAppointments = this.#engine.values()
    const professionals = scenarioId === "many-professionals" ? allProfessionals : baseProfessionals
    return this.#engine.execute("list", () => {
      const boundedAppointments = scenarioAppointments.filter(
        (item) =>
          item.date >= query.startDate &&
          item.date <= query.endDate &&
          item.unitId === query.unitId,
      )
      const professionalNames = new Map(professionals.map(({ id, name }) => [id, name]))
      const serviceNames = new Map(services.map(({ id, name }) => [id, name]))
      const needle = query.search?.trim().toLocaleLowerCase("pt-BR") ?? ""
      const dayAppointments = boundedAppointments.filter(
        (item) =>
          (!query.professionalIds?.length || query.professionalIds.includes(item.professionalId)) &&
          (!query.statusIds?.length || query.statusIds.includes(item.status)) &&
          (!query.serviceIds?.length || query.serviceIds.includes(item.serviceId)) &&
          (!query.clientIds?.length || query.clientIds.includes(item.clientId)) &&
          (needle.length === 0 ||
            [
              item.customerName,
              item.customerPhone,
              professionalNames.get(item.professionalId),
              serviceNames.get(item.serviceId),
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(needle)),
      )
      return {
        appointments: dayAppointments,
        date: query.focusDate ?? query.startDate,
        endTime: "18:00",
        occupancies: boundedAppointments
          .filter((item) => item.status !== "canceled" && item.status !== "no-show")
          .map(({ date, durationMinutes, id, professionalId, start }) => ({
            date,
            durationMinutes,
            id,
            professionalId,
            start,
          })),
        periods: periodsFor(scenarioId, this.#projectionDate).filter(
          ({ date }) => date >= query.startDate && date <= query.endDate,
        ),
        professionals: query.professionalIds?.length
          ? professionals.filter(({ id }) => query.professionalIds?.includes(id))
          : professionals,
        services,
        startTime: "08:00",
        unitName: query.unitId === "centro" ? "Centro" : "Artesão",
      }
    })
  }

  async create(input: AppointmentInput) {
    const resolved = await this.#catalog?.resolveAppointmentService(input)
    const next = { ...input, ...resolved }
    return this.#engine.execute("create", () => {
      this.#assertValid(next)
      return this.#engine.create(next, "appointment")
    })
  }

  async update(id: string, input: AppointmentInput) {
    if (this.#mutationFailureArmed) {
      this.#mutationFailureArmed = false
      this.#engine.failNext()
    }
    return this.#engine.execute("update", async () => {
      const current = this.#engine.get(id)
      if (!current) throw new Error("Agendamento não encontrado.")
      if (
        input.status !== current.status ||
        input.paymentStatus !== current.paymentStatus ||
        input.cancellationReason !== current.cancellationReason
      ) {
        throw new Error("Use a transição de status para alterar status ou pagamento.")
      }
      const allocationChanged =
        input.date !== current.date ||
        input.durationMinutes !== current.durationMinutes ||
        input.professionalId !== current.professionalId ||
        input.serviceId !== current.serviceId ||
        input.start !== current.start ||
        input.unitId !== current.unitId
      if (
        allocationChanged &&
        (current.status === "completed" ||
          current.status === "canceled" ||
          current.status === "no-show")
      ) {
        throw new ScheduleConflictError("Agendamentos finalizados não podem ser remarcados.")
      }
      const resolved = allocationChanged
        ? await this.#catalog?.resolveAppointmentService(input)
        : undefined
      const next = { ...input, ...resolved }
      if (allocationChanged) this.#assertValid(next, id)
      const updated = this.#engine.update(id, next)
      if (!updated) throw new Error("Agendamento não encontrado.")
      return updated
    })
  }

  async cancel(id: string, reason: "client" | "barbershop") {
    return this.transition({ cancellationReason: reason, id, status: "canceled" })
  }

  async transition(input: AppointmentTransitionInput) {
    if (this.#mutationFailureArmed) {
      this.#mutationFailureArmed = false
      this.#engine.failNext()
    }
    return this.#engine.execute("update", () => {
      const current = this.#engine.get(input.id)
      if (!current) throw new Error("Agendamento não encontrado.")
      if ((input.status === "canceled" || input.status === "no-show") && !input.cancellationReason)
        throw new Error("Informe o motivo do cancelamento ou no-show.")
      if (
        input.status === "completed" &&
        current.paymentStatus === "pending" &&
        !input.paymentStatus
      )
        throw new Error("Informe a decisão de pagamento antes de finalizar.")
      const updated = this.#engine.update(input.id, {
        cancellationReason:
          input.status === "canceled" || input.status === "no-show"
            ? input.cancellationReason
            : undefined,
        paymentStatus: input.paymentStatus ?? current.paymentStatus,
        status: input.status,
      })
      if (!updated) throw new Error("Agendamento não encontrado.")
      return updated
    })
  }

  async selectScenario(id: string) {
    this.#engine.selectScenario(id)
    this.#projectedScenarioId = undefined
    this.#projectScenarioAppointments(id)
    if (id === "next-failure") this.#engine.failNext()
    this.#mutationFailureArmed = id === "transition-rollback"
  }

  async reset() {
    this.#engine.reset()
    this.#projectedScenarioId = undefined
    this.#projectScenarioAppointments(this.#engine.snapshot.scenarioId)
    this.#mutationFailureArmed = this.#engine.snapshot.scenarioId === "transition-rollback"
  }

  #projectScenarioAppointments(scenarioId: string) {
    if (this.#projectedScenarioId === scenarioId) return

    const scenario = schedulingScenarios.find(({ id }) => id === scenarioId)
    const fixturesById = new Map(scenario?.records.map((record) => [record.id, record]))
    for (const appointment of this.#engine.values()) {
      const fixture = fixturesById.get(appointment.id)
      if (!fixture) continue
      const dayOffset = differenceInCalendarDays(
        parseISO(fixture.date),
        parseISO(SCHEDULING_FIXTURE_DATE),
      )
      const projectedFixtureDate = format(
        addDays(parseISO(this.#projectionDate), dayOffset),
        "yyyy-MM-dd",
      )
      if (appointment.date !== projectedFixtureDate) {
        this.#engine.update(appointment.id, { date: projectedFixtureDate })
      }
    }
    this.#projectedScenarioId = scenarioId
  }

  #assertValid(input: AppointmentInput, ignoredId?: string) {
    const professional = allProfessionals.find(({ id }) => id === input.professionalId)
    const service = services.find(({ id }) => id === input.serviceId)
    if (!professional || !service?.eligibleProfessionalIds.includes(input.professionalId)) {
      throw new ScheduleConflictError("O profissional não está disponível para este serviço.")
    }
    if (!/^\d{2}:(?:00|15|30|45)$/.test(input.start)) {
      throw new ScheduleConflictError("Use horários de 15 em 15 minutos (00, 15, 30 ou 45).")
    }
    const start = minutes(input.start)
    const end = start + input.durationMinutes
    if (start % 15 !== 0) {
      throw new ScheduleConflictError("Use horários de 15 em 15 minutos (00, 15, 30 ou 45).")
    }
    if (start < minutes("08:00") || end > minutes("18:00")) {
      throw new ScheduleConflictError(
        "Escolha um horário dentro do funcionamento, das 08:00 às 18:00.",
      )
    }
    const overlapsUnavailablePeriod = periodsFor(
      this.#engine.snapshot.scenarioId,
      this.#projectionDate,
    ).some(
      (period) =>
        period.date === input.date &&
        period.kind !== "walk-in" &&
        period.professionalId === input.professionalId &&
        start < minutes(period.end) &&
        end > minutes(period.start),
    )
    if (overlapsUnavailablePeriod) {
      throw new ScheduleConflictError(
        "Este horário coincide com uma pausa ou bloqueio do profissional. Escolha outro horário.",
      )
    }
    const overlaps = this.#engine
      .values()
      .some(
        (item) =>
          item.id !== ignoredId &&
          item.status !== "canceled" &&
          item.status !== "no-show" &&
          item.date === input.date &&
          item.unitId === input.unitId &&
          item.professionalId === input.professionalId &&
          start < minutes(item.start) + item.durationMinutes &&
          end > minutes(item.start),
      )
    if (overlaps)
      throw new ScheduleConflictError(
        "Este horário não tem espaço suficiente. Escolha outro horário.",
      )
  }
}

function periodsFor(scenarioId: string, date: string): readonly SchedulePeriod[] {
  const base: SchedulePeriod[] = []
  if (scenarioId === "walk-in")
    base.push({
      date,
      id: "walk-in-ana",
      kind: "walk-in",
      label: "Encaixe aguardando",
      professionalId: "professional-carlos",
      start: "11:30",
      end: "11:45",
    })
  if (scenarioId === "blocked")
    base.push(
      {
        date,
        id: "break-bruno",
        kind: "break",
        label: "Pausa",
        professionalId: "professional-bruno",
        start: "12:00",
        end: "13:00",
      },
      {
        date,
        id: "blocked-ana",
        kind: "blocked",
        label: "Indisponível",
        professionalId: "professional-ana",
        start: "09:00",
        end: "12:00",
      },
    )
  return base
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}
