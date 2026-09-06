import { describe, expect, it } from "vitest"

import {
  addCalendarDays,
  blockAppliesOnDate,
  blockDateSetIsSubset,
  blockDateSetsIntersect,
  datesInRange,
  isCanonicalDate,
  isRecurringBlock,
  navigateAvailabilityDate,
  projectAvailability,
  visibleAvailabilityRange,
} from "@/modules/barbershop-setup/availability-dates"
import type { SetupAvailability } from "@/modules/barbershop-setup/contracts"

const monday: SetupAvailability = {
  absences: [
    {
      end: "12:00",
      excludedDates: [],
      id: "holiday",
      occurrenceDate: "2026-07-27",
      seriesId: "holiday",
      start: "09:00",
    },
  ],
  breaks: [],
  closed: false,
  day: "monday",
  id: "availability-monday",
  kind: "availability",
  periods: [
    {
      end: "18:00",
      excludedDates: ["2026-07-20"],
      id: "weekly-hours",
      recurrenceStart: "2026-07-06",
      recurrenceUntil: "2026-08-31",
      seriesId: "weekly-hours",
      start: "09:00",
    },
  ],
  professionalId: "professional-alpha",
  unitId: "unit-center",
}

describe("dated availability projection", () => {
  it("projects rules and one-offs only inside the visible range", () => {
    const occurrences = projectAvailability([monday], {
      start: "2026-07-20",
      end: "2026-08-02",
    })

    expect(occurrences.map(({ date, type }) => `${date}:${type}`)).toEqual([
      "2026-07-27:available",
      "2026-07-27:absence",
    ])
    expect(occurrences).toHaveLength(2)
  })

  it("uses real day, week, and complete month-grid boundaries", () => {
    expect(visibleAvailabilityRange("day", "2026-07-22")).toEqual({
      start: "2026-07-22",
      end: "2026-07-22",
    })
    expect(visibleAvailabilityRange("week", "2026-07-22")).toEqual({
      start: "2026-07-20",
      end: "2026-07-26",
    })
    expect(visibleAvailabilityRange("month", "2026-07-22")).toEqual({
      start: "2026-06-29",
      end: "2026-08-02",
    })
  })

  it("clamps month navigation instead of skipping short months", () => {
    expect(navigateAvailabilityDate("month", "2026-01-31", 1)).toBe("2026-02-28")
    expect(navigateAvailabilityDate("month", "2026-03-31", -1)).toBe("2026-02-28")
  })
})

describe("availability recurrence boundaries", () => {
  const weekly = monday.periods[0]
  it("rejects malformed, reversed, and unbounded projections", () => {
    expect(isCanonicalDate(null)).toBe(false)
    expect(isCanonicalDate("2026-02-30")).toBe(false)
    expect(isCanonicalDate("2024-02-29")).toBe(true)
    expect(() => addCalendarDays("invalid", 1)).toThrow("Invalid date-only")
    expect(() => datesInRange({ start: "2026-09-07", end: "2026-09-06" })).toThrow("bounded")
    expect(() => datesInRange({ start: "2026-09-01", end: "2026-10-13" })).toThrow("bounded")
    expect(datesInRange({ start: "2026-09-01", end: "2026-10-12" })).toHaveLength(42)
    expect(navigateAvailabilityDate("day", "2026-12-31", 1)).toBe("2027-01-01")
    expect(navigateAvailabilityDate("week", "2026-01-01", -1)).toBe("2025-12-25")
  })
  it("distinguishes bounded weekly rules, exclusions, and single occurrences", () => {
    expect(isRecurringBlock(weekly)).toBe(true)
    expect(isRecurringBlock(monday.absences[0])).toBe(false)
    for (const date of ["2026-06-29", "2026-07-20", "2026-09-07"])
      expect(blockAppliesOnDate(weekly, date)).toBe(false)
    expect(blockAppliesOnDate({ ...weekly, recurrenceStart: undefined }, "2026-07-27")).toBe(false)
    expect(blockAppliesOnDate(monday.absences[0], "2026-07-20")).toBe(false)
  })
  it("detects intersection symmetrically across one-offs and recurring exclusions", () => {
    const single = monday.absences[0]
    expect(blockDateSetsIntersect(single, weekly, "monday")).toBe(true)
    expect(blockDateSetsIntersect(weekly, single, "monday")).toBe(true)
    expect(
      blockDateSetsIntersect({ ...weekly, recurrenceStart: undefined }, weekly, "monday"),
    ).toBe(false)
    expect(
      blockDateSetsIntersect(weekly, { ...weekly, recurrenceStart: "2026-09-07" }, "monday"),
    ).toBe(false)
    expect(
      blockDateSetsIntersect(
        { ...weekly, recurrenceStart: "2026-07-20", recurrenceUntil: "2026-07-20" },
        weekly,
        "monday",
      ),
    ).toBe(false)
    expect(
      blockDateSetsIntersect(
        { ...weekly, recurrenceUntil: undefined },
        { ...weekly, recurrenceStart: "2026-08-03", recurrenceUntil: undefined },
        "monday",
      ),
    ).toBe(true)
    expect(
      blockDateSetsIntersect(weekly, { ...weekly, recurrenceUntil: undefined }, "monday"),
    ).toBe(true)
    expect(
      blockDateSetsIntersect({ ...weekly, recurrenceUntil: undefined }, weekly, "monday"),
    ).toBe(true)
  })
  it("requires full containment of every weekly child occurrence", () => {
    const unbounded = { ...weekly, recurrenceUntil: undefined, excludedDates: [] }
    expect(blockDateSetIsSubset(monday.absences[0], weekly, "monday")).toBe(true)
    expect(blockDateSetIsSubset(weekly, monday.absences[0], "monday")).toBe(false)
    expect(blockDateSetIsSubset({ ...weekly, recurrenceStart: undefined }, weekly, "monday")).toBe(
      false,
    )
    expect(blockDateSetIsSubset(weekly, { ...weekly, recurrenceStart: undefined }, "monday")).toBe(
      false,
    )
    expect(
      blockDateSetIsSubset({ ...weekly, recurrenceStart: "2026-06-01" }, weekly, "monday"),
    ).toBe(false)
    expect(blockDateSetIsSubset(unbounded, weekly, "monday")).toBe(false)
    expect(blockDateSetIsSubset(unbounded, unbounded, "monday")).toBe(true)
    expect(blockDateSetIsSubset(weekly, unbounded, "monday")).toBe(true)
    expect(blockDateSetIsSubset({ ...weekly, excludedDates: [] }, weekly, "monday")).toBe(false)
    expect(blockDateSetIsSubset(weekly, weekly, "monday")).toBe(true)
    expect(
      blockDateSetIsSubset(
        weekly,
        { ...unbounded, excludedDates: ["2026-07-21", "2026-09-07"] },
        "monday",
      ),
    ).toBe(true)
    expect(
      blockDateSetIsSubset({ ...weekly, recurrenceUntil: "2026-09-07" }, weekly, "monday"),
    ).toBe(false)
  })
})
