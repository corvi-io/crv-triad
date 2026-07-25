export const notificationCategories = [
  "excessive-wait",
  "upcoming-appointment",
  "scheduling-conflict",
  "overdue-service",
  "pending-payment",
  "blocked-time",
  "appointment-change",
] as const

export type NotificationCategory = (typeof notificationCategories)[number]
export type NotificationSeverity = "informational" | "attention" | "critical"
export type NotificationLifecycle = "active" | "resolved"

export type NotificationDestination =
  | { kind: "agenda"; appointmentId?: string }
  | { kind: "service-desk"; sessionId: string }
  | { kind: "checkout"; sessionId: string }
  | { kind: "notifications" }

export type OperationalNotification = {
  category: NotificationCategory
  dedupeKey: string
  destination: NotificationDestination
  detail: string
  id: string
  isRead: boolean
  lifecycle: NotificationLifecycle
  occurredAt: string
  resolvedAt?: string
  severity: NotificationSeverity
  sourceFactId: string
  sourceVersion: number
  summary: string
  unitId: string
}

export type NotificationQuery = {
  activeLimit?: number
  historyLimit?: number
  scenarioId?: string
}

export type NotificationPage = {
  active: readonly OperationalNotification[]
  activeCount: number
  generation: number
  resolved: readonly OperationalNotification[]
  unreadActiveCount: number
}

export type MarkReadInput = {
  id: string
  scenarioId?: string
}

export type OperationalNotificationsRepository = {
  getNotification(
    id: string,
    query?: Pick<NotificationQuery, "scenarioId">,
  ): Promise<OperationalNotification>
  getPreview(query?: NotificationQuery): Promise<NotificationPage>
  listNotifications(query?: NotificationQuery): Promise<NotificationPage>
  markAllActiveRead(query?: Pick<NotificationQuery, "scenarioId">): Promise<number>
  markRead(input: MarkReadInput): Promise<OperationalNotification>
  reset(query?: Pick<NotificationQuery, "scenarioId">): Promise<void>
  scenarios(): readonly { id: string; label: string }[]
}

export class OperationalNotificationError extends Error {
  readonly code: "load-failed" | "mark-read-failed" | "not-found" | "stale"

  constructor(message: string, code: "load-failed" | "mark-read-failed" | "not-found" | "stale") {
    super(message)
    this.code = code
    this.name = "OperationalNotificationError"
  }
}
