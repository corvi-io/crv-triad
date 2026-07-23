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

export const agendaViews = ["board", "list"] as const
export type AgendaView = (typeof agendaViews)[number]

export const schedulingUnitIds = ["centro", "artesao"] as const
export type SchedulingUnitId = (typeof schedulingUnitIds)[number]

export const paymentStatuses = ["pending", "paid"] as const
export type PaymentStatus = (typeof paymentStatuses)[number]

export const cancellationReasons = ["client", "barbershop", "no-show"] as const
export type CancellationReason = (typeof cancellationReasons)[number]

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
  cancellationReason?: CancellationReason
  clientId: string
  customerName: string
  customerPhone: string
  date: string
  durationMinutes: number
  id: string
  notes: string
  origin: "phone" | "reception" | "whatsapp"
  paymentStatus: PaymentStatus
  priceCents: number
  professionalId: string
  rating?: number
  serviceId: string
  start: string
  status: AppointmentStatus
  tags: readonly string[]
  unitId: SchedulingUnitId
}

export type AppointmentInput = Omit<Appointment, "id">

export type ScheduleOccupancy = Pick<
  Appointment,
  "date" | "durationMinutes" | "id" | "professionalId" | "start"
>

export type ScheduleDayQuery = {
  endDate: string
  focusDate?: string
  scenarioId?: string
  startDate: string
  unitId: SchedulingUnitId
}

export type ScheduleDay = {
  appointments: readonly Appointment[]
  date: string
  endTime: string
  occupancies: readonly ScheduleOccupancy[]
  periods: readonly SchedulePeriod[]
  professionals: readonly Professional[]
  services: readonly Service[]
  startTime: string
  unitName: string
}

export type SchedulingScenario = { description: string; id: string; label: string }

export type AppointmentTransitionInput = {
  cancellationReason?: CancellationReason
  id: string
  paymentStatus?: PaymentStatus
  status: AppointmentStatus
}

export type SchedulingRepository = {
  cancel(id: string, reason: Exclude<CancellationReason, "no-show">): Promise<Appointment>
  create(input: AppointmentInput): Promise<Appointment>
  getDay(query: ScheduleDayQuery): Promise<ScheduleDay>
  reset(): Promise<void>
  scenarios(): readonly SchedulingScenario[]
  selectScenario(id: string): Promise<void>
  transition(input: AppointmentTransitionInput): Promise<Appointment>
  update(id: string, input: AppointmentInput): Promise<Appointment>
}

export class ScheduleConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ScheduleConflictError"
  }
}
