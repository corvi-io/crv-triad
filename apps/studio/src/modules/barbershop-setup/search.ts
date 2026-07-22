import { type SetupScenarioId, type SetupSection, setupSections } from "./contracts"

export type BarbershopSetupSearch = {
  scenario: SetupScenarioId
  section: SetupSection
}

export function validateBarbershopSetupSearch(
  search: Record<string, unknown>,
  resolveScenario: (value: unknown) => SetupScenarioId,
): BarbershopSetupSearch {
  return {
    scenario: resolveScenario(search.scenario),
    section: setupSections.includes(search.section as SetupSection)
      ? (search.section as SetupSection)
      : "overview",
  }
}
