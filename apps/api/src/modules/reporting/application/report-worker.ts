import { and, eq, lt, sql } from "drizzle-orm"
import type { IdpDatabase } from "../../idp/database/client.js"
import { createId } from "../../shared/infra/ids.js"
import { reportArtifact, reportAttempt, reportRequest } from "../database/schema.js"
import type { ArtifactStorage } from "./export-providers.js"
import { renderReportCsv, renderReportPdf } from "./report-renderer.js"
import type { ReportingService } from "./reporting-service.js"

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export function createReportWorker(
  db: IdpDatabase,
  reporting: ReportingService,
  storage: ArtifactStorage,
) {
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
    if (request.status === "ready") return { outcome: "ready" as const }
    if (!["queued", "running"].includes(request.status)) return { outcome: "ignored" as const }
    const attempt = request.activeAttempt
    let artifactUploaded = false
    await db.transaction(async (tx) => {
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
      const aggregate = await reporting.summary(
        { organizationId: payload.organizationId, actorUserId: request.requesterUserId } as never,
        filters,
      )
      const rows: Array<[string, string]> = [
        ["Atendimentos", String(aggregate.summary.receiptCount)],
        ["Itens realizados", String(aggregate.summary.performedItems)],
        ["Receita líquida", String(aggregate.summary.netRevenueCents)],
        ["Comissões", String(aggregate.summary.commissionCents)],
        ["Parte da barbearia", String(aggregate.summary.barbershopShareCents)],
        ["Estornos", String(aggregate.summary.reversalCount)],
      ]
      const document = {
        title: "Relatório gerencial",
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
      throw error
    }
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
    }
    return artifacts.length
  }
  return { run, expire }
}

export type ReportWorker = ReturnType<typeof createReportWorker>
