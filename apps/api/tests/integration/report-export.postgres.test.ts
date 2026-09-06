import { fileURLToPath } from "node:url"
import { and, count, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { member, organization, user } from "../../src/modules/idp/database/schema.js"
import {
  createFakeArtifactStorage,
  createFakeReportDispatcher,
} from "../../src/modules/reporting/application/export-providers.js"
import { createReportExportService } from "../../src/modules/reporting/application/report-export-service.js"
import { createReportWorker } from "../../src/modules/reporting/application/report-worker.js"
import { createReportingService } from "../../src/modules/reporting/application/reporting-service.js"
import {
  reportArtifact,
  reportAttempt,
  reportRequest,
} from "../../src/modules/reporting/database/schema.js"

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is required")
const target = new URL(url)
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  target.port === "5432" ||
  !target.pathname.endsWith("_test")
)
  throw new Error("Isolated local test database required")
const pool = new Pool({ connectionString: url })
const db = drizzle(pool)
const actor = {
  organizationId: "report-a",
  organizationName: "Report A",
  actorUserId: "report-owner",
  membershipId: "report-member",
  role: "owner" as const,
}
const baseInput = {
  format: "csv" as const,
  filters: { from: "2026-09-01", to: "2026-09-06" },
  timezone: "America/Recife",
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  await db
    .insert(organization)
    .values({ id: actor.organizationId, name: "Report A", slug: "report-a" })
  await db.insert(user).values({
    id: actor.actorUserId,
    name: "Owner",
    email: "report@example.invalid",
    emailVerified: true,
  })
  await db.insert(member).values({
    id: "report-member",
    organizationId: actor.organizationId,
    userId: actor.actorUserId,
    role: "owner",
  })
})

afterAll(async () => {
  await db.delete(reportArtifact).where(eq(reportArtifact.organizationId, actor.organizationId))
  await db.delete(reportAttempt).where(eq(reportAttempt.organizationId, actor.organizationId))
  await db.delete(reportRequest).where(eq(reportRequest.organizationId, actor.organizationId))
  await db.delete(member).where(eq(member.organizationId, actor.organizationId))
  await db.delete(user).where(eq(user.id, actor.actorUserId))
  await db.delete(organization).where(eq(organization.id, actor.organizationId))
  await pool.end()
})

describe.sequential("report export lifecycle", () => {
  it("recovers a response lost after dispatch through global idempotency", async () => {
    const underlying = createFakeReportDispatcher()
    let loseResponse = true
    const dispatcher = {
      async dispatch(payload: Parameters<typeof underlying.dispatch>[0], key: string) {
        const result = await underlying.dispatch(payload, key)
        if (loseResponse) {
          loseResponse = false
          throw new Error("connection_lost")
        }
        return result
      },
    }
    const service = createReportExportService(db as never, dispatcher, createFakeArtifactStorage())
    const idempotencyKey = crypto.randomUUID()
    await expect(service.request(actor, { ...baseInput, idempotencyKey })).rejects.toThrow(
      "connection_lost",
    )
    const recovered = await service.request(actor, { ...baseInput, idempotencyKey })
    expect(recovered?.providerRunReference).toMatch(/^fake_/)
    expect(
      (
        await db
          .select({ value: count() })
          .from(reportRequest)
          .where(
            and(
              eq(reportRequest.organizationId, actor.organizationId),
              eq(reportRequest.idempotencyKey, idempotencyKey),
            ),
          )
      )[0].value,
    ).toBe(1)
  })

  it("serializes concurrent requests per tenant and preserves one immutable snapshot", async () => {
    const service = createReportExportService(
      db as never,
      createFakeReportDispatcher(),
      createFakeArtifactStorage(),
    )
    const idempotencyKey = crypto.randomUUID()
    const input = {
      ...baseInput,
      reportType: "commissions",
      config: { includeReversals: false },
      idempotencyKey,
    }
    const [first, second] = await Promise.all([
      service.request(actor, input),
      service.request(actor, input),
    ])
    expect(first?.id).toBe(second?.id)
    expect(first?.configSnapshot).toMatchObject({
      reportType: "commissions",
      includeReversals: false,
    })
    expect(first).not.toHaveProperty("requesterEmail")
    const [persisted] = await db
      .select({ requesterEmail: reportRequest.requesterEmail })
      .from(reportRequest)
      .where(eq(reportRequest.id, first?.id ?? ""))
    expect(persisted?.requesterEmail).toBe("report@example.invalid")
    await expect(
      service.request(actor, {
        ...baseInput,
        reportType: "sales_revenue",
        idempotencyKey,
      }),
    ).rejects.toThrow("idempotency_conflict")
  })

  it("requires the requester's active verified identity email", async () => {
    const service = createReportExportService(
      db as never,
      createFakeReportDispatcher(),
      createFakeArtifactStorage(),
    )
    await db.update(user).set({ emailVerified: false }).where(eq(user.id, actor.actorUserId))
    await expect(
      service.request(actor, { ...baseInput, idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow("requester_email_unverified")
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, actor.actorUserId))
  })

  it("returns the six typed reports and only a masked verified destination", async () => {
    const service = createReportExportService(
      db as never,
      createFakeReportDispatcher(),
      createFakeArtifactStorage(),
    )
    const catalog = await service.catalog(actor)
    expect(catalog.items).toHaveLength(6)
    expect(catalog.items.map((item) => item.id)).toEqual([
      "sales_revenue",
      "professional_performance",
      "commissions",
      "new_returning_customers",
      "cancellations_no_shows",
      "cash_payments",
    ])
    expect(catalog.requester).toEqual({ maskedEmail: "re••••@example.invalid", verified: true })
    expect(JSON.stringify(catalog)).not.toContain("report@example.invalid")

    await db.update(user).set({ emailVerified: false }).where(eq(user.id, actor.actorUserId))
    await expect(service.catalog(actor)).rejects.toThrow("requester_email_unverified")
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, actor.actorUserId))
  })

  it("allows only one active generation per tenant", async () => {
    const storage = createFakeArtifactStorage()
    const service = createReportExportService(db as never, createFakeReportDispatcher(), storage)
    const first = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    const second = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    let releaseSummary: (() => void) | undefined
    let markSummaryStarted: (() => void) | undefined
    const summaryStarted = new Promise<void>((resolve) => {
      markSummaryStarted = resolve
    })
    const summaryReleased = new Promise<void>((resolve) => {
      releaseSummary = resolve
    })
    const delayedReporting = {
      async summary() {
        markSummaryStarted?.()
        await summaryReleased
        return {
          summary: {
            receiptCount: 0,
            performedItems: 0,
            netRevenueCents: 0,
            grossCents: 0,
            commissionCents: 0,
            barbershopShareCents: 0,
            reversalCount: 0,
          },
        }
      },
    }
    const worker = createReportWorker(db as never, delayedReporting as never, storage)
    const firstRun = worker.run({
      organizationId: actor.organizationId,
      reportRequestId: first?.id ?? "",
    })
    await summaryStarted
    await expect(
      worker.run({ organizationId: actor.organizationId, reportRequestId: second?.id ?? "" }),
    ).rejects.toThrow("tenant_report_concurrency_busy")
    releaseSummary?.()
    await expect(firstRun).resolves.toMatchObject({ outcome: "ready" })
  })

  it("allows only one concurrent retry to create and dispatch an attempt", async () => {
    let dispatched = 0
    const dispatcher = {
      async dispatch() {
        dispatched += 1
        return { runReference: `run-${dispatched}` }
      },
    }
    const service = createReportExportService(db as never, dispatcher, createFakeArtifactStorage())
    const requested = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    await db
      .update(reportRequest)
      .set({ status: "failed" })
      .where(eq(reportRequest.id, requested?.id ?? ""))
    dispatched = 0
    await Promise.all([
      service.retry(actor, requested?.id ?? ""),
      service.retry(actor, requested?.id ?? ""),
    ])
    expect(dispatched).toBe(1)
    expect(
      (
        await db
          .select({ value: count() })
          .from(reportAttempt)
          .where(eq(reportAttempt.reportRequestId, requested?.id ?? ""))
      )[0].value,
    ).toBe(2)
  })

  it("converges after upload succeeds and the ready transaction fails", async () => {
    const storage = createFakeArtifactStorage()
    const service = createReportExportService(db as never, createFakeReportDispatcher(), storage)
    const requested = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    const originalTransaction = db.transaction.bind(db)
    let transactions = 0
    const faultDb = new Proxy(db, {
      get(target, property, receiver) {
        if (property === "transaction")
          return async (callback: never) => {
            transactions += 1
            if (transactions === 2) throw new Error("database_unavailable")
            return originalTransaction(callback)
          }
        return Reflect.get(target, property, receiver)
      },
    })
    const workerWithFault = createReportWorker(
      faultDb as never,
      createReportingService(db as never),
      storage,
    )
    await expect(
      workerWithFault.run({
        organizationId: actor.organizationId,
        reportRequestId: requested?.id ?? "",
      }),
    ).rejects.toThrow("database_unavailable")
    expect((await service.status(actor, requested?.id ?? ""))?.status).toBe("running")
    const recovered = await createReportWorker(
      db as never,
      createReportingService(db as never),
      storage,
    ).run({ organizationId: actor.organizationId, reportRequestId: requested?.id ?? "" })
    expect(recovered.outcome).toBe("ready")
    expect((await service.status(actor, requested?.id ?? ""))?.status).toBe("ready")
    expect(
      (
        await db
          .select({ value: count() })
          .from(reportArtifact)
          .where(eq(reportArtifact.reportRequestId, requested?.id ?? ""))
      )[0].value,
    ).toBe(1)
  })

  it("keeps generation ready while retrying email delivery independently", async () => {
    const storage = createFakeArtifactStorage()
    const service = createReportExportService(db as never, createFakeReportDispatcher(), storage)
    const requested = await service.request(actor, {
      ...baseInput,
      reportType: "commissions",
      idempotencyKey: crypto.randomUUID(),
    })
    let deliveries = 0
    const emailSender = {
      async send() {
        deliveries += 1
        if (deliveries === 1) throw new Error("provider_unavailable")
        return { deliveryReference: "email-ready" }
      },
    }
    const worker = createReportWorker(
      db as never,
      createReportingService(db as never),
      storage,
      emailSender,
      "https://studio.example.com",
    )
    await expect(
      worker.run({ organizationId: actor.organizationId, reportRequestId: requested?.id ?? "" }),
    ).rejects.toThrow("report_email_delivery_failed")
    expect((await service.status(actor, requested?.id ?? ""))?.status).toBe("ready")
    expect((await service.status(actor, requested?.id ?? ""))?.emailDeliveryStatus).toBe("failed")
    await expect(
      worker.run({ organizationId: actor.organizationId, reportRequestId: requested?.id ?? "" }),
    ).resolves.toMatchObject({ outcome: "ready" })
    expect((await service.status(actor, requested?.id ?? ""))?.emailDeliveryStatus).toBe("sent")
  })

  it("deletes expired artifacts and changes ready requests to expired", async () => {
    const storage = createFakeArtifactStorage()
    const service = createReportExportService(db as never, createFakeReportDispatcher(), storage)
    const requested = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    const worker = createReportWorker(db as never, createReportingService(db as never), storage)
    await worker.run({ organizationId: actor.organizationId, reportRequestId: requested?.id ?? "" })
    await db
      .update(reportArtifact)
      .set({ expiresAt: new Date(0) })
      .where(eq(reportArtifact.reportRequestId, requested?.id ?? ""))
    expect(await worker.expire()).toBeGreaterThanOrEqual(1)
    expect((await service.status(actor, requested?.id ?? ""))?.status).toBe("expired")
  })
})
