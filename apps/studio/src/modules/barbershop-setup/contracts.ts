export const setupSections = [
  "overview",
  "units",
  "professionals",
  "services",
  "availability",
] as const

export type SetupSection = (typeof setupSections)[number]

export type SetupScenarioId = string
export type SetupEntityKind = "professional" | "service" | "unit"
export type SetupEntityStatus = "active" | "archived"
export type AccountAccessStatus = "connected" | "invited" | "not-configured"

export type TimeRange = { end: string; start: string }
export type BusinessHours = TimeRange & { days: readonly Weekday[] }
export type AvailabilityTimeBlock = TimeRange & {
  excludedDates: readonly string[]
  id: string
  occurrenceDate?: string
  recurrenceStart?: string
  recurrenceUntil?: string
  seriesId: string
}
export type AvailabilityBlockType = "available" | "break" | "absence"
export const availabilityViews = ["day", "week", "month"] as const
export type AvailabilityView = (typeof availabilityViews)[number]

type SetupEntityBase = {
  id: string
  status: SetupEntityStatus
}

export type SetupUnit = SetupEntityBase & {
  address: string
  businessHours: BusinessHours
  code: string
  kind: "unit"
  name: string
}

export type SetupProfessional = SetupEntityBase & {
  accountAccess: AccountAccessStatus
  kind: "professional"
  name: string
  role: string
  serviceIds: readonly string[]
  unitIds: readonly string[]
}

export type SetupService = SetupEntityBase & {
  category: string
  description: string
  durationMinutes: number
  kind: "service"
  name: string
  priceCents: number
  professionalIds: readonly string[]
  unitIds: readonly string[]
}

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

export type SetupAvailability = {
  absences: readonly AvailabilityTimeBlock[]
  breaks: readonly AvailabilityTimeBlock[]
  closed: boolean
  day: Weekday
  id: string
  kind: "availability"
  periods: readonly AvailabilityTimeBlock[]
  professionalId: string
  unitId: string
}

export type SetupRecord = SetupAvailability | SetupProfessional | SetupService | SetupUnit
export type SetupEntity = SetupProfessional | SetupService | SetupUnit

export type SetupListQuery = {
  kind: SetupEntityKind
  page: number
  pageSize: 10 | 20 | 50
  scenarioId: SetupScenarioId
  search: string
  sort: { direction: "asc" | "desc"; field: "name" | "status" }
  status: "all" | SetupEntityStatus
}

export type SetupEntityPage = {
  items: readonly SetupEntity[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type SetupOverviewItem = {
  complete: boolean
  description: string
  section: Exclude<SetupSection, "overview">
  title: string
}

export type SetupOverview = {
  completedCount: number
  items: readonly SetupOverviewItem[]
  totalCount: number
}

export type UnitInput = Omit<SetupUnit, "id" | "kind" | "status">
export type ProfessionalInput = Omit<SetupProfessional, "id" | "kind" | "status">
export type ServiceInput = Omit<SetupService, "id" | "kind" | "status">
export type SetupEntityInput = ProfessionalInput | ServiceInput | UnitInput

export type AvailabilityQuery = {
  professionalId?: string
  scenarioId: SetupScenarioId
  unitId?: string
}

export type AvailabilityResult = {
  conflicts: readonly string[]
  professionals: readonly SetupProfessional[]
  records: readonly SetupAvailability[]
  services: readonly SetupService[]
  units: readonly SetupUnit[]
}

export type CopyAvailabilityToWeekdaysInput = {
  source: SetupAvailability
  targetIds: readonly string[]
}

export type UpdateAvailabilityBatchInput = {
  records: readonly SetupAvailability[]
}

export class SetupDependencyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SetupDependencyError"
  }
}

export class SetupValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SetupValidationError"
  }
}

export class SetupOperationInvalidatedError extends Error {
  constructor() {
    super("A operação foi descartada porque os dados disponíveis foram atualizados.")
    this.name = "SetupOperationInvalidatedError"
  }
}

export interface BarbershopSetupRepository {
  copyAvailabilityToWeekdays(
    input: CopyAvailabilityToWeekdaysInput,
  ): Promise<readonly SetupAvailability[]>
  create(kind: SetupEntityKind, input: SetupEntityInput): Promise<SetupEntity>
  getAvailability(query: AvailabilityQuery): Promise<AvailabilityResult>
  getOverview(scenarioId: SetupScenarioId): Promise<SetupOverview>
  list(query: SetupListQuery): Promise<SetupEntityPage>
  setArchived(kind: SetupEntityKind, id: string, archived: boolean): Promise<SetupEntity>
  update(kind: SetupEntityKind, id: string, input: SetupEntityInput): Promise<SetupEntity>
  updateAvailability(input: SetupAvailability): Promise<SetupAvailability>
  updateAvailabilityBatch(
    input: UpdateAvailabilityBatchInput,
  ): Promise<readonly SetupAvailability[]>
}
