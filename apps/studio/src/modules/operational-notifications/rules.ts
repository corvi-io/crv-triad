import type {
  NotificationCategory,
  NotificationDestination,
  NotificationSeverity,
  OperationalNotification,
} from "./contracts"

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
