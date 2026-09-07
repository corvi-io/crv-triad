import { describe, expect, it } from "vitest"

import type { Occurrence } from "../../../src/modules/availability/domain/availability.js"
import {
  createActivationReadinessService,
  hasAnySchedulableSlot,
  hasSchedulableSlot,
} from "../../../src/modules/onboarding/application/activation-readiness.js"

function database(...results: unknown[][]) {
  const queue = [...results]
  const select = () => {
    // biome-ignore lint/suspicious/noExplicitAny: recursive fluent methods model the awaitable Drizzle query boundary.
    const chain: any = {
      from: () => chain,
      where: () => chain,
      innerJoin: () => chain,
      orderBy: () => chain,
      groupBy: () => chain,
      limit: () => Promise.resolve(queue.shift() ?? []),
      // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders are intentionally awaitable.
      then: (fulfilled: (value: unknown) => unknown, rejected?: (reason: unknown) => unknown) =>
        Promise.resolve(queue.shift() ?? []).then(fulfilled, rejected),
    }
    return chain
  }
  return { select } as never
}

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
  it("reports the first missing setup step for an empty tenant", async () => {
    const readiness = createActivationReadinessService(database([]))
    await expect(
      readiness({ organizationId: "tenant-1", role: "member" } as never),
    ).resolves.toMatchObject({
      outcome: "setup_required",
      canManage: false,
      completedCount: 0,
      totalCount: 5,
      nextStepId: "business_identity",
    })
  })

  it.each([
    "owner",
    "admin",
  ] as const)("reports schedule readiness for a configured %s", async (role) => {
    const location = {
      id: "unit-1",
      timezone: "America/Recife",
      openingPeriods: [{ days: ["monday"], start: "09:00", end: "18:00" }],
    }
    const series = {
      id: "series-1",
      organizationId: "tenant-1",
      unitId: "unit-1",
      professionalId: "professional-1",
      kind: "available" as const,
      start: "09:00",
      end: "18:00",
      weekdays: ["monday"],
      effectiveFrom: "2026-09-07",
      effectiveUntil: null,
      excludedDates: [],
      status: "active" as const,
      version: 1,
    }
    const readiness = createActivationReadinessService(
      database(
        [{ id: "profile-1", primaryUnitId: "unit-1" }],
        [location],
        [{ id: "professional-1" }],
        [{ id: "service-1" }],
        [series],
        [{ professionalId: "professional-1", durationMinutes: 30 }],
      ),
      () => new Date("2026-09-07T12:00:00.000Z"),
    )
    await expect(readiness({ organizationId: "tenant-1", role } as never)).resolves.toMatchObject({
      outcome: "schedule_ready",
      canManage: true,
      completedCount: 5,
      totalCount: 5,
      nextStepId: null,
    })
  })

  it("does not treat a service with no usable duration as schedule-ready", async () => {
    const location = {
      id: "unit-1",
      timezone: "America/Recife",
      openingPeriods: [{ days: ["monday"], start: "09:00", end: "18:00" }],
    }
    const series = {
      id: "series-1",
      unitId: "unit-1",
      professionalId: "professional-1",
      kind: "available" as const,
      start: "09:00",
      end: "18:00",
      weekdays: ["monday"],
      effectiveFrom: "2026-09-07",
      effectiveUntil: null,
      excludedDates: [],
      status: "active" as const,
      version: 1,
    }
    const readiness = createActivationReadinessService(
      database(
        [{ id: "profile-1", primaryUnitId: "unit-1" }],
        [location],
        [],
        [],
        [series],
        [{ professionalId: "professional-1", durationMinutes: null }],
      ),
      () => new Date("2026-09-07T12:00:00.000Z"),
    )
    await expect(
      readiness({ organizationId: "tenant-1", role: "member" } as never),
    ).resolves.toMatchObject({
      outcome: "setup_required",
      completedCount: 2,
      nextStepId: "professional",
    })
  })

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
