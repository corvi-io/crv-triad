import { Elysia, t } from "elysia"
import { z } from "zod"
import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { Capability } from "../../access/domain/access-decision.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { ServiceDeskService } from "../application/service-desk-service.js"
import { ServiceDeskError } from "../domain/errors.js"

class AccessError extends Error {}
const body = t.Record(t.String(), t.Any())
const query = t.Record(t.String(), t.Optional(t.String()))
export type ServiceDeskTelemetry = {
  event: "service_desk_request"
  requestId: string
  route: string
  method: string
  status: number
  durationMs: number
  organizationId?: string
  actorUserId?: string
  resultCode: string
}
function requestId(headers: Headers) {
  const candidate = headers.get("x-request-id")
  return candidate && /^[a-zA-Z0-9_-]{1,100}$/.test(candidate) ? candidate : crypto.randomUUID()
}
export function createServiceDeskRoutes(
  service: ServiceDeskService,
  resolve: TenantContextResolver,
  authorize: TenantActionAuthorizer,
  observe: (event: ServiceDeskTelemetry) => void = () => undefined,
) {
  const traces = new WeakMap<
    Headers,
    {
      started: number
      requestId: string
      organizationId?: string
      actorUserId?: string
      resultCode: string
    }
  >()
  async function context(headers: Headers, capability: Capability) {
    const resolved = await resolve(headers)
    if (!resolved.allowed) throw new AccessError(resolved.reason)
    const decision = await authorize(resolved.context, capability)
    if (!decision.allowed) throw new AccessError(decision.reason)
    const trace = traces.get(headers)
    if (trace) {
      trace.organizationId = resolved.context.organizationId
      trace.actorUserId = resolved.context.actorUserId
    }
    return resolved.context
  }
  return new Elysia({ name: "service-desk-routes", prefix: "/api/service-desk" })
    .onRequest(({ request, set }) => {
      const id = requestId(request.headers)
      traces.set(request.headers, {
        started: performance.now(),
        requestId: id,
        resultCode: "succeeded",
      })
      set.headers["x-request-id"] = id
    })
    .onAfterResponse(({ request, route, set }) => {
      const trace = traces.get(request.headers)
      if (trace && route)
        observe({
          event: "service_desk_request",
          requestId: trace.requestId,
          route,
          method: request.method,
          status: typeof set.status === "number" ? set.status : 200,
          durationMs: Math.round((performance.now() - trace.started) * 100) / 100,
          organizationId: trace.organizationId,
          actorUserId: trace.actorUserId,
          resultCode: trace.resultCode,
        })
    })
    .onError(({ error, code, request, set }) => {
      const trace = traces.get(request.headers)
      const id = trace?.requestId ?? requestId(request.headers)
      const resultCode =
        error instanceof ServiceDeskError
          ? error.code
          : error instanceof AccessError
            ? error.message
            : code === "VALIDATION" || error instanceof z.ZodError
              ? "invalid_request"
              : "internal_error"
      if (trace) trace.resultCode = resultCode
      if (error instanceof AccessError) {
        set.status = error.message === "unauthenticated" ? 401 : 403
        return { code: resultCode, requestId: id }
      }
      if (error instanceof ServiceDeskError) {
        set.status =
          error.code === "not_found"
            ? 404
            : [
                  "version_conflict",
                  "invalid_transition",
                  "professional_occupied",
                  "idempotency_conflict",
                  "active_dependency",
                ].includes(error.code)
              ? 409
              : 400
        return {
          code: error.code,
          ...(error.field ? { details: { field: error.field } } : {}),
          requestId: id,
        }
      }
      if (error instanceof z.ZodError || code === "VALIDATION") {
        set.status = 400
        const field = error instanceof z.ZodError ? error.issues[0]?.path[0] : undefined
        return {
          code: "invalid_request",
          ...(typeof field === "string" ? { details: { field } } : {}),
          requestId: id,
        }
      }
      set.status = 500
      return { code: "internal_error", requestId: id }
    })
    .get(
      "/visits",
      async ({ request, query: q }) => {
        const actor = await context(request.headers, "service_desk.read")
        const parsed = z
          .object({
            unitId: z.string().min(1),
            stage: z.enum(["waiting", "called", "in-service"]).optional(),
            cursor: z.string().max(256).optional(),
            search: z.string().trim().max(100).optional(),
            priority: z.enum(["normal", "fit-in"]).optional(),
            preference: z.enum(["specific", "first-available"]).optional(),
            professionalId: z.string().min(1).optional(),
          })
          .parse(q)
        return service.queue(actor.organizationId, parsed.unitId, parsed)
      },
      { query },
    )
    .get(
      "/history",
      async ({ request, query: q }) => {
        const actor = await context(request.headers, "service_desk.read")
        const parsed = z
          .object({
            unitId: z.string().min(1),
            page: z.coerce.number().int().min(1).max(10000).default(1),
            pageSize: z.coerce
              .number()
              .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
              .default(20),
          })
          .parse(q)
        return service.history(actor.organizationId, parsed.unitId, parsed.page, parsed.pageSize)
      },
      { query },
    )
    .get("/visits/:id", async ({ request, params }) =>
      service.detail(
        (await context(request.headers, "service_desk.read")).organizationId,
        params.id,
      ),
    )
    .get(
      "/arrivals",
      async ({ request, query: value }) => {
        const actor = await context(request.headers, "service_desk.read")
        const input = z
          .object({ unitId: z.string().min(1), cursor: z.string().max(256).optional() })
          .parse(value)
        return service.arrivals(actor.organizationId, input.unitId, input.cursor)
      },
      { query },
    )
    .post(
      "/visits/walk-ins",
      async ({ request, body: value }) => {
        const actor = await context(request.headers, "service_desk.manage")
        return service.admitWalkIn(actor, value)
      },
      { body },
    )
    .post(
      "/arrivals/:appointmentId/admit",
      async ({ request, params, body: value }) => {
        const actor = await context(request.headers, "service_desk.manage")
        return service.admitScheduled(actor, params.appointmentId, value)
      },
      { body },
    )
    .post(
      "/visits/:id/call",
      async ({ request, params, body: value }) =>
        service.transition(
          await context(request.headers, "service_desk.manage"),
          params.id,
          "call",
          value,
        ),
      { body },
    )
    .post(
      "/visits/:id/return-to-waiting",
      async ({ request, params, body: value }) =>
        service.transition(
          await context(request.headers, "service_desk.manage"),
          params.id,
          "return_to_waiting",
          value,
        ),
      { body },
    )
    .post(
      "/visits/:id/cancel",
      async ({ request, params, body: value }) =>
        service.transition(
          await context(request.headers, "service_desk.manage"),
          params.id,
          "cancel",
          value,
        ),
      { body },
    )
    .post(
      "/visits/:id/items",
      async ({ request, params, body: value }) =>
        service.addItem(await context(request.headers, "service_desk.manage"), params.id, value),
      { body },
    )
    .post(
      "/visits/:id/start",
      async ({ request, params, body: value }) =>
        service.start(await context(request.headers, "service_desk.manage"), params.id, value),
      { body },
    )
    .post(
      "/visits/:id/items/:itemId/finish",
      async ({ request, params, body: value }) =>
        service.finishItem(
          await context(request.headers, "service_desk.manage"),
          params.id,
          params.itemId,
          value,
        ),
      { body },
    )
    .post(
      "/visits/:id/items/:itemId/start",
      async ({ request, params, body: value }) =>
        service.start(await context(request.headers, "service_desk.manage"), params.id, {
          ...(value as Record<string, unknown>),
          itemId: params.itemId,
        }),
      { body },
    )
    .post(
      "/visits/:id/finish",
      async ({ request, params, body: value }) =>
        service.finish(await context(request.headers, "service_desk.manage"), params.id, value),
      { body },
    )
    .patch(
      "/visits/:id/notes",
      async ({ request, params, body: value }) =>
        service.updateNotes(
          await context(request.headers, "service_desk.manage"),
          params.id,
          value,
        ),
      { body },
    )
    .post(
      "/visits/:id/items/:itemId/remove",
      async ({ request, params, body: value }) =>
        service.removeItem(
          await context(request.headers, "service_desk.manage"),
          params.id,
          params.itemId,
          value,
        ),
      { body },
    )
    .post(
      "/visits/:id/items/:itemId/assign",
      async ({ request, params, body: value }) =>
        service.assignItem(
          await context(request.headers, "service_desk.manage"),
          params.id,
          params.itemId,
          value,
        ),
      { body },
    )
    .post(
      "/visits/:id/items/:itemId/extend",
      async ({ request, params, body: value }) =>
        service.extendItem(
          await context(request.headers, "service_desk.manage"),
          params.id,
          params.itemId,
          value,
        ),
      { body },
    )
    .post(
      "/visits/:id/interrupt",
      async ({ request, params, body: value }) =>
        service.interrupt(await context(request.headers, "service_desk.correct"), params.id, value),
      { body },
    )
}
