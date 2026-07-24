import {
  type ProfessionalPreferenceKind,
  professionalPreferenceKinds,
  type QueuePriority,
  type QueueStage,
  queuePriorities,
  queueStages,
  type ServiceDeskScenarioId,
} from "./contracts"

export type ServiceDeskSearch = {
  preference: ProfessionalPreferenceKind | "all"
  priority: QueuePriority | "all"
  professional: string
  scenario: ServiceDeskScenarioId
  stage: QueueStage | "all"
  unit: "centro" | "artesao"
}

export const defaultServiceDeskSearch: ServiceDeskSearch = {
  preference: "all",
  priority: "all",
  professional: "all",
  scenario: "typical",
  stage: "all",
  unit: "centro",
}

const serviceDeskSearchKeys = [
  "preference",
  "priority",
  "professional",
  "scenario",
  "stage",
  "unit",
] as const satisfies readonly (keyof ServiceDeskSearch)[]

export function validateServiceDeskSearch(
  search: Record<string, unknown>,
  scenarioIds: readonly ServiceDeskScenarioId[] = ["typical"],
): ServiceDeskSearch {
  return {
    preference: includes(professionalPreferenceKinds, search.preference)
      ? search.preference
      : "all",
    priority: includes(queuePriorities, search.priority) ? search.priority : "all",
    professional:
      typeof search.professional === "string" &&
      /^professional-[a-z0-9-]+$/.test(search.professional)
        ? search.professional
        : "all",
    scenario: includes(scenarioIds, search.scenario) ? search.scenario : "typical",
    stage: includes(queueStages, search.stage) ? search.stage : "all",
    unit: search.unit === "artesao" ? "artesao" : "centro",
  }
}

export function shouldCanonicalizeServiceDeskSearch(
  searchString: string,
  search: ServiceDeskSearch,
) {
  const parameters = new URLSearchParams(searchString)
  const allowed = new Set<string>(serviceDeskSearchKeys)
  for (const key of parameters.keys()) {
    if (!allowed.has(key)) return true
  }
  for (const key of serviceDeskSearchKeys) {
    const raw = parameters.get(key)
    if (raw !== null && raw !== search[key]) return true
  }
  return false
}

export function canonicalServiceDeskSearch(search: ServiceDeskSearch): ServiceDeskSearch {
  return {
    preference: search.preference,
    priority: search.priority,
    professional: search.professional,
    scenario: search.scenario,
    stage: search.stage,
    unit: search.unit,
  }
}

function includes<const Values extends readonly string[]>(
  values: Values,
  candidate: unknown,
): candidate is Values[number] {
  return typeof candidate === "string" && values.includes(candidate)
}
