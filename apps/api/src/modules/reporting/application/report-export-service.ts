import { createHash } from "node:crypto"
import { and, desc, eq, sql } from "drizzle-orm"
import type { IdpDatabase } from "../../idp/database/client.js"
import { user } from "../../idp/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import { reportAttempt, reportRequest } from "../database/schema.js"
import type { ArtifactStorage, ReportDispatcher } from "./export-providers.js"
import { createReportRequestSchema } from "./report-catalog.js"

export function createReportExportService(
  db: IdpDatabase,
  dispatcher: ReportDispatcher,
  storage: ArtifactStorage,
  observe: (event: Record<string, unknown>) => void = () => undefined,
) {
  async function dispatch(id: string, organizationId: string, attempt: number) {
    const key = createHash("sha256").update(`${id}:${attempt}`).digest("hex")
    const run = await dispatcher.dispatch(
      { schemaVersion: 1, organizationId, reportRequestId: id },
      key,
    )
    observe({ event: "report_export_dispatched", reportRequestId: id, attempt })
    await db.transaction(async (tx) => {
      await tx
        .update(reportRequest)
        .set({ providerRunReference: run.runReference, updatedAt: new Date() })
        .where(
          and(
            eq(reportRequest.organizationId, organizationId),
            eq(reportRequest.id, id),
            eq(reportRequest.activeAttempt, attempt),
          ),
        )
      await tx
        .update(reportAttempt)
        .set({ providerRunReference: run.runReference })
        .where(
          and(
            eq(reportAttempt.organizationId, organizationId),
            eq(reportAttempt.reportRequestId, id),
            eq(reportAttempt.attempt, attempt),
          ),
        )
    })
  }
  async function request(actor: TenantContext, raw: unknown) {
    const input = createReportRequestSchema.parse(raw)
    const existing = await findByIdempotencyKey(actor.organizationId, input.idempotencyKey)
    if (existing) {
      assertSameIdempotentRequest(existing, input)
      if (existing.status === "queued" && !existing.providerRunReference)
        await dispatch(existing.id, actor.organizationId, existing.activeAttempt)
      return status(actor, existing.id)
    }
    const id = createId()
    const created = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`report:${actor.organizationId}`}, 0))`,
      )
      const [concurrent] = await tx
        .select()
        .from(reportRequest)
        .where(
          and(
            eq(reportRequest.organizationId, actor.organizationId),
            eq(reportRequest.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1)
      if (concurrent) return concurrent
      const [requester] = await tx
        .select({ email: user.email, emailVerified: user.emailVerified, status: user.status })
        .from(user)
        .where(eq(user.id, actor.actorUserId))
        .limit(1)
      if (requester?.status !== "active" || requester.emailVerified !== true)
        throw new Error("requester_email_unverified")
      await tx.insert(reportRequest).values({
        id,
        organizationId: actor.organizationId,
        requesterUserId: actor.actorUserId,
        format: input.format,
        reportType: input.reportType,
        configSnapshot: input.configSnapshot,
        filters: { ...input.filters, timezone: input.timezone },
        requesterEmail: requester.email,
        requesterEmailVerifiedAt: new Date(),
        idempotencyKey: input.idempotencyKey,
      })
      await tx.insert(reportAttempt).values({
        id: createId(),
        organizationId: actor.organizationId,
        reportRequestId: id,
        attempt: 1,
      })
      return null
    })
    if (created) {
      assertSameIdempotentRequest(created, input)
      if (created.status === "queued" && !created.providerRunReference)
        await dispatch(created.id, actor.organizationId, created.activeAttempt)
      return status(actor, created.id)
    }
    await dispatch(id, actor.organizationId, 1)
    observe({ event: "report_export_requested", reportRequestId: id, attempt: 1 })
    return status(actor, id)
  }
  async function findByIdempotencyKey(organizationId: string, idempotencyKey: string) {
    const [row] = await db
      .select()
      .from(reportRequest)
      .where(
        and(
          eq(reportRequest.organizationId, organizationId),
          eq(reportRequest.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1)
    return row
  }
  async function status(actor: TenantContext, id: string) {
    const row = await statusRow(actor, id)
    return row ? publicReportRequest(row) : null
  }
  async function statusRow(actor: TenantContext, id: string) {
    const [row] = await db
      .select()
      .from(reportRequest)
      .where(and(eq(reportRequest.organizationId, actor.organizationId), eq(reportRequest.id, id)))
      .limit(1)
    return row ?? null
  }
  async function history(actor: TenantContext) {
    const rows = await db
      .select()
      .from(reportRequest)
      .where(eq(reportRequest.organizationId, actor.organizationId))
      .orderBy(desc(reportRequest.createdAt), desc(reportRequest.id))
      .limit(50)
    return rows.map(publicReportRequest)
  }
  async function retry(actor: TenantContext, id: string) {
    const current = await statusRow(actor, id)
    if (!current || !["failed", "expired"].includes(current.status)) return current
    const attempt = current.activeAttempt + 1
    const won = await db.transaction(async (tx) => {
      const updated = await tx
        .update(reportRequest)
        .set({
          status: "queued",
          activeAttempt: attempt,
          safeFailureCode: null,
          version: sql`${reportRequest.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reportRequest.organizationId, actor.organizationId),
            eq(reportRequest.id, id),
            eq(reportRequest.version, current.version),
            eq(reportRequest.status, current.status),
          ),
        )
        .returning({ id: reportRequest.id })
      if (updated.length !== 1) return false
      await tx.insert(reportAttempt).values({
        id: createId(),
        organizationId: actor.organizationId,
        reportRequestId: id,
        attempt,
      })
      return true
    })
    if (!won) return status(actor, id)
    await dispatch(id, actor.organizationId, attempt)
    observe({ event: "report_export_retried", reportRequestId: id, attempt })
    return status(actor, id)
  }
  async function download(actor: TenantContext, id: string) {
    const current = await statusRow(actor, id)
    if (current?.status !== "ready") return null
    observe({ event: "report_export_download_granted", reportRequestId: id })
    return storage.downloadUrl(
      `${actor.organizationId}/${id}/${current.activeAttempt}.${current.format}`,
      300,
    )
  }
  async function readLocalArtifact(key: string) {
    return storage.read?.(key) ?? null
  }
  return { request, status, history, retry, download, readLocalArtifact }
}
export type ReportExportService = ReturnType<typeof createReportExportService>

function assertSameIdempotentRequest(
  existing: typeof reportRequest.$inferSelect,
  input: ReturnType<typeof createReportRequestSchema.parse>,
) {
  const { timezone, ...legacyFilters } = existing.filters
  const existingSnapshot =
    existing.configSnapshot ??
    createReportRequestSchema.parse({
      format: existing.format,
      filters: legacyFilters,
      timezone,
      idempotencyKey: existing.idempotencyKey,
      reportType: existing.reportType,
    }).configSnapshot
  if (
    existing.format !== input.format ||
    existing.reportType !== input.reportType ||
    canonicalJson(existingSnapshot) !== canonicalJson(input.configSnapshot)
  )
    throw new Error("idempotency_conflict")
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`
  return JSON.stringify(value)
}

function publicReportRequest(row: typeof reportRequest.$inferSelect) {
  const { requesterEmail: _email, requesterEmailVerifiedAt: _verifiedAt, ...safe } = row
  return safe
}
