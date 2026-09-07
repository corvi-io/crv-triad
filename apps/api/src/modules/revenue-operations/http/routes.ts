import { Elysia, t } from "elysia"
import { z } from "zod"
import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { Capability } from "../../access/domain/access-decision.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { RevenueOperationsService } from "../application/revenue-operations-service.js"
import { RevenueOperationsError } from "../domain/errors.js"

class AccessError extends Error {}

const body = t.Record(t.String(), t.Any())
const query = t.Record(t.String(), t.Optional(t.String()))
const uuid = z.string().uuid()
const opaqueId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/)
const page = z.coerce.number().int().min(1).max(10_000).default(1)
const pageSize = z.coerce
  .number()
  .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
  .default(20)
const command = { idempotencyKey: uuid }

export type RevenueOperationsTelemetry = {
  event: "revenue_operations_request"
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

export function createRevenueOperationsRoutes(
  service: RevenueOperationsService,
  resolve: TenantContextResolver,
  authorize: TenantActionAuthorizer,
  observe: (event: RevenueOperationsTelemetry) => void = () => undefined,
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

  return new Elysia({ name: "revenue-operations-routes", prefix: "/api/revenue-operations" })
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
          event: "revenue_operations_request",
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
        error instanceof RevenueOperationsError
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
      if (error instanceof RevenueOperationsError) {
        set.status =
          error.code === "not_found"
            ? 404
            : [
                  "version_conflict",
                  "idempotency_conflict",
                  "already_registered",
                  "already_reversed",
                  "cash_day_closed",
                  "later_cash_day_exists",
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
      "/checkouts",
      async ({ request, query: value }) => {
        const actor = await context(request.headers, "revenue.read_checkout")
        const input = z
          .object({
            unitId: opaqueId.optional(),
            status: z.enum(["open", "registered"]).optional(),
            page,
            pageSize,
          })
          .parse(value)
        return service.listCheckouts(actor, input)
      },
      { query },
    )
    .get("/checkouts/by-visit/:visitId", async ({ request, params }) =>
      service.getCheckoutByVisit(
        await context(request.headers, "revenue.read_checkout"),
        uuid.parse(params.visitId),
      ),
    )
    .post(
      "/checkouts",
      async ({ request, body: value }) => {
        const input = z
          .object({ visitId: uuid, ...command })
          .strict()
          .parse(value)
        return service.openCheckout(
          await context(request.headers, "revenue.read_checkout"),
          input.visitId,
          input.idempotencyKey,
        )
      },
      { body },
    )
    .get("/checkouts/:id", async ({ request, params }) =>
      service.getCheckout(
        await context(request.headers, "revenue.read_checkout"),
        uuid.parse(params.id),
      ),
    )
    .get("/checkouts/:id/registration-context", async ({ request, params }) =>
      service.registrationContext(
        await context(request.headers, "revenue.register"),
        uuid.parse(params.id),
      ),
    )
    .patch(
      "/checkouts/:id/lines/:lineId",
      async ({ request, params, body: value }) => {
        const input = z
          .object({
            expectedVersion: z.number().int().positive(),
            priceCents: z.number(),
            reason: z.string(),
            ...command,
          })
          .strict()
          .parse(value)
        return service.updateLine(await context(request.headers, "revenue.adjust"), {
          checkoutId: uuid.parse(params.id),
          lineId: uuid.parse(params.lineId),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .put(
      "/checkouts/:id/adjustments",
      async ({ request, params, body: value }) => {
        const input = z
          .object({
            expectedVersion: z.number().int().positive(),
            discountCents: z.number(),
            surchargeCents: z.number(),
            discountReason: z.string().optional(),
            surchargeReason: z.string().optional(),
            ...command,
          })
          .strict()
          .parse(value)
        return service.updateAdjustments(await context(request.headers, "revenue.adjust"), {
          checkoutId: uuid.parse(params.id),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .put(
      "/checkouts/:id/tenders",
      async ({ request, params, body: value }) => {
        const input = z
          .object({
            expectedVersion: z.number().int().positive(),
            tenders: z
              .array(
                z
                  .object({
                    method: z.enum(["pix", "cash", "debit", "credit"]),
                    appliedCents: z.number(),
                    receivedCents: z.number().optional(),
                  })
                  .strict(),
              )
              .max(4),
            ...command,
          })
          .strict()
          .parse(value)
        return service.replaceTenders(await context(request.headers, "revenue.register"), {
          checkoutId: uuid.parse(params.id),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .post(
      "/checkouts/:id/register",
      async ({ request, params, body: value }) => {
        const input = z
          .object({
            expectedCheckoutVersion: z.number().int().positive(),
            expectedDayVersion: z.number().int().positive(),
            ...command,
          })
          .strict()
          .parse(value)
        return service.registerReceipt(await context(request.headers, "revenue.register"), {
          checkoutId: uuid.parse(params.id),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .get("/receipts/:id", async ({ request, params }) =>
      service.loadReceipt(
        await context(request.headers, "revenue.read_checkout"),
        uuid.parse(params.id),
      ),
    )
    .post(
      "/receipts/:id/cancel",
      async ({ request, params, body: value }) => {
        const input = z
          .object({
            expectedCheckoutVersion: z.number().int().positive(),
            expectedDayVersion: z.number().int().positive(),
            reason: z.string(),
            confirmOutsideTriad: z.literal(true),
            ...command,
          })
          .strict()
          .parse(value)
        return service.reverseReceipt(await context(request.headers, "revenue.correct"), {
          receiptId: uuid.parse(params.id),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .get("/payment-methods", async ({ request }) =>
      service.paymentMethods(await context(request.headers, "revenue.read_checkout")),
    )
    .put(
      "/payment-methods",
      async ({ request, body: value }) => {
        const input = z
          .object({
            expectedVersion: z.number().int().positive(),
            methods: z
              .array(
                z
                  .object({
                    method: z.enum(["pix", "cash", "debit", "credit"]),
                    enabled: z.boolean(),
                  })
                  .strict(),
              )
              .length(4),
            ...command,
          })
          .strict()
          .parse(value)
        return service.configureMethods(await context(request.headers, "revenue.configure"), {
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .get(
      "/cash-days",
      async ({ request, query: value }) => {
        const actor = await context(request.headers, "cash.read")
        const input = z
          .object({
            unitId: opaqueId,
            date: z.iso.date().optional(),
            from: z.iso.date().optional(),
            to: z.iso.date().optional(),
            page,
            pageSize,
          })
          .parse(value)
        if (input.from || input.to) {
          if (!input.from || !input.to) throw new RevenueOperationsError("invalid_request", "from")
          return service.listCashDays(actor, {
            unitId: input.unitId,
            from: input.from,
            to: input.to,
            page: input.page,
            pageSize: input.pageSize,
          })
        }
        if (!input.date) throw new RevenueOperationsError("invalid_request", "date")
        return { day: await service.getCashDay(actor, input.unitId, input.date) }
      },
      { query },
    )
    .post(
      "/cash-days",
      async ({ request, body: value }) => {
        const input = z
          .object({ unitId: opaqueId, openingCashCents: z.number(), ...command })
          .strict()
          .parse(value)
        return service.openCashDay(await context(request.headers, "cash.manage"), {
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .get(
      "/cash-days/current",
      async ({ request, query: value }) => {
        const input = z.object({ unitId: opaqueId }).strict().parse(value)
        return service.getCurrentCashDay(await context(request.headers, "cash.read"), input.unitId)
      },
      { query },
    )
    .get("/cash-days/:id", async ({ request, params }) =>
      service.getCashDayById(await context(request.headers, "cash.read"), uuid.parse(params.id)),
    )
    .post(
      "/cash-days/:id/movements",
      async ({ request, params, body: value }) => {
        const input = z
          .object({
            kind: z.enum(["supply", "withdrawal"]),
            amountCents: z.number(),
            reason: z.string(),
            expectedVersion: z.number().int().positive(),
            ...command,
          })
          .strict()
          .parse(value)
        return service.addMovement(await context(request.headers, "cash.manage"), {
          cashDayId: uuid.parse(params.id),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .post(
      "/cash-days/:id/movements/:movementId/reverse",
      async ({ request, params, body: value }) => {
        const input = z
          .object({ expectedVersion: z.number().int().positive(), reason: z.string(), ...command })
          .strict()
          .parse(value)
        return service.reverseMovement(await context(request.headers, "cash.manage"), {
          cashDayId: uuid.parse(params.id),
          movementId: uuid.parse(params.movementId),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .post(
      "/cash-days/:id/close",
      async ({ request, params, body: value }) => {
        const input = z
          .object({
            expectedVersion: z.number().int().positive(),
            countedCashCents: z.number(),
            reason: z.string().optional(),
            ...command,
          })
          .strict()
          .parse(value)
        return service.closeDay(await context(request.headers, "cash.manage"), {
          cashDayId: uuid.parse(params.id),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
    .post(
      "/cash-days/:id/reopen",
      async ({ request, params, body: value }) => {
        const input = z
          .object({ expectedVersion: z.number().int().positive(), reason: z.string(), ...command })
          .strict()
          .parse(value)
        return service.reopenDay(await context(request.headers, "cash.manage"), {
          cashDayId: uuid.parse(params.id),
          ...input,
          key: input.idempotencyKey,
        })
      },
      { body },
    )
}
