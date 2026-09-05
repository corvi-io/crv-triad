import { Elysia, t } from "elysia"

import type { ContextDiscovery } from "../application/context-discovery.js"
import type { TenantContextSelector } from "../application/select-tenant-context.js"

export function createContextRoutes(
  discoverContexts: ContextDiscovery,
  selectTenantContext: TenantContextSelector,
) {
  return new Elysia({ name: "context-routes" })
    .get("/api/contexts", async ({ request, status }) => {
      const result = await discoverContexts(request.headers)
      if (result.status === "unauthenticated") {
        return status(401, { code: "unauthenticated" })
      }
      if (result.status === "forbidden") return status(403, { code: "tenant_forbidden" })
      if (result.status === "membership_limit_reached") {
        return status(409, { code: "membership_limit_reached" })
      }
      return result
    })
    .post(
      "/api/contexts/active",
      async ({ body, request, status }) => {
        const result = await selectTenantContext(request.headers, body.organizationId)
        if (result.status === "unauthenticated") {
          return status(401, { code: "unauthenticated" })
        }
        if (result.status === "forbidden") return status(403, { code: "tenant_forbidden" })
        return result
      },
      { body: t.Object({ organizationId: t.String({ maxLength: 128, minLength: 1 }) }) },
    )
}
