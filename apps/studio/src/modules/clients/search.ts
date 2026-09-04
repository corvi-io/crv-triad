import {
  type ClientScenarioId,
  type ClientSortField,
  type ClientStatus,
  type ContactCompleteness,
  clientScenarioIds,
  type DuplicateFilter,
} from "./contracts"

export type ClientSearch = {
  client?: string
  contact: ContactCompleteness
  duplicate: DuplicateFilter
  mode?: "edit"
  page: number
  pageSize: 10 | 20 | 50
  scenario: ClientScenarioId
  sortDirection: "asc" | "desc"
  sortField: ClientSortField
  status: ClientStatus
  tag: string
}

export const clientSearchDefaults = {
  contact: "all",
  duplicate: "all",
  page: 1,
  pageSize: 20,
  scenario: "typical",
  sortDirection: "asc",
  sortField: "name",
  status: "active",
  tag: "",
} as const satisfies Omit<ClientSearch, "client" | "mode">

const sortFields: readonly ClientSortField[] = [
  "name",
  "lastVisitAt",
  "nextAppointmentAt",
  "createdAt",
]

export function validateClientSearch(
  search: Record<string, unknown>,
  resolveScenario: (value: unknown) => ClientScenarioId,
): ClientSearch {
  const client = parseClientId(search.client)
  return {
    client,
    contact: ["all", "complete", "incomplete"].includes(String(search.contact))
      ? (search.contact as ContactCompleteness)
      : "all",
    duplicate: ["all", "possible"].includes(String(search.duplicate))
      ? (search.duplicate as DuplicateFilter)
      : "all",
    page: boundedInteger(search.page, 1, 10_000, 1),
    pageSize: [10, 20, 50].includes(Number(search.pageSize))
      ? (Number(search.pageSize) as 10 | 20 | 50)
      : clientSearchDefaults.pageSize,
    mode: client && search.mode === "edit" ? "edit" : undefined,
    scenario: resolveScenario(search.scenario),
    sortDirection: search.sortDirection === "desc" ? "desc" : "asc",
    sortField: sortFields.includes(search.sortField as ClientSortField)
      ? (search.sortField as ClientSortField)
      : "name",
    status: search.status === "archived" ? "archived" : "active",
    tag: parseTag(search.tag),
  }
}

function parseClientId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : undefined
}

function parseTag(value: unknown) {
  if (typeof value !== "string") return ""
  const tag = value.trim()
  return tag.length <= 60 && /^[\p{L}\p{N}][\p{L}\p{N}\s_-]*$/u.test(tag) ? tag : ""
}

export function resolveClientScenario(value: unknown): ClientScenarioId {
  return clientScenarioIds.includes(value as ClientScenarioId)
    ? (value as ClientScenarioId)
    : "typical"
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}
