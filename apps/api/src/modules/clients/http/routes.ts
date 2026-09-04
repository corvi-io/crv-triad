import { Elysia, t } from "elysia"

import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { AccessDenialReason, Capability } from "../../access/domain/access-decision.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import type { ClientService } from "../application/client-service.js"
import {
  ClientNotFoundError,
  ClientQuotaReachedError,
  ClientValidationError,
  ClientVersionConflictError,
} from "../domain/errors.js"

const profileBody = t.Object({
  email: t.Optional(t.String({ maxLength: 254 })),
  name: t.String({ maxLength: 160 }),
  phone: t.Optional(t.String({ maxLength: 40 })),
  preferenceNote: t.Optional(t.String({ maxLength: 1_000 })),
  servicePreferences: t.Optional(t.Array(t.String({ maxLength: 100 }), { maxItems: 20 })),
  tags: t.Optional(t.Array(t.String({ maxLength: 60 }), { maxItems: 20 })),
})
const versionBody = t.Object({ version: t.Integer({ minimum: 1 }) })
const profileUpdateBody = t.Object({
  ...profileBody.properties,
  ...versionBody.properties,
})
const noteBody = t.Object({ body: t.String({ maxLength: 2_000, minLength: 1 }) })
const noteUpdateBody = t.Object({
  body: t.String({ maxLength: 2_000, minLength: 1 }),
  version: t.Integer({ minimum: 1 }),
})

export function createClientRoutes(
  service: ClientService,
  resolveContext: TenantContextResolver,
  authorizeAction?: TenantActionAuthorizer,
) {
  const app = new Elysia({ name: "client-routes", prefix: "/api/clients" }).onError(
    ({ code, error, request, set }) => {
      const requestId = request.headers.get("x-request-id") ?? "unavailable"
      if (error instanceof ClientAccessError) {
        set.status =
          error.reason === "unauthenticated" ? 401 : error.reason === "quota_reached" ? 409 : 403
        return {
          code: error.reason,
          ...(error.quota ? { details: error.quota } : {}),
          requestId,
        }
      }
      if (error instanceof ClientValidationError || code === "VALIDATION") {
        set.status = 400
        return { code: "invalid_request", requestId }
      }
      if (error instanceof ClientNotFoundError) {
        set.status = 404
        return { code: error.code, requestId }
      }
      if (error instanceof ClientVersionConflictError) {
        set.status = 409
        return { code: error.code, requestId }
      }
      if (error instanceof ClientQuotaReachedError) {
        set.status = 409
        return {
          code: error.code,
          details: { limit: error.limit, usage: error.limit },
          requestId,
        }
      }
      set.status = 500
      return { code: "internal_error", requestId }
    },
  )

  async function authorize(
    headers: Headers,
    capability: Capability,
    options?: { consumeClientCapacity?: boolean },
  ): Promise<{ activeClientLimit?: number; context: TenantContext }> {
    const decision = await resolveContext(headers)
    if (!decision.allowed) throw new ClientAccessError(decision.reason)
    if (!authorizeAction) return { context: decision.context }
    const access = await authorizeAction(decision.context, capability, options)
    if (!access.allowed) throw new ClientAccessError(access.reason, access.quota)
    return { activeClientLimit: access.activeClientLimit, context: decision.context }
  }

  return app
    .get(
      "/",
      async ({ query, request }) => {
        const { context } = await authorize(request.headers, "clients.read")
        return presentPage(await service.list(context.organizationId, query))
      },
      { query: t.Record(t.String(), t.String()) },
    )
    .post(
      "/",
      async ({ body, request, status }) => {
        const { activeClientLimit, context } = await authorize(request.headers, "clients.manage", {
          consumeClientCapacity: true,
        })
        return status(
          201,
          presentDetail(await service.create(context.organizationId, body, activeClientLimit)),
        )
      },
      { body: profileBody },
    )
    .post(
      "/duplicates",
      async ({ body, request }) => {
        const { context } = await authorize(request.headers, "clients.read")
        return service.findDuplicates(context.organizationId, body)
      },
      {
        body: t.Object({
          email: t.Optional(t.String({ maxLength: 254 })),
          excludingId: t.Optional(t.String({ maxLength: 128 })),
          phone: t.Optional(t.String({ maxLength: 40 })),
        }),
      },
    )
    .get("/tags", async ({ request }) => {
      const { context } = await authorize(request.headers, "clients.read")
      return service.listTags(context.organizationId)
    })
    .get("/:clientId", async ({ params, request }) => {
      const { context } = await authorize(request.headers, "clients.read")
      return presentDetail(await service.get(context.organizationId, params.clientId))
    })
    .patch(
      "/:clientId",
      async ({ body, params, request }) => {
        const { context } = await authorize(request.headers, "clients.manage")
        const { version, ...profile } = body
        return presentDetail(
          await service.update(context.organizationId, params.clientId, version, profile),
        )
      },
      { body: profileUpdateBody },
    )
    .post(
      "/:clientId/archive",
      async ({ body, params, request }) => {
        const { context } = await authorize(request.headers, "clients.manage")
        return presentDetail(
          await service.setArchived(context.organizationId, params.clientId, true, body.version),
        )
      },
      { body: versionBody },
    )
    .post(
      "/:clientId/restore",
      async ({ body, params, request }) => {
        const { activeClientLimit, context } = await authorize(request.headers, "clients.manage", {
          consumeClientCapacity: true,
        })
        return presentDetail(
          await service.setArchived(
            context.organizationId,
            params.clientId,
            false,
            body.version,
            activeClientLimit,
          ),
        )
      },
      { body: versionBody },
    )
    .post(
      "/:clientId/notes",
      async ({ body, params, request, status }) => {
        const { context } = await authorize(request.headers, "clients.manage")
        return status(
          201,
          presentDetail(await service.addNote(context.organizationId, params.clientId, body)),
        )
      },
      { body: noteBody },
    )
    .patch(
      "/:clientId/notes/:noteId",
      async ({ body, params, request }) => {
        const { context } = await authorize(request.headers, "clients.manage")
        return presentDetail(
          await service.updateNote(
            context.organizationId,
            params.clientId,
            params.noteId,
            body.version,
            body,
          ),
        )
      },
      { body: noteUpdateBody },
    )
    .delete(
      "/:clientId/notes/:noteId",
      async ({ body, params, request }) => {
        const { context } = await authorize(request.headers, "clients.manage")
        return presentDetail(
          await service.removeNote(
            context.organizationId,
            params.clientId,
            params.noteId,
            body.version,
          ),
        )
      },
      { body: versionBody },
    )
}

class ClientAccessError extends Error {
  constructor(
    readonly reason: AccessDenialReason,
    readonly quota?: Readonly<{ limit: number; usage: number }>,
  ) {
    super("Client access denied.")
  }
}

function presentDetail<T extends { createdAt: Date; updatedAt: Date; notes: readonly unknown[] }>(
  record: T,
) {
  return {
    ...record,
    appointments: [],
    createdAt: record.createdAt.toISOString(),
    lastVisitAt: null,
    nextAppointmentAt: null,
    notes: record.notes.map((note) => {
      const value = note as { createdAt: Date; updatedAt: Date }
      return {
        ...value,
        createdAt: value.createdAt.toISOString(),
        updatedAt: value.updatedAt.toISOString(),
      }
    }),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function presentPage<
  T extends {
    items: readonly { createdAt: Date; updatedAt: Date }[]
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  },
>(page: T) {
  return {
    ...page,
    items: page.items.map((record) => ({
      ...record,
      createdAt: record.createdAt.toISOString(),
      lastVisitAt: null,
      nextAppointmentAt: null,
      updatedAt: record.updatedAt.toISOString(),
    })),
  }
}
