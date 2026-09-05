import { isCanonicalDate, localToday } from "./availability-dates"
import {
  type AvailabilityView,
  availabilityViews,
  type SetupScenarioId,
  type SetupSection,
  setupSections,
} from "./contracts"

export type BarbershopSetupSearch = {
  availabilityDate: string
  availabilityView: AvailabilityView
  scenario: SetupScenarioId
  section: SetupSection
}

export type BarbershopSetupRouteSearch = Omit<BarbershopSetupSearch, "section">

export function createBarbershopSetupRouteSearchDefaults(
  resolveScenario: (value: unknown) => SetupScenarioId,
): BarbershopSetupRouteSearch {
  return {
    availabilityDate: localToday(),
    availabilityView: "week",
    scenario: resolveScenario(undefined),
  }
}

export function validateBarbershopSetupRouteSearch(
  search: Record<string, unknown>,
  resolveScenario: (value: unknown) => SetupScenarioId,
): BarbershopSetupRouteSearch {
  const { section: _section, ...validated } = validateBarbershopSetupSearch(search, resolveScenario)
  return validated
}

export function validateBarbershopSetupSearch(
  search: Record<string, unknown>,
  resolveScenario: (value: unknown) => SetupScenarioId,
): BarbershopSetupSearch {
  return {
    availabilityDate: isCanonicalDate(search.availabilityDate)
      ? search.availabilityDate
      : localToday(),
    availabilityView: availabilityViews.includes(search.availabilityView as AvailabilityView)
      ? (search.availabilityView as AvailabilityView)
      : "week",
    scenario: resolveScenario(search.scenario),
    section: setupSections.includes(search.section as SetupSection)
      ? (search.section as SetupSection)
      : "overview",
  }
}
