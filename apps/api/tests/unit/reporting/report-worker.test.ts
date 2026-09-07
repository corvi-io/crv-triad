import { describe, expect, it, vi } from "vitest"
import {
  createReportObjectKey,
  createReportWorker,
} from "../../../src/modules/reporting/application/report-worker.js"

const request = {
  id: "request-1",
  organizationId: "tenant-1",
  requesterUserId: "user-1",
  requesterEmail: "owner@example.com",
  reportType: "sales_revenue" as const,
  format: "csv" as const,
  filters: { from: "2026-09-01", to: "2026-09-07", timezone: "America/Recife" },
  configSnapshot: {
    reportType: "sales_revenue" as const,
    filters: { from: "2026-09-01", to: "2026-09-07" },
    timezone: "America/Recife",
    includeReversals: true,
  },
  status: "queued" as const,
  activeAttempt: 1,
  emailDeliveryStatus: "pending" as const,
  emailDeliveryFailureCode: null,
  emailDeliveryClaimedAt: null,
  emailDeliveredAt: null,
  safeFailureCode: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-09-07T12:00:00.000Z"),
  updatedAt: new Date("2026-09-07T12:00:00.000Z"),
  version: 1,
}

function scriptedDatabase(
  input: { selects?: unknown[][]; returning?: unknown[][]; executeRows?: unknown[][] } = {},
) {
  const selects = [...(input.selects ?? [])]
  const returning = [...(input.returning ?? [])]
  const executeRows = [...(input.executeRows ?? [])]
  const events: string[] = []
  // biome-ignore lint/suspicious/noExplicitAny: the fluent test double intentionally models several Drizzle builder shapes.
  const chain = (kind: "select" | "returning" = "select"): any => {
    const resolve = () => (kind === "select" ? (selects.shift() ?? []) : (returning.shift() ?? []))
    // biome-ignore lint/suspicious/noExplicitAny: recursive fluent methods require a dynamic structural double.
    const current: any = {
      from: () => current,
      where: () => current,
      orderBy: () => current,
      innerJoin: () => current,
      for: () => current,
      limit: () => Promise.resolve(resolve()),
      returning: () => Promise.resolve(returning.shift() ?? []),
      onConflictDoNothing: () => Promise.resolve(undefined),
      values: () => current,
      set: () => current,
      // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders are intentionally awaitable.
      then: (fulfilled: (value: unknown) => unknown, rejected?: (reason: unknown) => unknown) =>
        Promise.resolve(resolve()).then(fulfilled, rejected),
    }
    return current
  }
  // biome-ignore lint/suspicious/noExplicitAny: only the database boundary is replaced by this scripted double.
  const db: any = {
    select: () => chain("select"),
    update: () => chain("returning"),
    insert: () => chain("returning"),
    execute: vi.fn(async () => ({ rows: executeRows.shift() ?? [] })),
  }
  db.transaction = vi.fn(async (operation: (tx: unknown) => unknown) => {
    events.push("transaction")
    return operation(db)
  })
  return { db, events }
}

const storage = () => ({
  put: vi.fn(async () => ({ checksum: "checksum", byteSize: 10 })),
  head: vi.fn(async () => ({ checksum: "checksum", byteSize: 10 })),
  delete: vi.fn(async () => undefined),
  downloadUrl: vi.fn(async () => "https://download.example/report.csv"),
})

describe("report worker object keys", () => {
  it("places tenant reports in a dated ownership namespace", () => {
    expect(
      createReportObjectKey({
        organizationId: "tenant-1",
        reportType: "sales_revenue",
        createdAt: new Date("2026-09-07T23:30:00-03:00"),
        reportRequestId: "request-1",
        attempt: 2,
        format: "csv",
      }),
    ).toBe("tenants/tenant-1/reports/sales-revenue/2026/09/request-1/attempt-2.csv")
  })

  it("ignores missing and terminal requests", async () => {
    const missing = scriptedDatabase({ selects: [[]] })
    await expect(
      createReportWorker(missing.db, {} as never, storage() as never).run({
        organizationId: "tenant-1",
        reportRequestId: "missing",
      }),
    ).resolves.toEqual({ outcome: "missing" })

    const ignored = scriptedDatabase({ selects: [[{ ...request, status: "failed" }]] })
    await expect(
      createReportWorker(ignored.db, {} as never, storage() as never).run({
        organizationId: "tenant-1",
        reportRequestId: request.id,
      }),
    ).resolves.toEqual({ outcome: "ignored" })
  })

  it("marks delivery inapplicable when the requester has no email", async () => {
    const database = scriptedDatabase({
      selects: [[{ ...request, status: "ready", requesterEmail: null }]],
    })
    await expect(
      createReportWorker(database.db, {} as never, storage() as never).run({
        organizationId: "tenant-1",
        reportRequestId: request.id,
      }),
    ).resolves.toEqual({ outcome: "ready" })
  })

  it("delivers a ready report and records the observable outcome", async () => {
    const database = scriptedDatabase({
      selects: [
        [{ ...request, status: "ready" }],
        [{ objectKey: "tenants/tenant-1/reports/report.csv" }],
      ],
      returning: [[{ id: request.id }]],
    })
    const provider = storage()
    const emailSender = { send: vi.fn(async () => ({})) }
    const observe = vi.fn()
    await expect(
      createReportWorker(
        database.db,
        {} as never,
        provider as never,
        emailSender,
        undefined,
        observe,
      ).run({
        organizationId: "tenant-1",
        reportRequestId: request.id,
      }),
    ).resolves.toEqual({ outcome: "ready" })
    expect(provider.downloadUrl).toHaveBeenCalledWith(
      "tenants/tenant-1/reports/report.csv",
      7 * 24 * 60 * 60,
    )
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: request.requesterEmail }),
    )
    expect(observe).toHaveBeenCalledWith({
      event: "report_email_delivered",
      reportRequestId: request.id,
    })
  })

  it("rejects an active delivery lease and records provider failures safely", async () => {
    const claimed = scriptedDatabase({
      selects: [[{ ...request, status: "ready" }]],
      returning: [[]],
    })
    await expect(
      createReportWorker(claimed.db, {} as never, storage() as never, { send: vi.fn() }).run({
        organizationId: "tenant-1",
        reportRequestId: request.id,
      }),
    ).rejects.toThrow("report_email_delivery_claim_active")

    const failed = scriptedDatabase({
      selects: [[{ ...request, status: "ready" }], [{ objectKey: "report.csv" }]],
      returning: [[{ id: request.id }]],
    })
    const observe = vi.fn()
    await expect(
      createReportWorker(
        failed.db,
        {} as never,
        storage() as never,
        {
          send: vi.fn(async () => {
            throw new Error("private provider error")
          }),
        },
        undefined,
        observe,
      ).run({ organizationId: "tenant-1", reportRequestId: request.id }),
    ).rejects.toThrow("report_email_delivery_failed")
    expect(observe).toHaveBeenCalledWith(
      expect.objectContaining({ safeFailureCode: "delivery_failed" }),
    )
  })

  it("generates, verifies, persists, and delivers a CSV artifact", async () => {
    const database = scriptedDatabase({
      selects: [
        [request],
        [{ objectKey: "tenants/tenant-1/reports/sales-revenue/2026/09/request-1/attempt-1.csv" }],
      ],
      executeRows: [[], []],
      returning: [[], [], [{ id: request.id }], [], [{ id: request.id }]],
    })
    const provider = storage()
    const reporting = { report: vi.fn(async () => [["Vendas", "2"]]) }
    const emailSender = { send: vi.fn(async () => ({})) }
    const observe = vi.fn()
    const result = await createReportWorker(
      database.db,
      reporting as never,
      provider as never,
      emailSender,
      undefined,
      observe,
    ).run({ organizationId: "tenant-1", reportRequestId: request.id })
    expect(result).toEqual({
      outcome: "ready",
      objectKey: "tenants/tenant-1/reports/sales-revenue/2026/09/request-1/attempt-1.csv",
    })
    expect(provider.put).toHaveBeenCalledWith(
      expect.stringContaining("attempt-1.csv"),
      expect.any(Uint8Array),
      "text/csv",
    )
    expect(observe).toHaveBeenCalledWith({
      event: "report_export_ready",
      reportRequestId: request.id,
      attempt: 1,
    })
  })

  it("marks generation failures and sends the failure notification", async () => {
    const database = scriptedDatabase({ selects: [[request]], executeRows: [[], []] })
    const emailSender = {
      send: vi.fn(),
      sendFailure: vi.fn(async () => ({})),
    }
    const observe = vi.fn()
    const worker = createReportWorker(
      database.db,
      {
        report: vi.fn(async () => {
          throw new Error("query_failed")
        }),
      } as never,
      storage() as never,
      emailSender,
      undefined,
      observe,
    )
    await expect(
      worker.run({ organizationId: "tenant-1", reportRequestId: request.id }),
    ).rejects.toThrow("query_failed")
    expect(emailSender.sendFailure).toHaveBeenCalled()
    expect(observe).toHaveBeenCalledWith(expect.objectContaining({ event: "report_export_failed" }))
  })

  it("supports explicit delivery terminal states and expires artifacts", async () => {
    for (const emailDeliveryStatus of ["sent", "not_applicable"] as const) {
      const database = scriptedDatabase({
        selects: [[{ ...request, status: "ready", emailDeliveryStatus }]],
      })
      await expect(
        createReportWorker(database.db, {} as never, storage() as never).deliver({
          organizationId: "tenant-1",
          reportRequestId: request.id,
        }),
      ).resolves.toEqual({ outcome: "sent" })
    }
    const ignored = scriptedDatabase({ selects: [[{ ...request, status: "failed" }]] })
    await expect(
      createReportWorker(ignored.db, {} as never, storage() as never).deliver({
        organizationId: "tenant-1",
        reportRequestId: request.id,
      }),
    ).resolves.toEqual({ outcome: "ignored" })

    const artifact = {
      id: "artifact-1",
      organizationId: "tenant-1",
      reportRequestId: request.id,
      attempt: 1,
      objectKey: "tenants/tenant-1/reports/report.csv",
    }
    const database = scriptedDatabase({ selects: [[artifact]] })
    const provider = storage()
    const observe = vi.fn()
    await expect(
      createReportWorker(
        database.db,
        {} as never,
        provider as never,
        undefined,
        undefined,
        observe,
      ).expire(new Date("2026-10-08T00:00:00.000Z")),
    ).resolves.toBe(1)
    expect(provider.delete).toHaveBeenCalledWith(artifact.objectKey)
    expect(observe).toHaveBeenCalledWith(
      expect.objectContaining({ event: "report_export_expired" }),
    )
  })
})
