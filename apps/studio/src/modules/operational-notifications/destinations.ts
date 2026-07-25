import type { NotificationDestination } from "./contracts"

const opaqueId = /^[a-z0-9][a-z0-9-]{0,95}$/i
const dateOnly = /^\d{4}-\d{2}-\d{2}$/

export type NotificationNavigationTarget =
  | { kind: "agenda"; appointment?: string; date?: string }
  | { kind: "checkout"; sessionId: string }
  | { kind: "notifications" }
  | { kind: "service-desk"; sessionId: string }

export function resolveNotificationDestination(
  destination: NotificationDestination,
): NotificationNavigationTarget | null {
  if (destination.kind === "notifications") return { kind: "notifications" }
  if (destination.kind === "agenda") {
    if (destination.appointmentId && !opaqueId.test(destination.appointmentId)) return null
    if (destination.date && !dateOnly.test(destination.date)) return null
    return {
      appointment: destination.appointmentId,
      date: destination.date,
      kind: "agenda",
    }
  }
  if (!opaqueId.test(destination.sessionId)) return null
  return { kind: destination.kind, sessionId: destination.sessionId }
}
