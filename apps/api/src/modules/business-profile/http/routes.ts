import { Elysia, t } from "elysia"
import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { Capability } from "../../access/domain/access-decision.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { BusinessProfileService } from "../application/business-profile-service.js"
import { BusinessProfileError } from "../application/business-profile-service.js"

class AccessError extends Error {}
export function createBusinessProfileRoutes(
  service: BusinessProfileService,
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
  return new Elysia({ name: "business-profile-routes", prefix: "/api/business-profile" })
    .onError(({ error, set }) => {
      if (error instanceof AccessError) {
        set.status = error.message === "unauthenticated" ? 401 : 403
        return { code: error.message }
      }
      if (error instanceof BusinessProfileError) {
        set.status = error.code === "version_conflict" ? 409 : 400
        return { code: error.code }
      }
      set.status = 400
      return { code: "invalid_request" }
    })
    .get("/", ({ request }) => context(request.headers, "business_profile.read").then(service.get))
    .put(
      "/",
      async ({ request, body }) =>
        service.save(await context(request.headers, "business_profile.manage"), body),
      { body: t.Record(t.String(), t.Any()) },
    )
    .post(
      "/logo",
      async ({ request, body }) => {
        const actor = await context(request.headers, "business_profile.manage")
        const input = body as { file: File; expectedVersion: string }
        return service.uploadLogo(
          actor,
          new Uint8Array(await input.file.arrayBuffer()),
          Number(input.expectedVersion),
        )
      },
      {
        body: t.Object({ file: t.File({ maxSize: 5 * 1024 * 1024 }), expectedVersion: t.String() }),
      },
    )
    .get("/logo", async ({ request, set }) => {
      const value = await service.logo(await context(request.headers, "business_profile.read"))
      if (!value) {
        set.status = 404
        return { code: "not_found" }
      }
      set.headers["content-type"] = value.contentType
      return value.body
    })
    .delete(
      "/logo",
      async ({ request, query }) =>
        service.removeLogo(
          await context(request.headers, "business_profile.manage"),
          Number(query.expectedVersion),
        ),
      { query: t.Object({ expectedVersion: t.String() }) },
    )
}
