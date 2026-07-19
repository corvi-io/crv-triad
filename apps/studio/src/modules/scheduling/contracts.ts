export const appointmentStatuses = [
  "scheduled",
  "confirmed",
  "arrived",
  "waiting",
  "in-progress",
  "completed",
  "canceled",
  "no-show",
] as const

export type AppointmentStatus = (typeof appointmentStatuses)[number]

export type Professional = { id: string; name: string }
export type Service = {
  durationMinutes: number
  eligibleProfessionalIds: readonly string[]
  id: string
  name: string
  priceCents: number
}

export type SchedulePeriod = {
  end: string
  id: string
  kind: "break" | "blocked" | "walk-in"
  label: string
  professionalId: string
  start: string
}

export type Appointment = {
  customerName: string
  customerPhone: string
  date: string
  durationMinutes: number
  id: string
  notes: string
  origin: "phone" | "reception" | "whatsapp"
  priceCents: number
  professionalId: string
  serviceId: string
  start: string
  status: AppointmentStatus
}

export type AppointmentInput = Omit<Appointment, "id">

export type ScheduleDayQuery = {
  date: string
  professionalId?: string
  scenarioId?: string
  status?: AppointmentStatus
}

export type ScheduleDay = {
  appointments: readonly Appointment[]
  date: string
  endTime: string
  periods: readonly SchedulePeriod[]
  professionals: readonly Professional[]
  services: readonly Service[]
  startTime: string
  unitName: string
}

export type SchedulingScenario = { description: string; id: string; label: string }

export type SchedulingRepository = {
  cancel(id: string): Promise<Appointment>
  create(input: AppointmentInput): Promise<Appointment>
  getDay(query: ScheduleDayQuery): Promise<ScheduleDay>
  reset(): Promise<void>
  scenarios(): readonly SchedulingScenario[]
  selectScenario(id: string): Promise<void>
  update(id: string, input: AppointmentInput): Promise<Appointment>
}

export class ScheduleConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ScheduleConflictError"
  }
}
