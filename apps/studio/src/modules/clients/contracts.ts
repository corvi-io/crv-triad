export const clientScenarioIds = [
  "typical",
  "empty",
  "dense",
  "incomplete-contact",
  "duplicate-candidates",
  "slow",
  "next-failure",
  "persistent-error",
] as const

export type ClientScenarioId = (typeof clientScenarioIds)[number]
export type ClientStatus = "active" | "archived"
export type ClientSortField = "name" | "lastVisitAt" | "nextAppointmentAt" | "createdAt"
export type ContactCompleteness = "all" | "complete" | "incomplete"
export type DuplicateFilter = "all" | "possible"

export type ClientNote = {
  body: string
  createdAt: string
  id: string
  updatedAt: string
  version?: number
}

export type ClientAppointment = {
  date: string
  id: string
  professionalLabel: string
  serviceLabel: string
  status: "Agendado" | "Concluído" | "Cancelado"
  time: string
  unitLabel: string
}

export type DuplicateWarning = {
  candidateId: string
  candidateName: string
  field: "email" | "phone"
  label: string
}

export type ClientRecord = {
  appointments: readonly ClientAppointment[]
  createdAt: string
  email: string
  id: string
  lastVisitAt: string | null
  name: string
  nextAppointmentAt: string | null
  notes: readonly ClientNote[]
  phone: string
  preferenceNote: string
  professionalPreferenceIds?: readonly string[]
  preferredServices?: readonly { id: string; name: string; status: ClientStatus }[]
  servicePreferenceIds?: readonly string[]
  servicePreferences: readonly string[]
  status: ClientStatus
  tags: readonly string[]
  unitPreferenceIds?: readonly string[]
  version?: number
}

export type ClientInput = Pick<
  ClientRecord,
  "email" | "name" | "phone" | "preferenceNote" | "servicePreferences" | "tags"
> & {
  professionalPreferenceIds?: readonly string[]
  servicePreferenceIds?: readonly string[]
  unitPreferenceIds?: readonly string[]
}

export type ClientListQuery = {
  contact: ContactCompleteness
  duplicate: DuplicateFilter
  page: number
  pageSize: 10 | 20 | 50
  scenarioId: ClientScenarioId
  search: string
  sort: { direction: "asc" | "desc"; field: ClientSortField }
  status: ClientStatus
  tag: string
}

export type ClientPage = {
  items: readonly ClientRecord[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type NoteInput = { body: string }
export type ClientCatalogKind = "professionals" | "services" | "units"
export type ClientCatalogOption = { id: string; name: string; status: ClientStatus }

export class ClientOperationInvalidatedError extends Error {
  constructor() {
    super("A operação foi descartada porque o cenário ativo mudou.")
    this.name = "ClientOperationInvalidatedError"
  }
}

export class ClientValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ClientValidationError"
  }
}

export interface ClientRepository {
  addNote(clientId: string, input: NoteInput): Promise<ClientRecord>
  create(input: ClientInput): Promise<ClientRecord>
  findDuplicates(
    input: Pick<ClientInput, "email" | "phone">,
    excludingId?: string,
  ): Promise<readonly DuplicateWarning[]>
  get(id: string, scenarioId: ClientScenarioId): Promise<ClientRecord>
  list(query: ClientListQuery): Promise<ClientPage>
  listCatalogOptions(
    kind: ClientCatalogKind,
    selectedIds: readonly string[],
  ): Promise<readonly ClientCatalogOption[]>
  listTags(scenarioId: ClientScenarioId): Promise<readonly string[]>
  removeNote(clientId: string, noteId: string, version: number): Promise<ClientRecord>
  setArchived(id: string, archived: boolean, version: number): Promise<ClientRecord>
  update(id: string, input: ClientInput, version: number): Promise<ClientRecord>
  updateNote(
    clientId: string,
    noteId: string,
    input: NoteInput,
    version: number,
  ): Promise<ClientRecord>
}
