import { and, eq, lt, sql } from "drizzle-orm"
import type { IdpDatabase } from "../../idp/database/client.js"
import { createId } from "../../shared/infra/ids.js"
import { reportArtifact, reportAttempt, reportRequest } from "../database/schema.js"
import type { ArtifactStorage, ReportEmailSender } from "./export-providers.js"
import { type ReportType, reportCatalogItem } from "./report-catalog.js"
import { renderReportCsv, renderReportPdf } from "./report-renderer.js"
import type { ReportingService } from "./reporting-service.js"

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const DELIVERY_CLAIM_TIMEOUT_MS = 5 * 60 * 1000

export function createReportWorker(
  db: IdpDatabase,
  reporting: ReportingService,
  storage: ArtifactStorage,
  emailSender?: ReportEmailSender,
  studioUrl = "http://localhost:3000",
  observe: (event: Record<string, unknown>) => void = () => undefined,
) {
  async function deliverReadyEmail(request: typeof reportRequest.$inferSelect) {
    if (request.emailDeliveryStatus === "not_applicable") return
    if (!request.requesterEmail) {
      await db
        .update(reportRequest)
        .set({
          emailDeliveryStatus: "not_applicable",
          emailDeliveryFailureCode: null,
          emailDeliveryClaimedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reportRequest.organizationId, request.organizationId),
            eq(reportRequest.id, request.id),
            sql`${reportRequest.emailDeliveryStatus} <> 'sent'`,
          ),
        )
      return
    }
    if (!emailSender) return
    const staleClaim = new Date(Date.now() - DELIVERY_CLAIM_TIMEOUT_MS)
    const claimed = await db
      .update(reportRequest)
      .set({
        emailDeliveryStatus: "sending",
        emailDeliveryFailureCode: null,
        emailDeliveryClaimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reportRequest.organizationId, request.organizationId),
          eq(reportRequest.id, request.id),
          eq(reportRequest.status, "ready"),
          sql`(${reportRequest.emailDeliveryStatus} in ('pending', 'failed') or (${reportRequest.emailDeliveryStatus} = 'sending' and ${reportRequest.emailDeliveryClaimedAt} < ${staleClaim}))`,
        ),
      )
      .returning({ id: reportRequest.id })
    if (claimed.length !== 1) return
    const authenticatedReportUrl = new URL("/reports", studioUrl)
    authenticatedReportUrl.searchParams.set("reportId", request.id)
    try {
      await emailSender.send({
        recipient: request.requesterEmail,
        reportRequestId: request.id,
        reportTitle: reportCatalogItem(request.reportType).title,
        authenticatedReportUrl: authenticatedReportUrl.toString(),
      })
    } catch {
      await db
        .update(reportRequest)
        .set({
          emailDeliveryStatus: "failed",
          emailDeliveryFailureCode: "delivery_failed",
          emailDeliveryClaimedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reportRequest.organizationId, request.organizationId),
            eq(reportRequest.id, request.id),
            eq(reportRequest.emailDeliveryStatus, "sending"),
          ),
        )
      observe({
        event: "report_email_failed",
        reportRequestId: request.id,
        safeFailureCode: "delivery_failed",
      })
      throw new Error("report_email_delivery_failed")
    }
    // Keep `sending` as a recoverable lease if the provider acknowledged the email but
    // the database acknowledgement is lost. A later worker run reuses the provider's
    // report-request idempotency key after the claim timeout.
    await db
      .update(reportRequest)
      .set({
        emailDeliveryStatus: "sent",
        emailDeliveredAt: new Date(),
        emailDeliveryClaimedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reportRequest.organizationId, request.organizationId),
          eq(reportRequest.id, request.id),
          eq(reportRequest.emailDeliveryStatus, "sending"),
        ),
      )
    observe({ event: "report_email_delivered", reportRequestId: request.id })
  }

  async function run(payload: { organizationId: string; reportRequestId: string }) {
    const [request] = await db
      .select()
      .from(reportRequest)
      .where(
        and(
          eq(reportRequest.organizationId, payload.organizationId),
          eq(reportRequest.id, payload.reportRequestId),
        ),
      )
      .limit(1)
    if (!request) return { outcome: "missing" as const }
    if (request.status === "ready") {
      await deliverReadyEmail(request)
      return { outcome: "ready" as const }
    }
    if (!["queued", "running"].includes(request.status)) return { outcome: "ignored" as const }
    const attempt = request.activeAttempt
    observe({ event: "report_export_started", reportRequestId: request.id, attempt })
    let artifactUploaded = false
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`report-worker:${payload.organizationId}`}, 0))`,
      )
      const competing = await tx.execute<{ id: string }>(
        sql`select id from report_requests where organization_id = ${payload.organizationId} and status = 'running' and id <> ${request.id} limit 1`,
      )
      if (competing.rows.length > 0) throw new Error("tenant_report_concurrency_busy")
      await tx
        .update(reportRequest)
        .set({
          status: "running",
          startedAt: request.startedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reportRequest.organizationId, payload.organizationId),
            eq(reportRequest.id, request.id),
            eq(reportRequest.activeAttempt, attempt),
            sql`${reportRequest.status} in ('queued', 'running')`,
          ),
        )
      await tx
        .update(reportAttempt)
        .set({ status: "running", startedAt: new Date() })
        .where(
          and(
            eq(reportAttempt.organizationId, payload.organizationId),
            eq(reportAttempt.reportRequestId, request.id),
            eq(reportAttempt.attempt, attempt),
          ),
        )
    })
    try {
      const filters = request.filters
      const rows = await reporting.report(
        { organizationId: payload.organizationId, actorUserId: request.requesterUserId } as never,
        request.reportType,
        filters,
        request.configSnapshot ?? legacyConfig(request.reportType, filters),
      )
      const document = {
        title: reportCatalogItem(request.reportType).title,
        period: `${filters.from} a ${filters.to} (${filters.timezone})`,
        rows,
      }
      const body = request.format === "pdf" ? renderReportPdf(document) : renderReportCsv(document)
      const contentType =
        request.format === "pdf" ? ("application/pdf" as const) : ("text/csv" as const)
      const objectKey = `${payload.organizationId}/${request.id}/${attempt}.${request.format}`
      const uploaded = await storage.put(objectKey, body, contentType)
      artifactUploaded = true
      const confirmed = await storage.head(objectKey)
      if (
        !confirmed ||
        confirmed.checksum !== uploaded.checksum ||
        confirmed.byteSize !== uploaded.byteSize
      )
        throw new Error("artifact_verification_failed")
      const expiresAt = new Date(request.createdAt.getTime() + RETENTION_MS)
      await db.transaction(async (tx) => {
        await tx
          .insert(reportArtifact)
          .values({
            id: createId(),
            organizationId: payload.organizationId,
            reportRequestId: request.id,
            attempt,
            objectKey,
            contentType,
            byteSize: confirmed.byteSize,
            checksum: confirmed.checksum,
            expiresAt,
          })
          .onConflictDoNothing()
        const won = await tx
          .update(reportRequest)
          .set({
            status: "ready",
            safeFailureCode: null,
            completedAt: new Date(),
            updatedAt: new Date(),
            version: sql`${reportRequest.version} + 1`,
          })
          .where(
            and(
              eq(reportRequest.organizationId, payload.organizationId),
              eq(reportRequest.id, request.id),
              eq(reportRequest.activeAttempt, attempt),
              sql`${reportRequest.status} in ('queued', 'running')`,
            ),
          )
          .returning({ id: reportRequest.id })
        if (won.length !== 1) throw new Error("report_attempt_superseded")
        await tx
          .update(reportAttempt)
          .set({ status: "ready", completedAt: new Date(), safeFailureCode: null })
          .where(
            and(
              eq(reportAttempt.organizationId, payload.organizationId),
              eq(reportAttempt.reportRequestId, request.id),
              eq(reportAttempt.attempt, attempt),
            ),
          )
      })
      observe({ event: "report_export_ready", reportRequestId: request.id, attempt })
      await deliverReadyEmail({
        ...request,
        status: "ready",
        emailDeliveryStatus: request.emailDeliveryStatus,
      })
      return { outcome: "ready" as const, objectKey }
    } catch (error) {
      // A task retry must converge on an object that was uploaded before a database outage.
      // Keeping the attempt running preserves the same deterministic object key.
      if (artifactUploaded) throw error
      const safeFailureCode =
        error instanceof Error && error.message === "report_attempt_superseded"
          ? "attempt_superseded"
          : "generation_failed"
      await db.transaction(async (tx) => {
        await tx
          .update(reportRequest)
          .set({
            status: "failed",
            safeFailureCode,
            completedAt: new Date(),
            updatedAt: new Date(),
            version: sql`${reportRequest.version} + 1`,
          })
          .where(
            and(
              eq(reportRequest.organizationId, payload.organizationId),
              eq(reportRequest.id, request.id),
              eq(reportRequest.activeAttempt, attempt),
              eq(reportRequest.status, "running"),
            ),
          )
        await tx
          .update(reportAttempt)
          .set({ status: "failed", safeFailureCode, completedAt: new Date() })
          .where(
            and(
              eq(reportAttempt.organizationId, payload.organizationId),
              eq(reportAttempt.reportRequestId, request.id),
              eq(reportAttempt.attempt, attempt),
              eq(reportAttempt.status, "running"),
            ),
          )
      })
      observe({
        event: "report_export_failed",
        reportRequestId: request.id,
        attempt,
        safeFailureCode,
      })
      throw error
    }
  }

  async function deliver(payload: { organizationId: string; reportRequestId: string }) {
    const [request] = await db
      .select()
      .from(reportRequest)
      .where(
        and(
          eq(reportRequest.organizationId, payload.organizationId),
          eq(reportRequest.id, payload.reportRequestId),
        ),
      )
      .limit(1)
    if (request?.status !== "ready") return { outcome: "ignored" as const }
    if (["sent", "not_applicable"].includes(request.emailDeliveryStatus))
      return { outcome: "sent" as const }
    await deliverReadyEmail(request)
    return { outcome: "sent" as const }
  }

  async function expire(now = new Date()) {
    const artifacts = await db
      .select()
      .from(reportArtifact)
      .where(and(lt(reportArtifact.expiresAt, now), sql`${reportArtifact.deletedAt} is null`))
    for (const artifact of artifacts) {
      await storage.delete(artifact.objectKey)
      await db.transaction(async (tx) => {
        await tx
          .update(reportArtifact)
          .set({ deletedAt: now })
          .where(eq(reportArtifact.id, artifact.id))
        await tx
          .update(reportRequest)
          .set({ status: "expired", updatedAt: now, version: sql`${reportRequest.version} + 1` })
          .where(
            and(
              eq(reportRequest.organizationId, artifact.organizationId),
              eq(reportRequest.id, artifact.reportRequestId),
              eq(reportRequest.status, "ready"),
            ),
          )
      })
      observe({
        event: "report_export_expired",
        reportRequestId: artifact.reportRequestId,
        attempt: artifact.attempt,
      })
    }
    return artifacts.length
  }
  return { run, deliver, expire }
}

function legacyConfig(type: ReportType, filters: typeof reportRequest.$inferSelect.filters) {
  const { timezone, ...reportFilters } = filters
  const defaults: Record<ReportType, Record<string, unknown>> = {
    sales_revenue: { includeReversals: true },
    professional_performance: { ranking: "revenue" },
    commissions: { includeReversals: true },
    new_returning_customers: { customerDefinition: "first_completed_receipt_in_tenant" },
    cancellations_no_shows: { includeCancelled: true, includeNoShows: true },
    cash_payments: { includeReversals: true },
  }
  return { reportType: type, filters: reportFilters, timezone, ...defaults[type] } as never
}

export type ReportWorker = ReturnType<typeof createReportWorker>
