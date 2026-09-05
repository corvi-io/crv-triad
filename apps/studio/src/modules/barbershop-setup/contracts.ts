export const setupSections = [
  "overview",
  "business",
  "units",
  "professionals",
  "services",
  "payments",
  "availability",
] as const

export type SetupSection = (typeof setupSections)[number]

export type SetupScenarioId = string
export type SetupEntityKind = "professional" | "service" | "unit"
export type SetupEntityStatus = "active" | "archived"
export type AccountAccessStatus = "connected" | "invited" | "not-configured"

export type BarbershopProfile = {
  displayName: string
  email: string
  phone: string
  primaryUnitId?: string
}

export const basePaymentMethodIds = ["pix", "cash", "debit", "credit"] as const
export type BasePaymentMethodId = (typeof basePaymentMethodIds)[number]
export type PaymentMethodId = BasePaymentMethodId | "mixed"
export type PaymentMethodSetting = {
  active: boolean
  id: PaymentMethodId
  label: string
}

export const professionalAccessChoices = [
  "own-schedule-only",
  "create-appointments",
  "change-prices",
  "register-payments",
  "view-revenue",
  "view-commissions",
  "access-other-professionals",
] as const
export type ProfessionalAccessChoice = (typeof professionalAccessChoices)[number]
export type ProfessionalAccessPolicy = Record<ProfessionalAccessChoice, boolean>

export type ProfessionalServiceOverride = {
  durationMinutes?: number
  priceCents?: number
  professionalId: string
  serviceId: string
}

export type ResolvedProfessionalService = {
  durationMinutes: number
  priceCents: number
  professionalId: string
  serviceId: string
  source: "default" | "professional-override"
}

export type SetupStepId =
  | "business"
  | "hours"
  | "professionals"
  | "services"
  | "payments"
  | "review"

export type SetupStep = {
  complete: boolean
  description: string
  id: SetupStepId
  section: SetupSection
  title: string
}

export type SetupReadiness = {
  completedCount: number
  nextStepId: SetupStepId
  steps: readonly SetupStep[]
  totalCount: number
}

export type ProfessionalOperationalSummary = {
  agendaProfessionalId?: string
  agendaDate: string
  appointments: readonly {
    customerName: string
    id: string
    start: string
    status: string
  }[]
  availabilityLabel: string
  commissionLabel: string
  professionalId: string
  serviceAssignments: readonly ResolvedProfessionalService[]
  unavailableReason?: string
}

export type SetupCompletion = {
  paymentMethods: readonly PaymentMethodSetting[]
  profile: BarbershopProfile
  readiness: SetupReadiness
  serviceOverrides: readonly ProfessionalServiceOverride[]
}

export type TimeRange = { end: string; start: string }
export type BusinessHoursPeriod = TimeRange & { days: readonly Weekday[] }
export type BusinessHours = BusinessHoursPeriod & {
  periods?: readonly BusinessHoursPeriod[]
}
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
  version?: number
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
  accessPolicy?: ProfessionalAccessPolicy
  commissionBasisPoints?: number
  kind: "professional"
  name: string
  role: string
  serviceIds: readonly string[]
  specialties?: readonly string[]
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
export type ProfessionalInput = {
  commissionBasisPoints: number
  invitationEmail: string
  role: string
  serviceIds: readonly string[]
  specialties: readonly string[]
  unitIds: readonly string[]
}
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

export type UpdatePaymentMethodsInput = {
  settings: readonly PaymentMethodSetting[]
}

export type SetProfessionalServiceOverrideInput = ProfessionalServiceOverride

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
  readonly catalogSource?: "http"
  copyAvailabilityToWeekdays(
    input: CopyAvailabilityToWeekdaysInput,
  ): Promise<readonly SetupAvailability[]>
  create(kind: SetupEntityKind, input: SetupEntityInput): Promise<SetupEntity | undefined>
  getActivePaymentMethodIds(): Promise<readonly BasePaymentMethodId[]>
  getAvailability(query: AvailabilityQuery): Promise<AvailabilityResult>
  getCompletion(scenarioId: SetupScenarioId): Promise<SetupCompletion>
  getOverview(scenarioId: SetupScenarioId): Promise<SetupOverview>
  getProfessionalOperationalSummary(
    professionalId: string,
    date: string,
  ): Promise<ProfessionalOperationalSummary>
  getProfessionalCommissionBasisPoints(professionalId: string): Promise<number>
  list(query: SetupListQuery): Promise<SetupEntityPage>
  resolveProfessionalService(
    serviceId: string,
    professionalId: string,
  ): Promise<ResolvedProfessionalService>
  setProfessionalServiceOverride(
    input: SetProfessionalServiceOverrideInput,
  ): Promise<ProfessionalServiceOverride | undefined>
  setArchived(kind: SetupEntityKind, id: string, archived: boolean): Promise<SetupEntity>
  update(
    kind: SetupEntityKind,
    id: string,
    input: SetupEntityInput,
    version?: number,
  ): Promise<SetupEntity>
  updateAvailability(input: SetupAvailability): Promise<SetupAvailability>
  updateAvailabilityBatch(
    input: UpdateAvailabilityBatchInput,
  ): Promise<readonly SetupAvailability[]>
  updatePaymentMethods(input: UpdatePaymentMethodsInput): Promise<readonly PaymentMethodSetting[]>
  updateProfile(input: BarbershopProfile): Promise<BarbershopProfile>
}
