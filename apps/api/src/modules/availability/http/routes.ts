import { Elysia, t } from "elysia"
import { z } from "zod"
import type { Capability } from "../../access/domain/access-decision.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import type { AvailabilityService } from "../application/availability-service.js"

const querySchema = t.Record(t.String(), t.Optional(t.String()))
const version = z.number().int().positive()
// Mounted under the shared /api authorization and safe-error boundary.
export function createAvailabilityRoutes(
  availability: AvailabilityService,
  context: (headers: Headers, capability: Capability) => Promise<TenantContext>,
) {
  return new Elysia({ name: "availability-routes" })
    .get("/availability/series/:id", async ({ request, params }) =>
      availability.detail(
        (await context(request.headers, "availability.read")).organizationId,
        params.id,
      ),
    )
    .get("/availability/summary", async ({ request }) =>
      availability.summary((await context(request.headers, "availability.read")).organizationId),
    )
    .get(
      "/availability",
      async ({ request, query }) => {
        const actor = await context(request.headers, "availability.read")
        return availability.range(
          actor.organizationId,
          z
            .object({
              unitId: z.string().min(1),
              startDate: z.iso.date(),
              endDate: z.iso.date(),
              professionalId: z.string().optional(),
              includeArchived: z
                .enum(["true", "false"])
                .optional()
                .transform((value) => value === "true"),
            })
            .parse(query),
        )
      },
      { query: querySchema },
    )
    .post(
      "/availability/series",
      async ({ request, body }) => {
        const actor = await context(request.headers, "availability.manage")
        return availability.save(actor.organizationId, body, undefined, {
          actorUserId: actor.actorUserId,
          key: request.headers.get("idempotency-key") ?? "",
        })
      },
      { body: t.Unknown() },
    )
    .patch(
      "/availability/series/:id",
      async ({ request, params, body }) => {
        const actor = await context(request.headers, "availability.manage")
        const {
          version: expected,
          scope,
          date,
          archive,
          restore,
          input,
        } = z
          .object({
            version,
            scope: z.enum(["series", "occurrence"]),
            date: z.iso.date().optional(),
            archive: z.boolean().optional(),
            restore: z.boolean().optional(),
            input: z.unknown().optional(),
          })
          .strict()
          .parse(body)
        return availability.save(
          actor.organizationId,
          input ?? null,
          {
            id: params.id,
            version: expected,
            scope,
            date,
            archive,
            restore,
          },
          { actorUserId: actor.actorUserId, key: request.headers.get("idempotency-key") ?? "" },
        )
      },
      { body: t.Unknown() },
    )
    .put(
      "/availability/units/:id/timezone",
      async ({ request, params, body }) => {
        const actor = await context(request.headers, "availability.manage")
        const input = z
          .object({ timezone: z.string().max(100), version })
          .strict()
          .parse(body)
        return availability.timezone(
          actor.organizationId,
          params.id,
          input.timezone,
          input.version,
          { actorUserId: actor.actorUserId, key: request.headers.get("idempotency-key") ?? "" },
        )
      },
      { body: t.Unknown() },
    )
}
