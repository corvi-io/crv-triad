import { describe, expect, it } from "vitest"

import {
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
