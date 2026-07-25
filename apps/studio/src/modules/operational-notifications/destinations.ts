import type { NotificationDestination } from "./contracts"

const opaqueId = /^[a-z0-9][a-z0-9-]{0,95}$/i

export function resolveNotificationDestination(
  destination: NotificationDestination,
): string | null {
  if (destination.kind === "notifications") return "/notifications"
  if (destination.kind === "agenda") {
    return destination.appointmentId && opaqueId.test(destination.appointmentId)
      ? `/agenda?appointment=${encodeURIComponent(destination.appointmentId)}`
      : "/agenda"
  }
  if (!opaqueId.test(destination.sessionId)) return null
  if (destination.kind === "checkout")
    return `/service-desk/${encodeURIComponent(destination.sessionId)}/checkout`
  return `/service-desk/${encodeURIComponent(destination.sessionId)}`
}
