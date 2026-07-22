import {
  type SetupScenarioId,
  type SetupSection,
  setupScenarioIds,
  setupSections,
} from "./contracts"

export type BarbershopSetupSearch = {
  scenario: SetupScenarioId
  section: SetupSection
}

export function validateBarbershopSetupSearch(
  search: Record<string, unknown>,
): BarbershopSetupSearch {
  return {
    scenario: setupScenarioIds.includes(search.scenario as SetupScenarioId)
      ? (search.scenario as SetupScenarioId)
      : "single-unit",
    section: setupSections.includes(search.section as SetupSection)
      ? (search.section as SetupSection)
      : "overview",
  }
}
