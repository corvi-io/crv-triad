import { accessAudit } from "../../access/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import { createId } from "../../shared/infra/ids.js"
import type { CatalogKind } from "./catalog-service.js"

export type CatalogAuditInput = Readonly<{
  action: "archive" | "create" | "invite" | "resend" | "restore" | "revoke" | "update"
  actorUserId: string
  changedFields: readonly string[]
  entityId?: string
  entityType: CatalogKind
  organizationId: string
  requestId: string
  result: "failed" | "succeeded"
}>

export type CatalogAuditWriter = (input: CatalogAuditInput) => Promise<void>

export function createCatalogAuditWriter(db: IdpDatabase): CatalogAuditWriter {
  return async (input) => {
    await db.insert(accessAudit).values({
      action: `catalog.${input.entityType}.${input.action}`,
      actorUserId: input.actorUserId,
      changedFields: [...input.changedFields],
      entityType: input.entityType,
      id: createId(),
      organizationId: input.organizationId,
      outcome: input.result === "succeeded" ? "allowed" : "failed",
      requestId: input.requestId,
      targetId: input.entityId,
    })
  }
}
