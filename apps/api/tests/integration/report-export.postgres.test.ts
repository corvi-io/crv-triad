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
const otherActor = {
  organizationId: "report-b",
  organizationName: "Report B",
  actorUserId: "report-b-owner",
  membershipId: "report-b-member",
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
  await db.insert(organization).values({ id: "report-b", name: "Report B", slug: "report-b" })
  await db.insert(user).values({
    id: "report-b-owner",
    name: "Other owner",
    email: "other-report@example.invalid",
    emailVerified: true,
  })
  await db.insert(member).values({
    id: "report-b-member",
    organizationId: "report-b",
    userId: "report-b-owner",
    role: "owner",
  })
})

afterAll(async () => {
  await db.delete(reportArtifact).where(eq(reportArtifact.organizationId, actor.organizationId))
  await db.delete(reportAttempt).where(eq(reportAttempt.organizationId, actor.organizationId))
  await db.delete(reportRequest).where(eq(reportRequest.organizationId, actor.organizationId))
  await db.delete(member).where(eq(member.organizationId, otherActor.organizationId))
  await db.delete(member).where(eq(member.organizationId, actor.organizationId))
  await db.delete(user).where(eq(user.id, otherActor.actorUserId))
  await db.delete(user).where(eq(user.id, actor.actorUserId))
  await db.delete(organization).where(eq(organization.id, otherActor.organizationId))
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
    const [persisted] = await db
      .select({ providerRunReference: reportRequest.providerRunReference })
      .from(reportRequest)
      .where(eq(reportRequest.id, recovered?.id ?? ""))
    expect(persisted?.providerRunReference).toMatch(/^fake_/)
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
    const [snapshot] = await db
      .select({ configSnapshot: reportRequest.configSnapshot })
      .from(reportRequest)
      .where(eq(reportRequest.id, first?.id ?? ""))
    expect(snapshot?.configSnapshot).toMatchObject({
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

  it("returns the exact public DTO allowlist on status, history, and retry no-ops", async () => {
    const service = createReportExportService(
      db as never,
      createFakeReportDispatcher(),
      createFakeArtifactStorage(),
    )
    const requested = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    await db
      .update(reportRequest)
      .set({ status: "ready", emailDeliveryStatus: "sent" })
      .where(eq(reportRequest.id, requested?.id ?? ""))
    const responses = [
      await service.status(actor, requested?.id ?? ""),
      (await service.history(actor)).find((item) => item.id === requested?.id),
      await service.retry(actor, requested?.id ?? ""),
      await service.retryDelivery(actor, requested?.id ?? ""),
    ]
    const allowed = [
      "activeAttempt",
      "completedAt",
      "createdAt",
      "emailDeliveryStatus",
      "format",
      "id",
      "reportType",
      "safeFailureCode",
      "status",
    ]
    for (const response of responses) {
      expect(Object.keys(response ?? {}).sort()).toEqual(allowed)
      expect(response).not.toHaveProperty("requesterEmail")
      expect(response).not.toHaveProperty("requesterUserId")
      expect(response).not.toHaveProperty("idempotencyKey")
      expect(response).not.toHaveProperty("providerRunReference")
    }
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
      async report() {
        markSummaryStarted?.()
        await summaryReleased
        return []
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

  it("manually retries a failed delivery without regenerating or duplicating sent email", async () => {
    const storage = createFakeArtifactStorage()
    let deliveryDispatches = 0
    const dispatcher = {
      async dispatch() {
        return { runReference: "generation-run" }
      },
      async dispatchDelivery() {
        deliveryDispatches += 1
        return { runReference: `delivery-run-${deliveryDispatches}` }
      },
    }
    const service = createReportExportService(db as never, dispatcher, storage)
    const requested = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    await createReportWorker(db as never, createReportingService(db as never), storage).run({
      organizationId: actor.organizationId,
      reportRequestId: requested?.id ?? "",
    })
    await db
      .update(reportRequest)
      .set({ emailDeliveryStatus: "failed", emailDeliveryFailureCode: "delivery_failed" })
      .where(eq(reportRequest.id, requested?.id ?? ""))
    const before = await service.status(actor, requested?.id ?? "")
    await Promise.all([
      service.retryDelivery(actor, requested?.id ?? ""),
      service.retryDelivery(actor, requested?.id ?? ""),
    ])
    const pending = await service.status(actor, requested?.id ?? "")
    expect(deliveryDispatches).toBe(1)
    expect(pending).toMatchObject({
      status: "ready",
      emailDeliveryStatus: "pending",
      activeAttempt: before?.activeAttempt,
    })
    expect(
      (
        await db
          .select({ value: count() })
          .from(reportArtifact)
          .where(eq(reportArtifact.reportRequestId, requested?.id ?? ""))
      )[0]?.value,
    ).toBe(1)
    await db
      .update(reportRequest)
      .set({ emailDeliveryStatus: "sent", emailDeliveredAt: new Date() })
      .where(eq(reportRequest.id, requested?.id ?? ""))
    await service.retryDelivery(actor, requested?.id ?? "")
    expect(deliveryDispatches).toBe(1)
  })

  it("compensates delivery dispatch failure and converges after a lost dispatch response", async () => {
    const storage = createFakeArtifactStorage()
    const failingDispatcher = {
      async dispatch() {
        return { runReference: "generation-run" }
      },
      async dispatchDelivery() {
        throw new Error("dispatch_unavailable")
      },
    }
    const failingService = createReportExportService(db as never, failingDispatcher, storage)
    const requested = await failingService.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    await createReportWorker(db as never, createReportingService(db as never), storage).run({
      organizationId: actor.organizationId,
      reportRequestId: requested?.id ?? "",
    })
    await db
      .update(reportRequest)
      .set({ emailDeliveryStatus: "failed" })
      .where(eq(reportRequest.id, requested?.id ?? ""))
    await expect(failingService.retryDelivery(actor, requested?.id ?? "")).rejects.toThrow(
      "dispatch_unavailable",
    )
    expect(await failingService.status(actor, requested?.id ?? "")).toMatchObject({
      status: "ready",
      emailDeliveryStatus: "failed",
    })

    const acknowledgements = new Set<string>()
    const emailSender = {
      async send(input: { reportRequestId: string }) {
        acknowledgements.add(input.reportRequestId)
        return { deliveryReference: `ack-${input.reportRequestId}` }
      },
    }
    const deliveryWorker = createReportWorker(
      db as never,
      createReportingService(db as never),
      storage,
      emailSender,
    )
    const lostResponseDispatcher = {
      async dispatch() {
        return { runReference: "generation-run" }
      },
      async dispatchDelivery(payload: { organizationId: string; reportRequestId: string }) {
        await deliveryWorker.deliver(payload)
        throw new Error("response_lost")
      },
    }
    const recoveringService = createReportExportService(
      db as never,
      lostResponseDispatcher,
      storage,
    )
    await expect(recoveringService.retryDelivery(actor, requested?.id ?? "")).rejects.toThrow(
      "response_lost",
    )
    expect(await recoveringService.status(actor, requested?.id ?? "")).toMatchObject({
      status: "ready",
      emailDeliveryStatus: "sent",
    })
    expect(acknowledgements.size).toBe(1)
  })

  it("recovers a stale sending lease after provider success and database acknowledgement loss", async () => {
    const storage = createFakeArtifactStorage()
    const service = createReportExportService(db as never, createFakeReportDispatcher(), storage)
    const requested = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    await createReportWorker(db as never, createReportingService(db as never), storage).run({
      organizationId: actor.organizationId,
      reportRequestId: requested?.id ?? "",
    })
    const calls: string[] = []
    const acknowledgements = new Set<string>()
    const emailSender = {
      async send(input: { reportRequestId: string }) {
        calls.push(input.reportRequestId)
        acknowledgements.add(input.reportRequestId)
        return { deliveryReference: `ack-${input.reportRequestId}` }
      },
    }
    let rejectSentAcknowledgement = true
    const faultDb = new Proxy(db, {
      get(target, property, receiver) {
        if (property !== "update") return Reflect.get(target, property, receiver)
        return (table: unknown) => {
          const updateBuilder = target.update(table as never)
          return new Proxy(updateBuilder, {
            get(builder, builderProperty, builderReceiver) {
              if (builderProperty !== "set")
                return Reflect.get(builder, builderProperty, builderReceiver)
              return (values: Record<string, unknown>) => {
                const setBuilder = updateBuilder.set(values as never)
                if (values.emailDeliveryStatus !== "sent") return setBuilder
                return new Proxy(setBuilder, {
                  get(setTarget, setProperty, setReceiver) {
                    if (setProperty !== "where")
                      return Reflect.get(setTarget, setProperty, setReceiver)
                    return (...args: unknown[]) => {
                      if (rejectSentAcknowledgement) {
                        rejectSentAcknowledgement = false
                        throw new Error("database_ack_lost")
                      }
                      return (setTarget.where as (...whereArgs: unknown[]) => unknown)(...args)
                    }
                  },
                })
              }
            },
          })
        }
      },
    })
    const faultyWorker = createReportWorker(
      faultDb as never,
      createReportingService(db as never),
      storage,
      emailSender,
    )
    await expect(
      faultyWorker.deliver({
        organizationId: actor.organizationId,
        reportRequestId: requested?.id ?? "",
      }),
    ).rejects.toThrow("database_ack_lost")
    expect((await service.status(actor, requested?.id ?? ""))?.emailDeliveryStatus).toBe("sending")
    await db
      .update(reportRequest)
      .set({ emailDeliveryClaimedAt: new Date(Date.now() - 10 * 60 * 1000) })
      .where(eq(reportRequest.id, requested?.id ?? ""))
    await createReportWorker(
      db as never,
      createReportingService(db as never),
      storage,
      emailSender,
    ).deliver({ organizationId: actor.organizationId, reportRequestId: requested?.id ?? "" })
    expect((await service.status(actor, requested?.id ?? ""))?.emailDeliveryStatus).toBe("sent")
    expect(calls).toHaveLength(2)
    expect(acknowledgements.size).toBe(1)
  })

  it("terminates legacy null-email delivery and denies cross-tenant status and retry actions", async () => {
    const storage = createFakeArtifactStorage()
    let dispatches = 0
    const dispatcher = {
      async dispatch() {
        return { runReference: "generation-run" }
      },
      async dispatchDelivery() {
        dispatches += 1
        return { runReference: "delivery-run" }
      },
    }
    const service = createReportExportService(db as never, dispatcher, storage)
    const requested = await service.request(actor, {
      ...baseInput,
      idempotencyKey: crypto.randomUUID(),
    })
    await db
      .update(reportRequest)
      .set({ status: "ready", requesterEmail: null, emailDeliveryStatus: "pending" })
      .where(eq(reportRequest.id, requested?.id ?? ""))
    const worker = createReportWorker(db as never, createReportingService(db as never), storage)
    await worker.deliver({
      organizationId: actor.organizationId,
      reportRequestId: requested?.id ?? "",
    })
    expect(await service.status(actor, requested?.id ?? "")).toMatchObject({
      status: "ready",
      emailDeliveryStatus: "not_applicable",
    })
    expect(await service.status(otherActor, requested?.id ?? "")).toBeNull()
    expect(await service.retry(otherActor, requested?.id ?? "")).toBeNull()
    expect(await service.retryDelivery(otherActor, requested?.id ?? "")).toBeNull()
    expect(dispatches).toBe(0)
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
