import { MemoryScenarioEngine } from "@/dev/mock-engine/memory-scenario-engine"
import type {
  AppointmentInput,
  Professional,
  ScheduleDay,
  ScheduleDayQuery,
  SchedulePeriod,
  SchedulingRepository,
  Service,
} from "@/modules/scheduling/contracts"
import { ScheduleConflictError } from "@/modules/scheduling/contracts"
import { schedulingScenarios } from "./scenarios"

const baseProfessionals: readonly Professional[] = [
  { id: "professional-ana", name: "Ana Lima" },
  { id: "professional-bruno", name: "Bruno Rocha" },
  { id: "professional-carla", name: "Carla Nascimento" },
]
const extraProfessionals: readonly Professional[] = Array.from({ length: 7 }, (_, index) => ({
  id: `professional-extra-${index + 1}`,
  name: `Profissional Sintético ${index + 1}`,
}))
const services: readonly Service[] = [
  {
    id: "service-cut",
    name: "Corte clássico",
    durationMinutes: 45,
    priceCents: 5500,
    eligibleProfessionalIds: baseProfessionals.map(({ id }) => id),
  },
  {
    id: "service-beard",
    name: "Barba e acabamento",
    durationMinutes: 30,
    priceCents: 4000,
    eligibleProfessionalIds: ["professional-bruno", "professional-carla"],
  },
  {
    id: "service-combo",
    name: "Corte, barba e cuidado completo",
    durationMinutes: 75,
    priceCents: 9000,
    eligibleProfessionalIds: ["professional-ana", "professional-carla"],
  },
]

export class SchedulingMemoryRepository implements SchedulingRepository {
  readonly #engine = new MemoryScenarioEngine(schedulingScenarios, "normal")

  scenarios() {
    return schedulingScenarios.map(({ description, id, label }) => ({ description, id, label }))
  }

  async getDay(query: ScheduleDayQuery): Promise<ScheduleDay> {
    if (query.scenarioId && query.scenarioId !== this.#engine.snapshot.scenarioId) {
      this.#engine.selectScenario(query.scenarioId)
      if (query.scenarioId === "next-failure") this.#engine.failNext()
    }
    return this.#engine.execute("list", () => {
      const scenarioId = this.#engine.snapshot.scenarioId
      const professionals =
        scenarioId === "many-professionals"
          ? [...baseProfessionals, ...extraProfessionals]
          : baseProfessionals
      return {
        appointments: this.#engine
          .values()
          .filter(
            (item) =>
              item.date === query.date &&
              (!query.professionalId || item.professionalId === query.professionalId) &&
              (!query.status || item.status === query.status),
          ),
        date: query.date,
        endTime: "18:00",
        periods: periodsFor(scenarioId),
        professionals: query.professionalId
          ? professionals.filter(({ id }) => id === query.professionalId)
          : professionals,
        services,
        startTime: "08:00",
        unitName: "Unidade sintética Centro",
      }
    })
  }

  async create(input: AppointmentInput) {
    return this.#engine.execute("create", () => {
      this.#assertValid(input)
      return this.#engine.create(input, "appointment")
    })
  }

  async update(id: string, input: AppointmentInput) {
    return this.#engine.execute("update", () => {
      this.#assertValid(input, id)
      const updated = this.#engine.update(id, input)
      if (!updated) throw new Error("Agendamento não encontrado.")
      return updated
    })
  }

  async cancel(id: string) {
    return this.#engine.execute("update", () => {
      const updated = this.#engine.update(id, { status: "canceled" })
      if (!updated) throw new Error("Agendamento não encontrado.")
      return updated
    })
  }

  async selectScenario(id: string) {
    this.#engine.selectScenario(id)
    if (id === "next-failure") this.#engine.failNext()
  }

  async reset() {
    this.#engine.reset()
  }

  #assertValid(input: AppointmentInput, ignoredId?: string) {
    const professional = baseProfessionals.find(({ id }) => id === input.professionalId)
    const service = services.find(({ id }) => id === input.serviceId)
    if (!professional || !service?.eligibleProfessionalIds.includes(input.professionalId)) {
      throw new ScheduleConflictError("O profissional não está disponível para este serviço.")
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
    const overlapsUnavailablePeriod = periodsFor(this.#engine.snapshot.scenarioId).some(
      (period) =>
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
          item.date === input.date &&
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

function periodsFor(scenarioId: string): readonly SchedulePeriod[] {
  const base: SchedulePeriod[] = [
    {
      id: "break-bruno",
      kind: "break",
      label: "Pausa",
      professionalId: "professional-bruno",
      start: "12:00",
      end: "13:00",
    },
    {
      id: "blocked-carla",
      kind: "blocked",
      label: "Bloqueado",
      professionalId: "professional-carla",
      start: "16:00",
      end: "17:00",
    },
  ]
  if (scenarioId === "walk-in")
    base.push({
      id: "walk-in-ana",
      kind: "walk-in",
      label: "Encaixe aguardando",
      professionalId: "professional-ana",
      start: "11:30",
      end: "11:45",
    })
  if (scenarioId === "blocked")
    base.push({
      id: "blocked-ana",
      kind: "blocked",
      label: "Indisponível",
      professionalId: "professional-ana",
      start: "09:00",
      end: "12:00",
    })
  return base
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}
