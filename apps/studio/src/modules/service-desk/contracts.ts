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

export type ServiceSessionStatus = "in-progress" | "paid" | "ready-for-payment"
export type ServiceSessionItem = {
  addedAt: string
  id: string
  professionalId: string
  serviceId: string
  source: "initial" | "added"
}
export type ServiceSession = {
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
  customerName: string
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
  scenarioId: ServiceDeskScenarioId
  search: string
  stage: QueueStage | "all"
  unitId: SchedulingUnitId
}

export type ServiceDeskSnapshot = {
  entries: readonly QueueEntry[]
  now: string
  professionals: readonly Professional[]
  services: readonly Service[]
  unavailableProfessionalIds: readonly string[]
  unitName: string
}

export type StartServiceInput = {
  entryId: string
  professionalId?: string
}

export type ServiceDeskRepository = {
  addServiceItem(input: AddServiceItemInput): Promise<ServiceSession>
  addWalkIn(input: WalkInInput): Promise<QueueEntry>
  assignServiceItemProfessional(input: AssignServiceItemProfessionalInput): Promise<ServiceSession>
  call(entryId: string): Promise<QueueEntry>
  finishSession(input: SessionMutationInput): Promise<ServiceSession>
  completePayment(input: CompleteServicePaymentInput): Promise<ServiceSession>
  getPaymentHandoff(sessionId: string): Promise<ServicePaymentHandoff>
  getQueue(query: ServiceDeskQuery): Promise<ServiceDeskSnapshot>
  getSession(sessionId: string): Promise<ServiceSession>
  removeServiceItem(input: SessionItemInput): Promise<ServiceSession>
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
