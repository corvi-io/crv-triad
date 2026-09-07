import { describe, expect, it } from "vitest"

import type { Occurrence } from "../../../src/modules/availability/domain/availability.js"
import {
  hasAnySchedulableSlot,
  hasSchedulableSlot,
} from "../../../src/modules/onboarding/application/activation-readiness.js"

const occurrence = (kind: Occurrence["kind"], start: string, end: string): Occurrence => ({
  id: `${kind}:${start}`,
  seriesId: `${kind}-series`,
  version: 1,
  date: "2026-09-07",
  start,
  end,
  kind,
  professionalId: "professional-1",
  unitId: "unit-1",
})

describe("activation readiness slot detection", () => {
  it("recognizes an arbitrary-minute availability interval", () => {
    expect(
      hasSchedulableSlot(
        { durationMinutes: 15, professionalId: "professional-1" },
        "unit-1",
        "2026-09-07",
        [{ days: ["monday"], start: "09:00", end: "18:00" }],
        [occurrence("available", "09:10", "09:25")],
      ),
    ).toBe(true)
  })

  it("uses the end of a blocking occurrence as a candidate boundary", () => {
    expect(
      hasSchedulableSlot(
        { durationMinutes: 15, professionalId: "professional-1" },
        "unit-1",
        "2026-09-07",
        [{ days: ["monday"], start: "09:00", end: "18:00" }],
        [occurrence("available", "09:00", "10:00"), occurrence("break", "09:00", "09:10")],
      ),
    ).toBe(true)
  })

  it("rejects intervals shorter than the service duration", () => {
    expect(
      hasSchedulableSlot(
        { durationMinutes: 20, professionalId: "professional-1" },
        "unit-1",
        "2026-09-07",
        [{ days: ["monday"], start: "09:00", end: "18:00" }],
        [occurrence("available", "09:10", "09:25")],
      ),
    ).toBe(false)
  })

  it("does not lose the only fitting candidate after fifty longer service pairs", () => {
    const candidates = [
      ...Array.from({ length: 50 }, (_, index) => ({
        durationMinutes: 30,
        professionalId: `professional-${String(index).padStart(2, "0")}`,
      })),
      { durationMinutes: 15, professionalId: "professional-eligible" },
    ]
    const available = occurrence("available", "09:10", "09:25")

    expect(
      hasAnySchedulableSlot(
        candidates,
        "unit-1",
        "2026-09-07",
        [{ days: ["monday"], start: "09:00", end: "18:00" }],
        [{ ...available, professionalId: "professional-eligible" }],
      ),
    ).toBe(true)
  })
})
