import { createHash } from "node:crypto"
import { and, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import type { IdpDatabase } from "../../idp/database/client.js"
import { createId } from "../../shared/infra/ids.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import { reportAttempt, reportRequest } from "../database/schema.js"
import type { ArtifactStorage, ReportDispatcher } from "./export-providers.js"
import { reportFilterSchema } from "./reporting-service.js"

export function createReportExportService(
  db: IdpDatabase,
  dispatcher: ReportDispatcher,
  storage: ArtifactStorage,
) {
  async function request(actor: TenantContext, raw: unknown) {
    const input = z
      .object({
        format: z.enum(["pdf", "csv"]),
        filters: reportFilterSchema,
        timezone: z.string().min(1),
        idempotencyKey: z.string().uuid(),
      })
      .strict()
      .parse(raw)
    const [existing] = await db
      .select()
      .from(reportRequest)
      .where(
        and(
          eq(reportRequest.organizationId, actor.organizationId),
          eq(reportRequest.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1)
    if (existing) return existing
    const id = createId()
    await db.transaction(async (tx) => {
      await tx.insert(reportRequest).values({
        id,
        organizationId: actor.organizationId,
        requesterUserId: actor.actorUserId,
        format: input.format,
        filters: { ...input.filters, timezone: input.timezone },
        idempotencyKey: input.idempotencyKey,
      })
      await tx.insert(reportAttempt).values({
        id: createId(),
        organizationId: actor.organizationId,
        reportRequestId: id,
        attempt: 1,
      })
    })
    const key = createHash("sha256").update(id).digest("hex")
    const run = await dispatcher.dispatch(
      { schemaVersion: 1, organizationId: actor.organizationId, reportRequestId: id },
      key,
    )
    await db
      .update(reportRequest)
      .set({ providerRunReference: run.runReference, updatedAt: new Date() })
      .where(and(eq(reportRequest.organizationId, actor.organizationId), eq(reportRequest.id, id)))
    return status(actor, id)
  }
  async function status(actor: TenantContext, id: string) {
    const [row] = await db
      .select()
      .from(reportRequest)
      .where(and(eq(reportRequest.organizationId, actor.organizationId), eq(reportRequest.id, id)))
      .limit(1)
    return row ?? null
  }
  async function history(actor: TenantContext) {
    return db
      .select()
      .from(reportRequest)
      .where(eq(reportRequest.organizationId, actor.organizationId))
      .orderBy(desc(reportRequest.createdAt), desc(reportRequest.id))
      .limit(50)
  }
  async function retry(actor: TenantContext, id: string) {
    const current = await status(actor, id)
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
    const key = createHash("sha256").update(`${id}:${attempt}`).digest("hex")
    await dispatcher.dispatch(
      { schemaVersion: 1, organizationId: actor.organizationId, reportRequestId: id },
      key,
    )
    return status(actor, id)
  }
  async function download(actor: TenantContext, id: string) {
    const current = await status(actor, id)
    if (current?.status !== "ready") return null
    return storage.downloadUrl(
      `${actor.organizationId}/${id}/${current.activeAttempt}.${current.format}`,
      300,
    )
  }
  return { request, status, history, retry, download }
}
export type ReportExportService = ReturnType<typeof createReportExportService>
