import { Elysia, t } from "elysia"

import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { AccessDenialReason } from "../../access/domain/access-decision.js"
import { resolveRequestId } from "../../idp/http/middleware/request-context.js"
import type { AuthEmailSender } from "../../idp/identity/transactional-email.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { CatalogAuditWriter } from "../application/catalog-audit.js"
import type { CatalogKind, CatalogService } from "../application/catalog-service.js"
import { CatalogError } from "../application/catalog-service.js"

const versionBody = t.Object({ version: t.Integer({ minimum: 1 }) })

export function createCatalogRoutes(
  service: CatalogService,
  resolveContext: TenantContextResolver,
  authorizeAction: TenantActionAuthorizer,
  authEmailSender?: Pick<AuthEmailSender, "sendInvitation">,
  writeAudit?: CatalogAuditWriter,
) {
  const root = new Elysia({ name: "catalog-routes" })
  for (const [kind, path] of [
    ["unit", "units"],
    ["professional", "professionals"],
    ["service", "services"],
  ] as const) {
    root.use(
      createRoutesForKind(
        kind,
        path,
        service,
        resolveContext,
        authorizeAction,
        authEmailSender,
        writeAudit,
      ),
    )
  }
  return root
}

function createRoutesForKind(
  kind: CatalogKind,
  path: string,
  service: CatalogService,
  resolveContext: TenantContextResolver,
  authorizeAction: TenantActionAuthorizer,
  authEmailSender?: Pick<AuthEmailSender, "sendInvitation">,
  writeAudit?: CatalogAuditWriter,
) {
  async function authorize(headers: Headers, manage = false) {
    const decision = await resolveContext(headers)
    if (!decision.allowed) throw new CatalogAccessError(decision.reason)
    const access = await authorizeAction(
      decision.context,
      manage ? "catalogs.manage" : "catalogs.read",
    )
    if (!access.allowed) throw new CatalogAccessError(access.reason)
    return decision.context
  }

  const requestIds = new WeakMap<Request, string>()
  async function recordAudit(input: Parameters<CatalogAuditWriter>[0]) {
    try {
      await writeAudit?.(input)
    } catch {
      // The catalog transaction has its own outcome; never report a committed write as failed.
      console.error(
        JSON.stringify({
          event: "catalog_audit_failed",
          entityType: kind,
          action: input.action,
          requestId: input.requestId,
        }),
      )
    }
  }
  async function audited<T>(
    context: { actorUserId: string; organizationId: string },
    request: Request,
    action: "archive" | "create" | "invite" | "resend" | "restore" | "revoke" | "update",
    changedFields: readonly string[],
    entityId: string | undefined,
    operation: () => Promise<T>,
  ) {
    const requestId = requestIds.get(request) ?? "unavailable"
    try {
      const result = await operation()
      await recordAudit({
        action,
        actorUserId: context.actorUserId,
        changedFields,
        entityId: entityId ?? entityIdFrom(result),
        entityType: kind,
        organizationId: context.organizationId,
        requestId,
        result: "succeeded",
      })
      return result
    } catch (error) {
      await recordAudit({
        action,
        actorUserId: context.actorUserId,
        changedFields,
        entityId,
        entityType: kind,
        organizationId: context.organizationId,
        requestId,
        result: "failed",
      })
      throw error
    }
  }

  return new Elysia({ name: `catalog-${path}-routes`, prefix: `/api/${path}` })
    .onRequest(({ request, set }) => {
      const requestId =
        typeof set.headers["x-request-id"] === "string"
          ? set.headers["x-request-id"]
          : resolveRequestId(request.headers, () => crypto.randomUUID())
      requestIds.set(request, requestId)
      set.headers["x-request-id"] = requestId
    })
    .onError(({ code, error, request, set }) => {
      const requestId = requestIds.get(request) ?? "unavailable"
      if (error instanceof CatalogAccessError) {
        set.status = error.reason === "unauthenticated" ? 401 : 403
        return { code: error.reason, requestId }
      }
      if (error instanceof InvitationDeliveryError) {
        set.status = 503
        return { code: "invitation_delivery_failed", requestId }
      }
      if (error instanceof CatalogError) {
        set.status =
          error.code === "not_found" ? 404 : error.code === "version_conflict" ? 409 : 400
        return { code: error.code, ...(error.details ? { details: error.details } : {}), requestId }
      }
      if (code === "VALIDATION") {
        set.status = 400
        return { code: "invalid_request", requestId }
      }
      set.status = 500
      return { code: "internal_error", requestId }
    })
    .get(
      "/",
      async ({ query, request }) => {
        const context = await authorize(request.headers)
        return service.list(context.organizationId, kind, query)
      },
      { query: t.Record(t.String(), t.Optional(t.String())) },
    )
    .post(
      "/invite",
      async ({ body, request, status }) => {
        if (kind !== "professional") throw new CatalogError("not_found")
        const context = await authorize(request.headers, true)
        const result = await audited(
          context,
          request,
          "invite",
          ["commissionBasisPoints", "role", "serviceIds", "specialties", "unitIds"],
          undefined,
          async () => {
            const issued = await service.inviteProfessional(
              context.organizationId,
              context.actorUserId,
              body,
            )
            const emailDelivery =
              (await authEmailSender?.sendInvitation({
                email: issued.email,
                expiresAt: issued.expiresAt,
                role: "member",
                token: issued.token,
              })) ?? "skipped"
            if (emailDelivery !== "sent") {
              await service.revokeUndeliveredProfessionalInvitation(
                context.organizationId,
                issued.identityInvitationId,
                issued.email,
              )
              throw new InvitationDeliveryError()
            }
            return { emailDelivery, status: "pending" as const }
          },
        )
        return status(201, result)
      },
      { body: t.Record(t.String(), t.Any()) },
    )
    .get(
      "/options",
      async ({ query, request }) => {
        const context = await authorize(request.headers)
        return service.options(context.organizationId, kind, query)
      },
      { query: t.Record(t.String(), t.Optional(t.String())) },
    )
    .get("/invitations", async ({ request }) => {
      if (kind !== "professional") throw new CatalogError("not_found")
      const context = await authorize(request.headers, true)
      return service.listPendingProfessionalInvitations(context.organizationId)
    })
    .post("/invitations/:invitationId/resend", async ({ params, request }) => {
      if (kind !== "professional") throw new CatalogError("not_found")
      const context = await authorize(request.headers, true)
      return audited(context, request, "resend", [], params.invitationId, async () => {
        const issued = await service.resendProfessionalInvitation(
          context.organizationId,
          params.invitationId,
        )
        const emailDelivery =
          (await authEmailSender?.sendInvitation({
            email: issued.email,
            expiresAt: issued.expiresAt,
            role: "member",
            token: issued.token,
          })) ?? "skipped"
        if (emailDelivery !== "sent") throw new InvitationDeliveryError()
        return { emailDelivery, status: "pending" as const }
      })
    })
    .post("/invitations/:invitationId/revoke", async ({ params, request }) => {
      if (kind !== "professional") throw new CatalogError("not_found")
      const context = await authorize(request.headers, true)
      return audited(context, request, "revoke", ["status"], params.invitationId, () =>
        service.revokeProfessionalInvitation(context.organizationId, params.invitationId),
      )
    })
    .post(
      "/",
      async ({ body, request, status }) => {
        const context = await authorize(request.headers, true)
        return status(
          201,
          await audited(context, request, "create", changedFieldsFor(kind), undefined, () =>
            service.create(context.organizationId, kind, body),
          ),
        )
      },
      { body: t.Record(t.String(), t.Any()) },
    )
    .get("/:id", async ({ params, request }) => {
      const context = await authorize(request.headers)
      return service.get(context.organizationId, kind, params.id)
    })
    .patch(
      "/:id",
      async ({ body, params, request }) => {
        const context = await authorize(request.headers, true)
        const { version, ...input } = body
        return audited(context, request, "update", changedFieldsFor(kind), params.id, () =>
          service.update(context.organizationId, kind, params.id, version, input),
        )
      },
      { body: t.Object({ version: t.Integer({ minimum: 1 }) }, { additionalProperties: true }) },
    )
    .post(
      "/:id/archive",
      async ({ body, params, request }) => {
        const context = await authorize(request.headers, true)
        return audited(context, request, "archive", ["status"], params.id, () =>
          service.setArchived(context.organizationId, kind, params.id, true, body.version),
        )
      },
      { body: versionBody },
    )
    .post(
      "/:id/restore",
      async ({ body, params, request }) => {
        const context = await authorize(request.headers, true)
        return audited(context, request, "restore", ["status"], params.id, () =>
          service.setArchived(context.organizationId, kind, params.id, false, body.version),
        )
      },
      { body: versionBody },
    )
}

class InvitationDeliveryError extends Error {}

class CatalogAccessError extends Error {
  constructor(readonly reason: AccessDenialReason) {
    super("Catalog access denied.")
  }
}

function entityIdFrom(value: unknown) {
  if (typeof value !== "object" || value === null || !("id" in value)) return undefined
  return typeof value.id === "string" ? value.id : undefined
}

function changedFieldsFor(kind: CatalogKind) {
  if (kind === "unit") return ["address", "businessHours", "code", "name"] as const
  if (kind === "professional")
    return ["commissionBasisPoints", "role", "serviceIds", "specialties", "unitIds"] as const
  return [
    "category",
    "description",
    "durationMinutes",
    "name",
    "priceCents",
    "professionalIds",
    "unitIds",
  ] as const
}
