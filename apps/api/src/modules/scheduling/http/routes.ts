import { Elysia, t } from "elysia"
import { z } from "zod"
import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { Capability } from "../../access/domain/access-decision.js"
import type { AvailabilityService } from "../../availability/application/availability-service.js"
import { SchedulingError } from "../../availability/domain/time.js"
import { createAvailabilityRoutes } from "../../availability/http/routes.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { SchedulingService } from "../application/scheduling-service.js"
import { commands } from "../domain/appointment.js"

export type SchedulingTelemetry = {
  event: "scheduling_request"
  requestId: string
  route: string
  method: string
  durationMs: number
  status: number
  organizationId?: string
  actorUserId?: string
  resultCode?: string
  resultCount?: number
  rangeDays?: number
  entityId?: string
  version?: number
}
const querySchema = t.Record(t.String(), t.Optional(t.String()))
const version = z.number().int().positive()
export function createSchedulingRoutes(
  service: SchedulingService,
  availability: AvailabilityService,
  resolve: TenantContextResolver,
  authorize: TenantActionAuthorizer,
  observe: (event: SchedulingTelemetry) => void = () => undefined,
) {
  const requests = new WeakMap<
    Headers,
    {
      started: number
      requestId: string
      organizationId?: string
      actorUserId?: string
      resultCode?: string
      resultCount?: number
      rangeDays?: number
      entityId?: string
      version?: number
    }
  >()
  async function context(headers: Headers, capability: Capability) {
    const result = await resolve(headers)
    if (!result.allowed) throw new AccessError(result.reason)
    const decision = await authorize(result.context, capability)
    if (!decision.allowed) throw new AccessError(decision.reason)
    const trace = requests.get(headers)
    if (trace) {
      trace.organizationId = result.context.organizationId
      trace.actorUserId = result.context.actorUserId
    }
    return result.context
  }
  const app = new Elysia({ name: "scheduling-routes", prefix: "/api" })
    .onRequest(({ request, set }) => {
      const requestId = requests.get(request.headers)?.requestId ?? safeRequestId(request.headers)
      requests.set(request.headers, { started: performance.now(), requestId })
      set.headers["x-request-id"] = requestId
    })
    .onAfterHandle(({ request, response }) => {
      const trace = requests.get(request.headers)
      if (!trace) return
      trace.resultCode = "succeeded"
      if (Array.isArray(response)) trace.resultCount = response.length
      else if (response && typeof response === "object") {
        const result = response as {
          id?: unknown
          version?: unknown
          items?: unknown[]
          appointments?: unknown[]
          occurrences?: unknown[]
        }
        if (typeof result.id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(result.id))
          trace.entityId = result.id
        if (typeof result.version === "number" && Number.isInteger(result.version))
          trace.version = result.version
        trace.resultCount =
          result.items?.length ?? result.appointments?.length ?? result.occurrences?.length
      }
      const params = new URL(request.url).searchParams
      const start = params.get("startDate"),
        end = params.get("endDate")
      if (start && end && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end))
        trace.rangeDays = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
    })
    .onAfterResponse(({ request, route, set }) => {
      const trace = requests.get(request.headers)
      if (!trace || !route) return
      observe({
        event: "scheduling_request",
        requestId: trace.requestId,
        route,
        method: request.method,
        durationMs: Math.round((performance.now() - trace.started) * 100) / 100,
        status: typeof set.status === "number" ? set.status : 200,
        organizationId: trace.organizationId,
        actorUserId: trace.actorUserId,
        resultCode: trace.resultCode,
        resultCount: trace.resultCount,
        rangeDays: trace.rangeDays,
        entityId: trace.entityId,
        version: trace.version,
      })
    })
    .onError(({ code, error, request, set }) => {
      const trace = requests.get(request.headers)
      if (trace)
        trace.resultCode =
          error instanceof SchedulingError
            ? error.code
            : error instanceof AccessError
              ? error.message
              : code === "VALIDATION" || error instanceof z.ZodError
                ? "invalid_request"
                : code === "NOT_FOUND"
                  ? "not_found"
                  : "internal_error"
      const requestId = requests.get(request.headers)?.requestId ?? safeRequestId(request.headers)
      if (error instanceof AccessError) {
        set.status = error.message === "unauthenticated" ? 401 : 403
        return { code: error.message, requestId }
      }
      if (error instanceof SchedulingError) {
        set.status =
          error.code === "not_found"
            ? 404
            : [
                  "version_conflict",
                  "appointment_conflict",
                  "availability_overlap",
                  "appointment_dependency",
                  "idempotency_conflict",
                  "timezone_in_use",
                ].includes(error.code)
              ? 409
              : 400
        return {
          code: error.code,
          ...(error.field ? { details: { field: error.field } } : {}),
          requestId,
        }
      }
      if (error instanceof z.ZodError || code === "VALIDATION") {
        const field = error instanceof z.ZodError ? error.issues[0]?.path[0] : undefined
        set.status = 400
        return {
          code: "invalid_request",
          ...(typeof field === "string" ? { details: { field } } : {}),
          requestId,
        }
      }
      if (code === "NOT_FOUND") {
        set.status = 404
        return { code: "not_found", requestId }
      }
      set.status = 500
      return { code: "internal_error", requestId }
    })
    .get(
      "/scheduling/units",
      async ({ request, query }) =>
        service.units(
          (await context(request.headers, "scheduling.read")).organizationId,
          z
            .string()
            .max(160)
            .parse(query.search ?? ""),
        ),
      { query: querySchema },
    )
    .get(
      "/scheduling/options",
      async ({ request, query }) => {
        const actor = await context(request.headers, "scheduling.read")
        const { unitId, ...filters } = z
          .object({
            unitId: z.string().min(1),
            professionalSearch: z.string().max(160).optional(),
            serviceSearch: z.string().max(160).optional(),
            professionalId: z.string().max(100).optional(),
            serviceId: z.string().max(100).optional(),
          })
          .parse(query)
        return service.options(actor.organizationId, unitId, filters)
      },
      { query: querySchema },
    )
    .get(
      "/scheduling/range",
      async ({ request, query }) =>
        service.range((await context(request.headers, "scheduling.read")).organizationId, query),
      { query: querySchema },
    )
    .get(
      "/scheduling/appointments",
      async ({ request, query }) =>
        service.page((await context(request.headers, "scheduling.read")).organizationId, query),
      { query: querySchema },
    )
    .get(
      "/scheduling/appointments/:id",
      async ({ request, params, query }) =>
        service.detail(
          (await context(request.headers, "scheduling.read")).organizationId,
          params.id,
          z.coerce
            .number()
            .int()
            .min(1)
            .max(10000)
            .parse(query.page ?? 1),
        ),
      { query: querySchema },
    )
    .get(
      "/scheduling/professionals/:id",
      async ({ request, params, query }) =>
        service.professionalSchedule(
          (await context(request.headers, "scheduling.read")).organizationId,
          params.id,
          z.iso.date().parse(query.date),
        ),
      { query: querySchema },
    )
    .get(
      "/scheduling/clients/:id/history",
      async ({ request, params, query }) =>
        service.clientHistory(
          (await context(request.headers, "scheduling.read")).organizationId,
          params.id,
          z.coerce
            .number()
            .int()
            .min(1)
            .max(10000)
            .parse(query.page ?? 1),
        ),
      { query: querySchema },
    )
    .post(
      "/scheduling/appointments",
      async ({ request, body, set }) => {
        const actor = await context(request.headers, "scheduling.manage")
        const result = await service.create(
          actor,
          body,
          request.headers.get("idempotency-key") ?? "",
        )
        set.status = 201
        return result
      },
      { body: t.Unknown() },
    )
    .patch(
      "/scheduling/appointments/:id",
      async ({ request, body, params }) => {
        const actor = await context(request.headers, "scheduling.manage")
        const { version: expected, ...input } = z.object({ version }).passthrough().parse(body)
        return service.update(
          actor,
          params.id,
          input,
          expected,
          request.headers.get("idempotency-key") ?? "",
        )
      },
      { body: t.Unknown() },
    )
    .post(
      "/scheduling/appointments/:id/reschedule",
      async ({ request, params, body }) => {
        const actor = await context(request.headers, "scheduling.manage")
        const { version: expected, ...input } = z.object({ version }).passthrough().parse(body)
        return service.update(
          actor,
          params.id,
          input,
          expected,
          request.headers.get("idempotency-key") ?? "",
          "reschedule",
        )
      },
      { body: t.Unknown() },
    )
    .use(createAvailabilityRoutes(availability, context))
  for (const action of commands)
    app.post(
      `/scheduling/appointments/:id/${action}`,
      async ({ request, params, body }) =>
        service.changeStatus(
          await context(request.headers, "scheduling.manage"),
          params.id,
          action,
          body,
          request.headers.get("idempotency-key") ?? "",
        ),
      { body: t.Unknown() },
    )
  return app
}
class AccessError extends Error {}

function safeRequestId(headers: Headers) {
  const value = headers.get("x-request-id")
  return value && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : crypto.randomUUID()
}
