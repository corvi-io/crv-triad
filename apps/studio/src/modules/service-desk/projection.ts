import { differenceInMinutes, format, isAfter, isBefore, parseISO } from "date-fns"
import type { Appointment, Professional, Service } from "@/modules/scheduling/contracts"
import type {
  ProfessionalPreferenceKind,
  QueueEntry,
  QueuePriority,
  QueueStage,
  ServiceDeskQuery,
} from "./contracts"

export const queueStageLabels: Record<QueueStage, string> = {
  called: "Chamado",
  "in-service": "Em atendimento",
  "ready-for-payment": "Pronto para pagamento",
  waiting: "Aguardando",
}

export const queuePriorityLabels: Record<QueuePriority, string> = {
  "fit-in": "Encaixe",
  normal: "Normal",
}

export const professionalPreferenceLabels: Record<ProfessionalPreferenceKind, string> = {
  "first-available": "Primeiro disponível",
  specific: "Profissional específico",
}

export function appointmentDateTime(appointment: Appointment) {
  return parseISO(`${appointment.date}T${appointment.start}:00`)
}

export function appointmentEndDateTime(appointment: Appointment) {
  const start = appointmentDateTime(appointment)
  return new Date(start.getTime() + appointment.durationMinutes * 60_000)
}

export function isAppointmentActiveAt(appointment: Appointment, now: Date) {
  const start = appointmentDateTime(appointment)
  const end = appointmentEndDateTime(appointment)
  return !isBefore(now, start) && isBefore(now, end)
}

export function projectScheduledEntries({
  appointments,
  calledAppointmentIds,
  now,
}: {
  appointments: readonly Appointment[]
  calledAppointmentIds: ReadonlySet<string>
  now: Date
}): QueueEntry[] {
  return appointments.flatMap((appointment) => {
    if (!["arrived", "waiting", "in-progress"].includes(appointment.status)) return []
    const arrivalAt = appointmentDateTime(appointment)
    if (isAfter(arrivalAt, now)) return []
    const stage: QueueStage =
      appointment.status === "in-progress"
        ? "in-service"
        : calledAppointmentIds.has(appointment.id)
          ? "called"
          : "waiting"
    return [
      {
        appointmentId: appointment.id,
        arrivalAt: arrivalAt.toISOString(),
        assignedProfessionalId: appointment.professionalId,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        id: `scheduled-${appointment.id}`,
        notes: appointment.notes,
        preferenceKind: "specific",
        priority: "normal",
        professionalId: appointment.professionalId,
        serviceId: appointment.serviceId,
        source: "scheduled",
        stage,
        unitId: appointment.unitId,
      },
    ]
  })
}

export function filterQueueEntries(
  entries: readonly QueueEntry[],
  query: ServiceDeskQuery,
  professionals: readonly Professional[],
  services: readonly Service[],
) {
  const normalizedSearch = normalize(query.search)
  const professionalById = new Map(professionals.map((item) => [item.id, item]))
  const serviceById = new Map(services.map((item) => [item.id, item]))
  return entries.filter((entry) => {
    if (entry.unitId !== query.unitId) return false
    if (query.stage !== "all" && entry.stage !== query.stage) return false
    if (query.priority !== "all" && entry.priority !== query.priority) return false
    if (query.preference !== "all" && entry.preferenceKind !== query.preference) return false
    if (
      query.professionalId !== "all" &&
      entry.professionalId !== query.professionalId &&
      entry.assignedProfessionalId !== query.professionalId
    )
      return false
    if (!normalizedSearch) return true
    return normalize(
      [
        entry.customerName,
        serviceById.get(entry.serviceId)?.name,
        professionalById.get(entry.professionalId ?? entry.assignedProfessionalId ?? "")?.name,
      ]
        .filter(Boolean)
        .join(" "),
    ).includes(normalizedSearch)
  })
}

export function groupQueueEntries(entries: readonly QueueEntry[]) {
  return {
    called: entries.filter(({ stage }) => stage === "called"),
    "in-service": entries.filter(({ stage }) => stage === "in-service"),
    "ready-for-payment": entries.filter(({ stage }) => stage === "ready-for-payment"),
    waiting: entries.filter(({ stage }) => stage === "waiting"),
  } satisfies Record<QueueStage, QueueEntry[]>
}

export function sortQueueEntries(entries: readonly QueueEntry[]) {
  return [...entries].sort(
    (left, right) =>
      parseISO(left.arrivalAt).getTime() - parseISO(right.arrivalAt).getTime() ||
      left.id.localeCompare(right.id),
  )
}

export function queueCounts(entries: readonly QueueEntry[]) {
  const groups = groupQueueEntries(entries)
  return {
    called: groups.called.length,
    "in-service": groups["in-service"].length,
    "ready-for-payment": groups["ready-for-payment"].length,
    waiting: groups.waiting.length,
  } satisfies Record<QueueStage, number>
}

export function waitMinutes(arrivalAt: string, now: string) {
  return Math.max(0, differenceInMinutes(parseISO(now), parseISO(arrivalAt)))
}

export function formatWait(arrivalAt: string, now: string) {
  const minutes = waitMinutes(arrivalAt, now)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`
}

export function formatArrival(arrivalAt: string) {
  return format(parseISO(arrivalAt), "HH:mm")
}

export function canTransition(stage: QueueStage, next: QueueStage) {
  return (stage === "waiting" && next === "called") || (stage === "called" && next === "in-service")
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}
