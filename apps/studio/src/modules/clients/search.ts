import {
  type ClientScenarioId,
  type ClientSortField,
  type ClientStatus,
  type ContactCompleteness,
  clientScenarioIds,
  type DuplicateFilter,
} from "./contracts"

export type ClientSearch = {
  contact: ContactCompleteness
  duplicate: DuplicateFilter
  page: number
  pageSize: 10 | 20 | 50
  scenario: ClientScenarioId
  sortDirection: "asc" | "desc"
  sortField: ClientSortField
  status: ClientStatus
  tag: string
}

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
  return {
    contact: ["all", "complete", "incomplete"].includes(String(search.contact))
      ? (search.contact as ContactCompleteness)
      : "all",
    duplicate: ["all", "possible"].includes(String(search.duplicate))
      ? (search.duplicate as DuplicateFilter)
      : "all",
    page: boundedInteger(search.page, 1, 10_000, 1),
    pageSize: [10, 20, 50].includes(Number(search.pageSize))
      ? (Number(search.pageSize) as 10 | 20 | 50)
      : 10,
    scenario: resolveScenario(search.scenario),
    sortDirection: search.sortDirection === "desc" ? "desc" : "asc",
    sortField: sortFields.includes(search.sortField as ClientSortField)
      ? (search.sortField as ClientSortField)
      : "name",
    status: search.status === "archived" ? "archived" : "active",
    tag: typeof search.tag === "string" && /^[a-z0-9-]{1,32}$/.test(search.tag) ? search.tag : "",
  }
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
