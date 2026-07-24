import { differenceInMinutes, format, parseISO } from "date-fns"
import type { ServiceSession } from "./contracts"

export const SESSION_NOTES_MAX_LENGTH = 500

export function formatSessionElapsed(startedAt: string, now: string) {
  const minutes = Math.max(0, differenceInMinutes(parseISO(now), parseISO(startedAt)))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${minutes} min`
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`
}

export function formatSessionTime(value: string) {
  return format(parseISO(value), "HH:mm")
}

export function isSessionReadyToFinish(session: ServiceSession) {
  if (session.status !== "in-progress" || session.items.length === 0) return false
  const professionals = new Set(session.professionals.map(({ id }) => id))
  const unavailable = new Set(session.unavailableProfessionalIds)
  const serviceById = new Map(session.services.map((service) => [service.id, service]))
  return session.items.every(({ professionalId, serviceId }) => {
    const service = serviceById.get(serviceId)
    return (
      professionals.has(professionalId) &&
      !unavailable.has(professionalId) &&
      Boolean(service?.eligibleProfessionalIds.includes(professionalId))
    )
  })
}
