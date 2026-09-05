import { describe, expect, it } from "vitest"
import {
  assertAvailable,
  assertOpeningHours,
  availabilityInput,
  projectAvailability,
  type Series,
  seriesOverlap,
} from "../../../src/modules/availability/domain/availability.js"
import {
  dateRange,
  minutes,
  timeAt,
  toInstant,
  validTimezone,
} from "../../../src/modules/availability/domain/time.js"
import {
  appointmentInput,
  assertEditable,
  occupies,
  statuses,
  transition,
  trustedServiceTransition,
} from "../../../src/modules/scheduling/domain/appointment.js"

const series: Series = {
  id: "series",
  unitId: "unit",
  professionalId: "professional",
  kind: "available",
  start: "09:00",
  end: "18:00",
  weekdays: ["monday"],
  effectiveFrom: "2026-09-07",
  effectiveUntil: null,
  excludedDates: [],
  status: "active",
  version: 1,
}
describe("local time and bounded recurrence", () => {
  it("resolves exact UTC and rejects gaps, folds and invalid zones", () => {
    expect(toInstant("2026-09-07", "09:00", "America/Recife").toISOString()).toBe(
      "2026-09-07T12:00:00.000Z",
    )
    expect(() => toInstant("2026-03-08", "02:30", "America/New_York")).toThrow("invalid_local_time")
    expect(() => toInstant("2026-11-01", "01:30", "America/New_York")).toThrow(
      "ambiguous_local_time",
    )
    expect(validTimezone("not-a-zone")).toBe(false)
    expect(() => toInstant("2026-09-07", "09:00", "not-a-zone")).toThrow("timezone_required")
  })
  it("bounds inclusive projections and validates time arithmetic", () => {
    expect(dateRange("2026-09-07", "2026-09-13", 7)).toHaveLength(7)
    for (const end of ["2026-09-06", "2026-09-14", "invalid"])
      expect(() => dateRange("2026-09-07", end, 7)).toThrow()
    expect(minutes("09:15")).toBe(555)
    expect(timeAt(555)).toBe("09:15")
    expect(() => timeAt(1440)).toThrow()
    expect(() => timeAt(-1)).toThrow()
  })
  it("applies recurrence bounds, archives, exclusions and dated overrides", () => {
    const rules = [
      { ...series, excludedDates: ["2026-09-14"], effectiveUntil: "2026-09-21" },
      {
        ...series,
        id: "override",
        start: "10:00",
        effectiveFrom: "2026-09-14",
        effectiveUntil: "2026-09-14",
      },
      { ...series, id: "archived", status: "archived" as const },
    ]
    expect(
      projectAvailability(rules, "2026-09-01", "2026-09-30").map((item) => [item.date, item.start]),
    ).toEqual([
      ["2026-09-07", "09:00"],
      ["2026-09-14", "10:00"],
      ["2026-09-21", "09:00"],
    ])
  })
  it("detects future weekly overlap beyond the initial projection", () => {
    expect(seriesOverlap(series, { ...series, effectiveFrom: "2030-01-01" })).toBe(true)
    expect(seriesOverlap(series, { ...series, weekdays: ["tuesday"] })).toBe(false)
    expect(seriesOverlap(series, { ...series, start: "18:00", end: "19:00" })).toBe(false)
    expect(
      seriesOverlap(
        { ...series, effectiveUntil: "2026-09-07" },
        { ...series, excludedDates: ["2026-09-07"] },
      ),
    ).toBe(false)
  })
  it("enforces hours and negative block precedence", () => {
    expect(() =>
      assertOpeningHours(series, [{ days: ["monday"], start: "10:00", end: "18:00" }]),
    ).toThrow("outside_hours")
    assertOpeningHours(series, [{ days: ["monday"], start: "09:00", end: "18:00" }])
    const occurrences = projectAvailability(
      [series, { ...series, id: "break", kind: "break", start: "12:00", end: "13:00" }],
      "2026-09-07",
      "2026-09-07",
    )
    assertAvailable(occurrences, { ...series, date: "2026-09-07", start: "11:00", end: "12:00" })
    expect(() =>
      assertAvailable(occurrences, { ...series, date: "2026-09-07", start: "11:45", end: "12:15" }),
    ).toThrow("unavailable")
    expect(() => availabilityInput.parse({ ...series, end: "08:00" })).toThrow()
  })
})
describe("appointment commands", () => {
  it("allows only the explicit lifecycle matrix", () => {
    for (const status of statuses)
      for (const command of ["confirm", "check-in", "cancel", "no-show"] as const) {
        const allowed =
          command === "confirm"
            ? status === "scheduled"
            : command === "cancel"
              ? ["scheduled", "confirmed", "arrived"].includes(status)
              : ["scheduled", "confirmed"].includes(status)
        if (allowed) expect(transition(status, command)).toBeTruthy()
        else expect(() => transition(status, command)).toThrow("invalid_transition")
      }
    for (const status of statuses) {
      expect(occupies(status)).toBe(!["canceled", "no-show"].includes(status))
      if (["scheduled", "confirmed"].includes(status)) assertEditable(status)
      else expect(() => assertEditable(status)).toThrow()
    }
    expect(trustedServiceTransition("arrived", "waiting")).toBe("waiting")
    expect(trustedServiceTransition("waiting", "in-progress")).toBe("in-progress")
    expect(trustedServiceTransition("in-progress", "completed")).toBe("completed")
    expect(() => trustedServiceTransition("scheduled", "completed")).toThrow()
  })
  it("rejects injected tenant, price, duration and arbitrary status", () => {
    const input = {
      unitId: "u",
      professionalId: "p",
      serviceId: "s",
      clientId: "c",
      date: "2026-09-07",
      start: "09:00",
    }
    expect(appointmentInput.parse(input).notes).toBe("")
    for (const field of ["organizationId", "priceCents", "durationMinutes", "status"])
      expect(() => appointmentInput.parse({ ...input, [field]: "injected" })).toThrow()
    expect(() => appointmentInput.parse({ ...input, start: "09:07" })).toThrow()
  })
})
