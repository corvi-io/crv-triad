import { Elysia, t } from "elysia"
import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { Capability } from "../../access/domain/access-decision.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { CommissionService } from "../application/commission-service.js"
import { CommissionError } from "../application/commission-service.js"

class AccessError extends Error {}
export function createCommissionRoutes(
  service: CommissionService,
  resolve: TenantContextResolver,
  authorize: TenantActionAuthorizer,
) {
  async function context(headers: Headers, capability: Capability) {
    const result = await resolve(headers)
    if (!result.allowed) throw new AccessError(result.reason)
    const access = await authorize(result.context, capability)
    if (!access.allowed) throw new AccessError(access.reason)
    return result.context
  }
  return new Elysia({ name: "commission-routes", prefix: "/api/commissions" })
    .onError(({ error, set }) => {
      if (error instanceof AccessError) {
        set.status = error.message === "unauthenticated" ? 401 : 403
        return { code: error.message }
      }
      if (error instanceof CommissionError) {
        set.status = error.code === "not_found" ? 404 : 409
        return { code: error.code }
      }
      set.status = 400
      return { code: "invalid_request" }
    })
    .get("/policies", ({ request }) =>
      context(request.headers, "commissions.read").then(service.listPolicies),
    )
    .put(
      "/policies",
      async ({ request, body }) =>
        service.savePolicy(await context(request.headers, "commissions.manage"), body),
      { body: t.Record(t.String(), t.Any()) },
    )
    .get(
      "/detail",
      async ({ request, query }) =>
        service.detail(await context(request.headers, "commissions.read"), query),
      { query: t.Record(t.String(), t.Optional(t.String())) },
    )
}
