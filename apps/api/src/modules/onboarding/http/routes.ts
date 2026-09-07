import { Elysia } from "elysia"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { ActivationReadinessService } from "../application/activation-readiness.js"

export function createOnboardingRoutes(
  readiness: ActivationReadinessService,
  resolve: TenantContextResolver,
  observe: (event: object) => void = () => undefined,
) {
  return new Elysia({ name: "onboarding-routes", prefix: "/api/onboarding" }).get(
    "/readiness",
    async ({ request, status }) => {
      const result = await resolve(request.headers)
      if (!result.allowed)
        return status(result.reason === "unauthenticated" ? 401 : 403, { code: result.reason })
      const startedAt = performance.now()
      const projection = await readiness(result.context)
      observe({
        event: "onboarding_readiness_resolved",
        durationMs: Math.round(performance.now() - startedAt),
        outcome: projection.outcome,
        nextStepId: projection.nextStepId,
        roleClass: projection.canManage ? "manager" : "member",
      })
      return projection
    },
  )
}
