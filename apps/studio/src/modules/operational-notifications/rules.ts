import type { Checkout, PaidSale } from "@/modules/revenue-operations/contracts"
import type { Appointment, SchedulePeriod, SchedulingUnitId } from "@/modules/scheduling/contracts"
import type { QueueEntry, ServiceSession } from "@/modules/service-desk/contracts"
import type {
  NotificationCategory,
  NotificationDestination,
  NotificationSeverity,
  OperationalNotification,
} from "./contracts"

export const EXCESSIVE_WAIT_MINUTES = 15
export const UPCOMING_APPOINTMENT_MINUTES = 10
export const OVERDUE_SERVICE_TOLERANCE_MINUTES = 15

const minuteMs = 60_000

export type AppointmentOperationalEvent = {
  appointmentId: string
  date: string
  id: string
  kind: "changed" | "canceled"
  occurredAt: string
  resolvedAt?: string
  unitId: SchedulingUnitId
  version: number
}

export type SchedulingNotificationSourceSnapshot = {
  appointments: readonly Appointment[]
  events: readonly AppointmentOperationalEvent[]
  periods: readonly SchedulePeriod[]
}

export type ServiceNotificationSourceSnapshot = {
  queue: readonly QueueEntry[]
  sessions: readonly ServiceSession[]
}

export type PaymentNotificationSourceSnapshot = {
  checkouts: readonly Checkout[]
  paidSales: readonly PaidSale[]
}

export type OperationalNotificationSourceSnapshot = {
  now: string
  payments: PaymentNotificationSourceSnapshot
  scheduling: SchedulingNotificationSourceSnapshot
  service: ServiceNotificationSourceSnapshot
}

export type OperationalNotificationSourceQuery = {
  scenarioId: string
}

export type OperationalNotificationSources = {
  payments: {
    getSnapshot(
      query: OperationalNotificationSourceQuery,
    ): Promise<PaymentNotificationSourceSnapshot>
  }
  scheduling: {
    getSnapshot(
      query: OperationalNotificationSourceQuery,
    ): Promise<SchedulingNotificationSourceSnapshot>
  }
  service: {
    getSnapshot(
      query: OperationalNotificationSourceQuery,
    ): Promise<ServiceNotificationSourceSnapshot>
  }
  clock: {
    now(): string
  }
}

export type NotificationSourceFact = {
  applies: boolean
  category: NotificationCategory
  dedupeKey: string
  destination: NotificationDestination
  detail: string
  id: string
  occurredAt: string
  resolvedAt?: string
  severity: NotificationSeverity
  summary: string
  unitId: string
  version: number
}

const severityOrder: Record<NotificationSeverity, number> = {
  critical: 0,
  attention: 1,
  informational: 2,
}

export async function readOperationalNotificationSources(
  sources: OperationalNotificationSources,
  scenarioId: string,
): Promise<OperationalNotificationSourceSnapshot> {
  const query = { scenarioId }
  const [scheduling, service, payments] = await Promise.all([
    sources.scheduling.getSnapshot(query),
    sources.service.getSnapshot(query),
    sources.payments.getSnapshot(query),
  ])
  return { now: sources.clock.now(), payments, scheduling, service }
}

export function deriveNotificationSourceFacts(
  source: OperationalNotificationSourceSnapshot,
): NotificationSourceFact[] {
  return [
    ...deriveSchedulingFacts(source.scheduling, source.now),
    ...deriveServiceFacts(source.service, source.now),
    ...derivePaymentFacts(source.payments),
  ]
}

function deriveSchedulingFacts(
  source: SchedulingNotificationSourceSnapshot,
  now: string,
): NotificationSourceFact[] {
  const nowMs = Date.parse(now)
  const appointments = source.appointments.filter(
    ({ status }) => status !== "canceled" && status !== "completed" && status !== "no-show",
  )
  const upcoming = appointments
    .filter((appointment) => {
      const startMs = appointmentStartMs(appointment, now)
      const delta = startMs - nowMs
      return delta >= 0 && delta <= UPCOMING_APPOINTMENT_MINUTES * minuteMs
    })
    .map(
      (appointment): NotificationSourceFact => ({
        applies: true,
        category: "upcoming-appointment",
        dedupeKey: `upcoming:${appointment.id}`,
        destination: {
          appointmentId: appointment.id,
          date: appointment.date,
          kind: "agenda",
        },
        detail: `O horário começa dentro de ${UPCOMING_APPOINTMENT_MINUTES} minutos.`,
        id: `appointment:${appointment.id}:upcoming`,
        occurredAt: now,
        severity: "informational",
        summary: "Próximo atendimento se aproxima",
        unitId: appointment.unitId,
        version: 1,
      }),
    )

  const conflicts: NotificationSourceFact[] = []
  const sorted = appointments.toSorted(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.professionalId.localeCompare(right.professionalId) ||
      left.start.localeCompare(right.start) ||
      left.id.localeCompare(right.id),
  )
  for (let index = 0; index < sorted.length; index += 1) {
    const appointment = sorted[index]
    const startMs = appointmentStartMs(appointment, now)
    const endMs = startMs + appointment.durationMinutes * minuteMs
    const overlap = sorted.slice(index + 1).find((candidate) => {
      if (
        candidate.date !== appointment.date ||
        candidate.professionalId !== appointment.professionalId
      )
        return false
      const candidateStartMs = appointmentStartMs(candidate, now)
      return candidateStartMs < endMs
    })
    if (!overlap) continue
    const pair = [appointment.id, overlap.id].toSorted()
    conflicts.push({
      applies: true,
      category: "scheduling-conflict",
      dedupeKey: `conflict:${pair.join(":")}`,
      destination: {
        appointmentId: appointment.id,
        date: appointment.date,
        kind: "agenda",
      },
      detail: "Dois horários do mesmo profissional ocupam o mesmo intervalo. Revise a Agenda.",
      id: `appointments:${pair.join(":")}:conflict`,
      occurredAt: now,
      severity: "critical",
      summary: "Conflito identificado na Agenda",
      unitId: appointment.unitId,
      version: 1,
    })
  }

  const blocked = source.periods
    .filter(({ kind }) => kind === "blocked")
    .map(
      (period): NotificationSourceFact => ({
        applies: true,
        category: "blocked-time",
        dedupeKey: `blocked:${period.id}`,
        destination: { kind: "agenda" },
        detail: "Há um bloqueio ativo no período operacional.",
        id: `period:${period.id}:blocked`,
        occurredAt: now,
        severity: "informational",
        summary: "Horário bloqueado na Agenda",
        unitId: source.appointments[0]?.unitId ?? "centro",
        version: 1,
      }),
    )

  const events = source.events.map(
    (event): NotificationSourceFact => ({
      applies: !event.resolvedAt,
      category: "appointment-change",
      dedupeKey: `event:${event.id}`,
      destination: {
        appointmentId: event.appointmentId,
        date: event.date,
        kind: "agenda",
      },
      detail:
        event.kind === "canceled"
          ? "Um cancelamento explícito foi registrado na origem."
          : "Uma alteração explícita de horário foi registrada na origem.",
      id: event.id,
      occurredAt: event.occurredAt,
      resolvedAt: event.resolvedAt,
      severity: "informational",
      summary: event.kind === "canceled" ? "Agendamento cancelado" : "Agendamento alterado",
      unitId: event.unitId,
      version: event.version,
    }),
  )

  return [...conflicts, ...upcoming, ...blocked, ...events]
}

function deriveServiceFacts(
  source: ServiceNotificationSourceSnapshot,
  now: string,
): NotificationSourceFact[] {
  const nowMs = Date.parse(now)
  const waitFacts = source.queue
    .filter(({ stage }) => stage === "waiting" || stage === "called")
    .filter(({ arrivalAt }) => nowMs - Date.parse(arrivalAt) >= EXCESSIVE_WAIT_MINUTES * minuteMs)
    .map(
      (entry): NotificationSourceFact => ({
        applies: true,
        category: "excessive-wait",
        dedupeKey: `wait:${entry.id}`,
        destination: entry.sessionId
          ? { kind: "service-desk", sessionId: entry.sessionId }
          : { kind: "notifications" },
        detail: `A espera atingiu o limite operacional de ${EXCESSIVE_WAIT_MINUTES} minutos.`,
        id: `queue:${entry.id}:wait`,
        occurredAt: entry.arrivalAt,
        severity: "critical",
        summary: "Espera acima de 15 minutos",
        unitId: entry.unitId,
        version: 1,
      }),
    )
  const overdueFacts = source.sessions
    .filter(({ status }) => status === "in-progress")
    .filter((session) => {
      const duration = session.items.reduce(
        (total, item) =>
          total + (session.services.find(({ id }) => id === item.serviceId)?.durationMinutes ?? 0),
        0,
      )
      return (
        duration > 0 &&
        nowMs - Date.parse(session.startedAt) >=
          (duration + OVERDUE_SERVICE_TOLERANCE_MINUTES) * minuteMs
      )
    })
    .map(
      (session): NotificationSourceFact => ({
        applies: true,
        category: "overdue-service",
        dedupeKey: `overdue:${session.id}`,
        destination: { kind: "service-desk", sessionId: session.id },
        detail: `O tempo estimado e a tolerância de ${OVERDUE_SERVICE_TOLERANCE_MINUTES} minutos foram ultrapassados.`,
        id: `session:${session.id}:overdue`,
        occurredAt: session.startedAt,
        severity: "attention",
        summary: "Atendimento precisa de atualização",
        unitId: session.unitId,
        version: 1,
      }),
    )
  return [...waitFacts, ...overdueFacts]
}

function derivePaymentFacts(source: PaymentNotificationSourceSnapshot): NotificationSourceFact[] {
  const paidByCheckoutId = new Map(
    source.paidSales.map((sale) => [sale.id.replace(/^paid-sale-/, ""), sale]),
  )
  return source.checkouts.map((checkout) => {
    const sale = paidByCheckoutId.get(checkout.id)
    const isPaid = checkout.status === "paid" || Boolean(sale)
    return {
      applies: !isPaid,
      category: "pending-payment",
      dedupeKey: `payment:${checkout.id}`,
      destination: { kind: "checkout", sessionId: checkout.id },
      detail: isPaid
        ? "O pagamento foi registrado na origem operacional."
        : "O atendimento está pronto e ainda não teve o pagamento registrado.",
      id: `checkout:${checkout.id}:payment`,
      occurredAt: checkout.finishedAt,
      resolvedAt: sale?.completedAt,
      severity: "attention",
      summary: isPaid ? "Pagamento concluído" : "Pagamento aguardando registro",
      unitId: checkout.unitId,
      version: isPaid ? 2 : 1,
    }
  })
}

function appointmentStartMs(appointment: Appointment, now: string) {
  const suffix = now.endsWith("Z") ? "Z" : now.slice(-6)
  return Date.parse(`${appointment.date}T${appointment.start}:00${suffix}`)
}

export function projectOperationalNotifications(
  facts: readonly NotificationSourceFact[],
  readIds: ReadonlySet<string>,
): OperationalNotification[] {
  const deduped = new Map<string, NotificationSourceFact>()
  for (const fact of facts) {
    const current = deduped.get(fact.dedupeKey)
    if (
      !current ||
      fact.version > current.version ||
      (fact.version === current.version && fact.occurredAt > current.occurredAt)
    ) {
      deduped.set(fact.dedupeKey, fact)
    }
  }

  return [...deduped.values()]
    .map((fact) => ({
      category: fact.category,
      dedupeKey: fact.dedupeKey,
      destination: fact.destination,
      detail: fact.detail,
      id: `notification:${fact.dedupeKey}`,
      isRead: readIds.has(`notification:${fact.dedupeKey}`),
      lifecycle: fact.applies ? ("active" as const) : ("resolved" as const),
      occurredAt: fact.occurredAt,
      resolvedAt: fact.resolvedAt,
      severity: fact.severity,
      sourceFactId: fact.id,
      sourceVersion: fact.version,
      summary: fact.summary,
      unitId: fact.unitId,
    }))
    .toSorted(compareNotifications)
}

export function compareNotifications(a: OperationalNotification, b: OperationalNotification) {
  const lifecycle = Number(a.lifecycle === "resolved") - Number(b.lifecycle === "resolved")
  if (lifecycle !== 0) return lifecycle
  const severity = severityOrder[a.severity] - severityOrder[b.severity]
  if (severity !== 0) return severity
  const occurrence = b.occurredAt.localeCompare(a.occurredAt)
  return occurrence || a.id.localeCompare(b.id)
}

export const notificationCategoryLabels: Record<NotificationCategory, string> = {
  "appointment-change": "Agendamento alterado ou cancelado",
  "blocked-time": "Horário bloqueado",
  "excessive-wait": "Cliente aguardando há muito tempo",
  "overdue-service": "Atendimento aberto sem finalização",
  "pending-payment": "Pagamento pendente",
  "scheduling-conflict": "Conflito de agenda",
  "upcoming-appointment": "Próximo atendimento em 10 minutos",
}
