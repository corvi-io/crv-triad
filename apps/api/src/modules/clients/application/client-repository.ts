import type { ValidClientProfile } from "../domain/client-profile.js"
import type { ClientListQuery } from "../domain/client-query.js"

export type ClientNoteRecord = Readonly<{
  body: string
  createdAt: Date
  id: string
  updatedAt: Date
  version: number
}>

export type ClientRecord = Readonly<{
  createdAt: Date
  email: string | null
  id: string
  name: string
  phone: string | null
  preferenceNote: string
  professionalPreferences?: readonly CatalogPreference[]
  servicePreferences: readonly string[]
  preferredServices?: readonly CatalogPreference[]
  unitPreferences?: readonly CatalogPreference[]
  status: "active" | "archived"
  tags: readonly string[]
  updatedAt: Date
  version: number
}>

export type CatalogPreference = Readonly<{
  id: string
  name: string
  status: "active" | "archived"
}>

export type ClientDetail = ClientRecord &
  Readonly<{
    notes: readonly ClientNoteRecord[]
    professionalPreferences?: readonly CatalogPreference[]
    preferredServices?: readonly CatalogPreference[]
    unitPreferences?: readonly CatalogPreference[]
  }>

export type ClientPage = Readonly<{
  items: readonly ClientRecord[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}>

export type DuplicateCandidate = Readonly<{
  candidateId: string
  candidateName: string
  field: "email" | "phone"
}>

export interface ClientRepository {
  addNote(input: { body: string; clientId: string; organizationId: string }): Promise<ClientDetail>
  create(input: {
    activeClientLimit?: number
    organizationId: string
    profile: ValidClientProfile
  }): Promise<ClientDetail | "quota_reached">
  findDuplicates(input: {
    excludingId?: string
    normalizedEmail: string | null
    normalizedPhone: string | null
    organizationId: string
  }): Promise<readonly DuplicateCandidate[]>
  get(input: { clientId: string; organizationId: string }): Promise<ClientDetail | null>
  list(input: { organizationId: string; query: ClientListQuery }): Promise<ClientPage>
  listTags(input: { organizationId: string }): Promise<readonly string[]>
  removeNote(input: {
    clientId: string
    noteId: string
    noteVersion: number
    organizationId: string
  }): Promise<"not_found" | "updated" | "version_conflict">
  setArchived(input: {
    archived: boolean
    activeClientLimit?: number
    clientId: string
    organizationId: string
    version: number
  }): Promise<"not_found" | "quota_reached" | "updated" | "version_conflict">
  update(input: {
    clientId: string
    organizationId: string
    profile: ValidClientProfile
    version: number
  }): Promise<"not_found" | "updated" | "version_conflict">
  updateNote(input: {
    body: string
    clientId: string
    noteId: string
    noteVersion: number
    organizationId: string
  }): Promise<"not_found" | "updated" | "version_conflict">
}
