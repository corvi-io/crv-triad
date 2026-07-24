import type { ClientRepository } from "@/modules/clients/contracts"
import type {
  ReportingFactSnapshot,
  ReportingQuery,
  ReportingRepository,
  ReportingScenarioId,
} from "@/modules/reporting/contracts"
import { ReportingOperationInvalidatedError } from "@/modules/reporting/contracts"
import { deriveReportingResult } from "@/modules/reporting/projection"
import type {
  PaidSale,
  RevenueOperationsRepository,
  TenderMethod,
} from "@/modules/revenue-operations/contracts"
import type { Appointment, SchedulingRepository } from "@/modules/scheduling/contracts"

const SOURCE_DATE = "2026-07-24"

export class ReportingMemoryRepository implements ReportingRepository {
  private readonly clients: ClientRepository
  private readonly revenue: RevenueOperationsRepository
  private readonly scheduling: SchedulingRepository
  private activeScenario: ReportingScenarioId = "typical"
  private facts?: readonly ReportingFactSnapshot[]
  private failedNext = false
  private generation = 0

  constructor(
    scheduling: SchedulingRepository,
    revenue: RevenueOperationsRepository,
    clients: ClientRepository,
  ) {
    this.scheduling = scheduling
    this.revenue = revenue
    this.clients = clients
  }

  today() {
    return SOURCE_DATE
  }

  async getReport(query: ReportingQuery) {
    this.selectScenario(query.scenarioId)
    const generation = this.generation
    if (query.scenarioId === "persistent-error") {
      throw new Error("Os relatórios não puderam ser carregados neste cenário.")
    }
    if (query.scenarioId === "next-failure" && !this.failedNext) {
      throw new Error("A próxima consulta falhou como previsto. Tente novamente.")
    }
    if (query.scenarioId === "slow") await delay(900)
    this.assertGeneration(generation)

    const facts = await this.getFacts()
    this.assertGeneration(generation)
    const scenarioFacts = factsForScenario(facts, query.scenarioId)
    const result = deriveReportingResult({
      customerDataAvailable: query.scenarioId !== "partial",
      facts: scenarioFacts,
      filters: query.filters,
      sourceDate: SOURCE_DATE,
    })
    this.assertGeneration(generation)
    return result
  }

  async reset() {
    this.generation += 1
    this.facts = undefined
    this.failedNext = false
    await Promise.all([this.revenue.reset(), this.scheduling.reset()])
  }

  retry() {
    if (this.activeScenario === "next-failure") this.failedNext = true
  }

  private async getFacts() {
    if (this.facts) return this.facts

    await this.revenue.reset()
    const [schedule, clientPage] = await Promise.all([
      this.scheduling.getDay({
        endDate: SOURCE_DATE,
        scenarioId: "all-statuses",
        startDate: "2026-07-01",
        unitId: "centro",
      }),
      this.clients.list({
        contact: "all",
        duplicate: "all",
        page: 1,
        pageSize: 50,
        scenarioId: "typical",
        search: "",
        sort: { direction: "asc", field: "name" },
        status: "active",
        tag: "",
      }),
    ])

    const scheduledSale = await this.revenue.completePayment({
      operationId: "reporting-scheduled-sale",
      sessionId: "session-walk-in-checkout-scheduled",
    })
    await this.revenue.getOpenDaySummary({
      date: SOURCE_DATE,
      scenarioId: "cash-typical",
      unitId: "centro",
    })
    const paidSales = await this.revenue.listPaidSales()
    const appointments = schedule.appointments
    const serviceById = new Map(schedule.services.map((service) => [service.id, service]))
    const professionalById = new Map(
      schedule.professionals.map((professional) => [professional.id, professional]),
    )
    const clientIds = new Set(clientPage.items.map(({ id }) => id))
    const scheduledFacts = appointments.map((appointment) =>
      appointmentFact(appointment, serviceById, professionalById),
    )
    const saleDates = ["2026-07-03", "2026-07-10", "2026-07-17", SOURCE_DATE]
    const paidFacts = paidSales.flatMap((sale, index) =>
      saleFacts(
        sale,
        saleDates[index % saleDates.length] ?? SOURCE_DATE,
        appointments,
        clientIds,
        sale.appointmentId ? "customer-kanban-05" : undefined,
      ),
    )

    const linkedFacts = paidFacts.filter(({ saleId }) => saleId === scheduledSale.id)
    const priorLinkedFacts = linkedFacts.map((fact) => ({
      ...fact,
      date: "2026-06-20",
      id: `prior-${fact.id}`,
      saleId: `prior-${fact.saleId}`,
    }))
    this.facts = [...scheduledFacts, ...paidFacts, ...priorLinkedFacts]
    return this.facts
  }

  private selectScenario(scenario: ReportingScenarioId) {
    if (scenario === this.activeScenario) return
    this.activeScenario = scenario
    this.generation += 1
    this.failedNext = false
  }

  private assertGeneration(generation: number) {
    if (generation !== this.generation) throw new ReportingOperationInvalidatedError()
  }
}

function appointmentFact(
  appointment: Appointment,
  serviceById: ReadonlyMap<string, { name: string }>,
  professionalById: ReadonlyMap<string, { name: string }>,
): ReportingFactSnapshot {
  return {
    appointmentStatus: appointment.status,
    commissionCents: 0,
    commissionRateBasisPoints: 0,
    customerAnalysisKey: appointment.clientId,
    date: appointment.date,
    id: `appointment-${appointment.id}`,
    professionalId: appointment.professionalId,
    professionalName:
      professionalById.get(appointment.professionalId)?.name ?? "Profissional não identificado",
    serviceId: appointment.serviceId,
    serviceName: serviceById.get(appointment.serviceId)?.name ?? "Serviço não identificado",
    serviceNetCents: 0,
  }
}

function saleFacts(
  sale: PaidSale,
  date: string,
  appointments: readonly Appointment[],
  knownClientIds: ReadonlySet<string>,
  acceptedAnalysisKey?: string,
): ReportingFactSnapshot[] {
  const appointment = sale.appointmentId
    ? appointments.find(({ id }) => id === sale.appointmentId)
    : undefined
  const customerAnalysisKey =
    acceptedAnalysisKey ??
    (appointment && knownClientIds.has(appointment.clientId) ? appointment.clientId : undefined)
  const commissionByLine = new Map(sale.commissions.map((snapshot) => [snapshot.lineId, snapshot]))
  const paymentMethod = primaryPaymentMethod(sale)

  return sale.lines.map((line) => {
    const commission = commissionByLine.get(line.id)
    return {
      appointmentStatus: "completed",
      commissionCents: commission?.commissionCents ?? 0,
      commissionRateBasisPoints:
        commission?.rule.kind === "percentage" ? commission.rule.rateBasisPoints : 0,
      customerAnalysisKey,
      date,
      id: `${sale.id}-${line.id}`,
      paymentMethod,
      professionalId: line.professionalId,
      professionalName: line.professionalName,
      saleId: sale.id,
      serviceId: line.serviceId,
      serviceName: line.serviceName,
      serviceNetCents: line.netCents,
    }
  })
}

function primaryPaymentMethod(sale: PaidSale): TenderMethod | undefined {
  return [...sale.tenders].sort(
    (left, right) =>
      right.appliedCents - left.appliedCents || left.method.localeCompare(right.method),
  )[0]?.method
}

function factsForScenario(
  facts: readonly ReportingFactSnapshot[],
  scenario: ReportingScenarioId,
): readonly ReportingFactSnapshot[] {
  if (scenario === "empty") return []
  if (scenario === "zero-paid-sales") return facts.filter(({ saleId }) => !saleId)
  if (scenario === "unknown-customers") {
    return facts.map((fact) => ({ ...fact, customerAnalysisKey: undefined }))
  }
  if (scenario === "ties") {
    return facts.map((fact, index) =>
      fact.saleId && index % 2 === 0
        ? {
            ...fact,
            serviceId: "service-tie",
            serviceName: "Acabamento clássico",
          }
        : fact,
    )
  }
  if (scenario === "long-labels") {
    return facts.map((fact) => ({
      ...fact,
      professionalName: `${fact.professionalName} da Unidade Centro de Formação Profissional`,
      serviceName: `${fact.serviceName} com acabamento detalhado e consultoria de estilo`,
    }))
  }
  if (scenario === "edge") {
    return facts.map((fact, index) =>
      index % 3 === 0 ? { ...fact, customerAnalysisKey: undefined } : fact,
    )
  }
  return facts
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
