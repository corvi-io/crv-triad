import { describe, expect, it, vi } from "vitest"

import { createAvailabilityService } from "../../../src/modules/availability/application/availability-service.js"

function database(input: { selects?: unknown[][]; returning?: unknown[][] } = {}) {
  const selects = [...(input.selects ?? [])]
  const returning = [...(input.returning ?? [])]
  // biome-ignore lint/suspicious/noExplicitAny: the fluent test double intentionally models several Drizzle builder shapes.
  const chain = (queue: unknown[][]): any => {
    // biome-ignore lint/suspicious/noExplicitAny: recursive fluent methods require a dynamic structural double.
    const current: any = {
      from: () => current,
      where: () => current,
      orderBy: () => current,
      innerJoin: () => current,
      for: () => current,
      limit: () => Promise.resolve(queue.shift() ?? []),
      returning: () => Promise.resolve(returning.shift() ?? []),
      values: () => current,
      set: () => current,
      // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders are intentionally awaitable.
      then: (fulfilled: (value: unknown) => unknown, rejected?: (reason: unknown) => unknown) =>
        Promise.resolve(queue.shift() ?? []).then(fulfilled, rejected),
    }
    return current
  }
  // biome-ignore lint/suspicious/noExplicitAny: only the database boundary is replaced by this scripted double.
  const db: any = {
    select: () => chain(selects),
    update: () => chain(returning),
    insert: () => chain(returning),
    execute: vi.fn(async () => ({ rows: [] })),
  }
  db.transaction = vi.fn(async (operation: (tx: unknown) => unknown) => operation(db))
  return db
}

const location = {
  id: "unit-1",
  status: "active",
  timezone: "America/Recife",
  version: 2,
  openingPeriods: [{ days: ["monday"], start: "09:00", end: "18:00" }],
  openingDays: [],
  openingStart: "00:00",
  openingEnd: "00:00",
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
const seriesInput = {
  unitId: series.unitId,
  professionalId: series.professionalId,
  kind: series.kind,
  start: series.start,
  end: series.end,
  weekdays: series.weekdays,
  effectiveFrom: series.effectiveFrom,
  effectiveUntil: series.effectiveUntil,
}

describe("availability service", () => {
  it("returns a bounded projected range and filters a professional", async () => {
    const db = database({
      selects: [[location], [series, { ...series, id: "series-2", professionalId: "other" }]],
    })
    const result = await createAvailabilityService(db, vi.fn()).range("tenant-1", {
      unitId: "unit-1",
      startDate: "2026-09-07",
      endDate: "2026-09-07",
      professionalId: "professional-1",
    })
    expect(result.series).toHaveLength(1)
    expect(result.occurrences).toHaveLength(1)
    expect(result.timezone).toBe("America/Recife")
  })

  it("includes archived rules only when requested", async () => {
    const archived = { ...series, id: "archived", status: "archived" as const }
    const db = database({ selects: [[location], [series], [archived]] })
    const result = await createAvailabilityService(db, vi.fn()).range("tenant-1", {
      unitId: "unit-1",
      startDate: "2026-09-07",
      endDate: "2026-09-07",
      includeArchived: true,
    })
    expect(result.archived).toEqual([archived])
  })

  it("rejects unknown units and either active or archived capacity overflow", async () => {
    await expect(
      createAvailabilityService(database({ selects: [[]] }), vi.fn()).range("tenant-1", {
        unitId: "missing",
        startDate: "2026-09-07",
        endDate: "2026-09-07",
      }),
    ).rejects.toThrow("not_found")

    await expect(
      createAvailabilityService(
        database({ selects: [[location], Array(2001).fill(series)] }),
        vi.fn(),
      ).range("tenant-1", {
        unitId: "unit-1",
        startDate: "2026-09-07",
        endDate: "2026-09-07",
      }),
    ).rejects.toThrow("range_capacity_exceeded")

    await expect(
      createAvailabilityService(
        database({ selects: [[location], [], Array(2001).fill(series)] }),
        vi.fn(),
      ).range("tenant-1", {
        unitId: "unit-1",
        startDate: "2026-09-07",
        endDate: "2026-09-07",
        includeArchived: true,
      }),
    ).rejects.toThrow("range_capacity_exceeded")
  })

  it("loads details and active-series summary with explicit not-found behavior", async () => {
    await expect(
      createAvailabilityService(database({ selects: [[series]] }), vi.fn()).detail(
        "tenant-1",
        series.id,
      ),
    ).resolves.toEqual(series)
    await expect(
      createAvailabilityService(database({ selects: [[]] }), vi.fn()).detail("tenant-1", "missing"),
    ).rejects.toThrow("not_found")
    await expect(
      createAvailabilityService(database({ selects: [[{ activeSeries: 3 }]] }), vi.fn()).summary(
        "tenant-1",
      ),
    ).resolves.toEqual({ activeSeries: 3 })
  })

  it("validates timezone transitions and optimistic concurrency", async () => {
    const service = createAvailabilityService(database(), vi.fn())
    await expect(service.timezone("tenant-1", "unit-1", "invalid", 2)).rejects.toThrow(
      "invalid_request",
    )

    for (const [record, version, expected] of [
      [undefined, 2, "not_found"],
      [location, 1, "version_conflict"],
    ] as const) {
      const db = database({ selects: [record ? [record] : []] })
      await expect(
        createAvailabilityService(db, vi.fn()).timezone(
          "tenant-1",
          "unit-1",
          "America/Sao_Paulo",
          version,
        ),
      ).rejects.toThrow(expected)
    }
  })

  it("blocks timezone changes after scheduling or financial use", async () => {
    const scheduled = database({ selects: [[location], [{ id: "rule-1" }]] })
    await expect(
      createAvailabilityService(scheduled, vi.fn()).timezone(
        "tenant-1",
        "unit-1",
        "America/Sao_Paulo",
        2,
      ),
    ).rejects.toThrow("timezone_in_use")

    const financial = database({ selects: [[location], []] })
    await expect(
      createAvailabilityService(financial, vi.fn(), "", async () => true).timezone(
        "tenant-1",
        "unit-1",
        "America/Sao_Paulo",
        2,
      ),
    ).rejects.toThrow("timezone_in_use")
  })

  it("updates a timezone when the unit has no dependent records", async () => {
    const updated = { ...location, timezone: "America/Sao_Paulo", version: 3 }
    const db = database({ selects: [[location], []], returning: [[updated]] })
    await expect(
      createAvailabilityService(db, vi.fn()).timezone("tenant-1", "unit-1", "America/Sao_Paulo", 2),
    ).resolves.toEqual({ id: "unit-1", version: 3 })
  })

  it("replays matching idempotent commands and rejects conflicting reuse", async () => {
    const command = { actorUserId: "user-1", key: "018f47a2-e600-7b12-8000-000000000001" }
    const receipt = { fingerprint: "mismatch", resourceId: "series-existing", resourceVersion: 4 }
    const conflict = database({ selects: [[receipt]] })
    await expect(
      createAvailabilityService(conflict, vi.fn(), "secret").save(
        "tenant-1",
        seriesInput,
        undefined,
        command,
      ),
    ).rejects.toThrow("idempotency_conflict")
    await expect(
      createAvailabilityService(database(), vi.fn()).save("tenant-1", seriesInput, undefined, {
        ...command,
        key: "not-a-uuid",
      }),
    ).rejects.toThrow()
  })

  it("rejects invalid edits before mutating availability", async () => {
    const missing = database({ selects: [[]] })
    await expect(
      createAvailabilityService(missing, vi.fn()).save("tenant-1", null, {
        id: "missing",
        version: 1,
        scope: "series",
      }),
    ).rejects.toThrow("not_found")

    const stale = database({ selects: [[series]] })
    await expect(
      createAvailabilityService(stale, vi.fn()).save("tenant-1", seriesInput, {
        id: series.id,
        version: 2,
        scope: "series",
      }),
    ).rejects.toThrow("version_conflict")

    const invalid = database({ selects: [[series]] })
    await expect(
      createAvailabilityService(invalid, vi.fn()).save("tenant-1", null, {
        id: series.id,
        version: 1,
        scope: "series",
        archive: true,
        restore: true,
      }),
    ).rejects.toThrow("invalid_request")
  })

  it("updates an existing series and runs the occupancy guard", async () => {
    const updated = { ...series, start: "10:00", end: "17:00", version: 2 }
    const db = database({
      selects: [[series], [location], [{ id: "professional-1", name: "Ana" }], [updated]],
      returning: [[]],
    })
    const guard = vi.fn(async () => undefined)
    await expect(
      createAvailabilityService(db, guard).save(
        "tenant-1",
        { ...seriesInput, start: "10:00", end: "17:00" },
        { id: series.id, version: 1, scope: "series" },
      ),
    ).resolves.toEqual({ id: series.id, version: 2 })
    expect(guard).toHaveBeenCalledWith(expect.anything(), "tenant-1", "unit-1", "professional-1", [
      updated,
    ])
  })

  it("rejects relation changes, archived edits, and overlapping active rules", async () => {
    const changedRelation = database({ selects: [[series]] })
    await expect(
      createAvailabilityService(changedRelation, vi.fn()).save(
        "tenant-1",
        { ...seriesInput, unitId: "unit-2" },
        { id: series.id, version: 1, scope: "series" },
      ),
    ).rejects.toThrow("invalid_relation")

    const archived = database({ selects: [[{ ...series, status: "archived" }]] })
    await expect(
      createAvailabilityService(archived, vi.fn()).save("tenant-1", seriesInput, {
        id: series.id,
        version: 1,
        scope: "series",
      }),
    ).rejects.toThrow("invalid_transition")

    const overlapping = { ...series, id: "series-2", start: "10:00", end: "12:00" }
    const db = database({
      selects: [
        [series],
        [location],
        [{ id: "professional-1", name: "Ana" }],
        [series, overlapping],
      ],
      returning: [[]],
    })
    await expect(
      createAvailabilityService(db, vi.fn()).save("tenant-1", seriesInput, {
        id: series.id,
        version: 1,
        scope: "series",
      }),
    ).rejects.toThrow("availability_overlap")
  })

  it("archives, restores, and overrides one occurrence", async () => {
    const excluded = { ...series, excludedDates: ["2026-09-07"] }
    for (const existing of [
      {
        id: series.id,
        version: 1,
        scope: "occurrence" as const,
        date: "2026-09-07",
        archive: true,
      },
      {
        id: series.id,
        version: 1,
        scope: "occurrence" as const,
        date: "2026-09-07",
        restore: true,
      },
    ]) {
      const current = existing.restore ? excluded : series
      const db = database({
        selects: [[current], [location], [{ id: "professional-1", name: "Ana" }], [current]],
        returning: [[]],
      })
      await expect(
        createAvailabilityService(db, vi.fn()).save("tenant-1", null, existing),
      ).resolves.toEqual({
        id: series.id,
        version: 2,
      })
    }

    const override = database({
      selects: [[series], [location], [{ id: "professional-1", name: "Ana" }], []],
      returning: [[], []],
    })
    await expect(
      createAvailabilityService(override, vi.fn()).save(
        "tenant-1",
        { ...seriesInput, start: "10:00", end: "11:00" },
        { id: series.id, version: 1, scope: "occurrence", date: "2026-09-07" },
      ),
    ).resolves.toMatchObject({ version: 1 })
  })

  it("rejects invalid occurrence targets and series capacity", async () => {
    const noOccurrence = database({
      selects: [[{ ...series, weekdays: ["tuesday"] }], [location], [{ id: "professional-1" }]],
    })
    await expect(
      createAvailabilityService(noOccurrence, vi.fn()).save("tenant-1", null, {
        id: series.id,
        version: 1,
        scope: "occurrence",
        date: "2026-09-07",
        archive: true,
      }),
    ).rejects.toThrow("not_found")

    const full = {
      ...series,
      excludedDates: Array.from(
        { length: 1000 },
        (_, index) => `2024-01-${String((index % 28) + 1).padStart(2, "0")}`,
      ),
    }
    const capacity = database({ selects: [[full], [location], [{ id: "professional-1" }]] })
    await expect(
      createAvailabilityService(capacity, vi.fn()).save("tenant-1", null, {
        id: series.id,
        version: 1,
        scope: "occurrence",
        date: "2026-09-07",
        archive: true,
      }),
    ).rejects.toThrow("series_capacity_exceeded")
  })
})
