import type { Professional, SchedulingUnitId, Service } from "@/modules/scheduling/contracts"

export const queueStages = ["waiting", "called", "in-service"] as const
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

export type QueueEntry = {
  appointmentId?: string
  arrivalAt: string
  assignedProfessionalId?: string
  customerName: string
  customerPhone?: string
  id: string
  notes?: string
  preferenceKind: ProfessionalPreferenceKind
  priority: QueuePriority
  professionalId?: string
  serviceId: string
  source: "scheduled" | "walk-in"
  stage: QueueStage
  unitId: SchedulingUnitId
}

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
  addWalkIn(input: WalkInInput): Promise<QueueEntry>
  call(entryId: string): Promise<QueueEntry>
  getQueue(query: ServiceDeskQuery): Promise<ServiceDeskSnapshot>
  reset(): Promise<void>
  start(input: StartServiceInput): Promise<QueueEntry>
}

export class ServiceDeskTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ServiceDeskTransitionError"
  }
}
