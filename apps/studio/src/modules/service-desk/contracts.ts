import type { Professional, SchedulingUnitId, Service } from "@/modules/scheduling/contracts"

export const queueStages = ["waiting", "called", "in-service", "ready-for-payment"] as const
export type QueueStage = (typeof queueStages)[number]

export const queuePriorities = ["normal", "fit-in"] as const
export type QueuePriority = (typeof queuePriorities)[number]

export const professionalPreferenceKinds = ["specific", "first-available"] as const
export type ProfessionalPreferenceKind = (typeof professionalPreferenceKinds)[number]

export type ServiceDeskScenarioId =
  | "typical"
  | "empty"
  | "dense"
  | "long-wait"
  | "specific-professional"
  | "first-available"
  | "unavailable-professional"
  | "slow"
  | "next-failure"
  | "persistent-error"
  | "fulfillment-single"
  | "fulfillment-multiple"
  | "fulfillment-multi-professional"
  | "fulfillment-long-running"
  | "fulfillment-long-labels"
  | "fulfillment-no-eligible"
  | "fulfillment-ready"
  | "checkout-pix"
  | "checkout-cash"
  | "checkout-debit"
  | "checkout-credit"
  | "checkout-mixed"
  | "checkout-discount"
  | "checkout-surcharge"
  | "checkout-price-override"
  | "checkout-unauthorized"
  | "checkout-fixed-commission"
  | "checkout-no-commission"
  | "checkout-multi-professional"
  | "checkout-scheduled"
  | "checkout-walk-in"
  | "checkout-decline"
  | "checkout-slow"
  | "checkout-next-failure"
  | "checkout-persistent-error"
  | "checkout-paid"
  | "checkout-long-content"

export type QueueEntry = {
  version?: number
  appointmentId?: string
  arrivalAt: string
  assignedProfessionalId?: string
  customerName: string
  customerPhone?: string
  id: string
  sessionId?: string
  notes?: string
  paymentStatus?: "paid"
  preferenceKind: ProfessionalPreferenceKind
  priority: QueuePriority
  professionalId?: string
  serviceId: string
  source: "scheduled" | "walk-in"
  stage: QueueStage
  unitId: SchedulingUnitId
}

export type ServiceSessionStatus = "canceled" | "in-progress" | "paid" | "ready-for-payment"
export type ServiceSessionItem = {
  addedAt: string
  id: string
  professionalId: string
  serviceId: string
  serviceName?: string
  professionalName?: string
  priceCents?: number
  source: "initial" | "added"
  status?: "pending" | "active" | "completed" | "canceled"
  plannedEndAt?: string
  startedAt?: string
  finishedAt?: string
}
export type ServiceSession = {
  version?: number
  appointmentId?: string
  customerName: string
  finishedAt?: string
  id: string
  items: readonly ServiceSessionItem[]
  notes: string
  now: string
  professionals: readonly Professional[]
  queueEntryId: string
  services: readonly Service[]
  source: "scheduled" | "walk-in"
  startedAt: string
  status: ServiceSessionStatus
  unitId: SchedulingUnitId
  unitName: string
  unavailableProfessionalIds: readonly string[]
}
export type ServicePaymentHandoff = {
  appointmentId?: string
  customerName: string
  finishedAt: string
  items: readonly {
    id: string
    professionalId: string
    professionalName: string
    serviceId: string
    serviceName: string
    priceCents: number
  }[]
  sessionId: string
  source: "scheduled" | "walk-in"
  unitId: SchedulingUnitId
  unitName: string
}
export type CompleteServicePaymentInput = {
  completedAt: string
  operationId: string
  sessionId: string
}
export type SessionMutationInput = { operationId: string; sessionId: string }
export type InterruptSessionInput = SessionMutationInput & { reason: string }
export type AddServiceItemInput = SessionMutationInput & {
  professionalId: string
  serviceId: string
}
export type AssignServiceItemProfessionalInput = {
  itemId: string
  operationId: string
  professionalId: string
  sessionId: string
}
export type SessionItemInput = SessionMutationInput & { itemId: string }
export type UpdateSessionNotesInput = SessionMutationInput & { notes: string }

export type WalkInInput = {
  arrivalAt: string
  clientId?: string
  customerName?: string
  customerPhone?: string
  notes?: string
  preferenceKind: ProfessionalPreferenceKind
  priority: QueuePriority
  professionalId?: string
  serviceId: string
  unitId: SchedulingUnitId
}

export type ServiceDeskQuery = {
  preference: ProfessionalPreferenceKind | "all"
  priority: QueuePriority | "all"
  professionalId: string | "all"
  historyPage?: number
  scenarioId: ServiceDeskScenarioId
  search: string
  stage: QueueStage | "all"
  unitId: SchedulingUnitId
}

export type ServiceDeskSnapshot = {
  clients?: readonly { id: string; name: string }[]
  history?: readonly {
    id: string
    customerName: string
    finishedAt: string
    status: "completed" | "canceled"
  }[]
  historyPage?: number
  historyPageSize?: number
  historyTotal?: number
  arrivals?: readonly {
    id: string
    version: number
    customerName: string
    serviceName: string
    professionalName: string
    startsAt: string
  }[]
  entries: readonly QueueEntry[]
  now: string
  professionals: readonly Professional[]
  services: readonly Service[]
  unavailableProfessionalIds: readonly string[]
  unitName: string
  unitId?: string
  units?: readonly { id: string; name: string; timezone?: string | null }[]
  unitTimezone?: string | null
}

export type StartServiceInput = {
  entryId: string
  professionalId?: string
}

export type ServiceDeskRepository = {
  admitScheduled?(appointmentId: string, appointmentVersion: number): Promise<QueueEntry>
  addServiceItem(input: AddServiceItemInput): Promise<ServiceSession>
  addWalkIn(input: WalkInInput): Promise<QueueEntry>
  assignServiceItemProfessional(input: AssignServiceItemProfessionalInput): Promise<ServiceSession>
  call(entryId: string): Promise<QueueEntry>
  cancel?(entryId: string, reason: string): Promise<QueueEntry>
  finishSession(input: SessionMutationInput): Promise<ServiceSession>
  interruptSession?(input: InterruptSessionInput): Promise<ServiceSession>
  finishServiceItem?(input: SessionItemInput): Promise<ServiceSession>
  startServiceItem?(input: SessionItemInput & { professionalId: string }): Promise<ServiceSession>
  extendServiceItem?(input: SessionItemInput & { minutes: number }): Promise<ServiceSession>
  completePayment(input: CompleteServicePaymentInput): Promise<ServiceSession>
  getPaymentHandoff(sessionId: string): Promise<ServicePaymentHandoff>
  getQueue(query: ServiceDeskQuery): Promise<ServiceDeskSnapshot>
  getSession(sessionId: string): Promise<ServiceSession>
  removeServiceItem(input: SessionItemInput): Promise<ServiceSession>
  returnToWaiting?(entryId: string): Promise<QueueEntry>
  reset(): Promise<void>
  start(input: StartServiceInput): Promise<QueueEntry>
  updateSessionNotes(input: UpdateSessionNotesInput): Promise<ServiceSession>
}

export class ServiceDeskTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ServiceDeskTransitionError"
  }
}

export class ServiceSessionNotFoundError extends ServiceDeskTransitionError {
  constructor() {
    super("Atendimento não encontrado.")
    this.name = "ServiceSessionNotFoundError"
  }
}
