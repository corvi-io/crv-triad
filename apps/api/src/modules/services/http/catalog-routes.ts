import { Elysia, t } from "elysia"

import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { AccessDenialReason } from "../../access/domain/access-decision.js"
import type { AuthEmailSender } from "../../idp/identity/transactional-email.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { CatalogKind, CatalogService } from "../application/catalog-service.js"
import { CatalogError } from "../application/catalog-service.js"

const versionBody = t.Object({ version: t.Integer({ minimum: 1 }) })

export function createCatalogRoutes(
  service: CatalogService,
  resolveContext: TenantContextResolver,
  authorizeAction: TenantActionAuthorizer,
  authEmailSender?: Pick<AuthEmailSender, "sendInvitation">,
) {
  const root = new Elysia({ name: "catalog-routes" })
  for (const [kind, path] of [
    ["unit", "units"],
    ["professional", "professionals"],
    ["service", "services"],
  ] as const) {
    root.use(
      createRoutesForKind(kind, path, service, resolveContext, authorizeAction, authEmailSender),
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

  return new Elysia({ name: `catalog-${path}-routes`, prefix: `/api/${path}` })
    .onError(({ code, error, request, set }) => {
      const requestId = request.headers.get("x-request-id") ?? "unavailable"
      if (error instanceof CatalogAccessError) {
        set.status = error.reason === "unauthenticated" ? 401 : 403
        return { code: error.reason, requestId }
      }
      if (error instanceof CatalogError) {
        set.status =
          error.code === "not_found" ? 404 : error.code === "version_conflict" ? 409 : 400
        return { code: error.code, requestId }
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
        return status(201, { emailDelivery, status: "pending" as const })
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
    .post(
      "/",
      async ({ body, request, status }) => {
        const context = await authorize(request.headers, true)
        return status(201, await service.create(context.organizationId, kind, body))
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
        return service.update(context.organizationId, kind, params.id, version, input)
      },
      { body: t.Object({ version: t.Integer({ minimum: 1 }) }, { additionalProperties: true }) },
    )
    .post(
      "/:id/archive",
      async ({ body, params, request }) => {
        const context = await authorize(request.headers, true)
        return service.setArchived(context.organizationId, kind, params.id, true, body.version)
      },
      { body: versionBody },
    )
    .post(
      "/:id/restore",
      async ({ body, params, request }) => {
        const context = await authorize(request.headers, true)
        return service.setArchived(context.organizationId, kind, params.id, false, body.version)
      },
      { body: versionBody },
    )
}

class CatalogAccessError extends Error {
  constructor(readonly reason: AccessDenialReason) {
    super("Catalog access denied.")
  }
}
