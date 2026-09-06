import { Elysia, t } from "elysia"
import type { TenantActionAuthorizer } from "../../access/application/authorize-tenant-action.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { ReportExportService } from "../application/report-export-service.js"
import type { ReportingService } from "../application/reporting-service.js"

class AccessError extends Error {}
class ExportUnavailableError extends Error {}
export function createReportingRoutes(
  service: ReportingService,
  exports: ReportExportService,
  resolve: TenantContextResolver,
  authorize: TenantActionAuthorizer,
  exportEnabled = true,
) {
  async function actor(
    headers: Headers,
    capability: "reports.read" | "reports.export" = "reports.read",
  ) {
    const context = await resolve(headers)
    if (!context.allowed) throw new AccessError(context.reason)
    const access = await authorize(context.context, capability)
    if (!access.allowed) throw new AccessError(access.reason)
    return context.context
  }
  return new Elysia({ name: "reporting-routes", prefix: "/api/reports" })
    .onError(({ error, set }) => {
      if (error instanceof AccessError) {
        set.status = error.message === "unauthenticated" ? 401 : 403
        return { code: error.message }
      }
      if (error instanceof ExportUnavailableError) {
        set.status = 503
        return { code: "report_export_unavailable" }
      }
      if (
        error instanceof Error &&
        ["requester_email_unverified", "idempotency_conflict"].includes(error.message)
      ) {
        set.status = 409
        return { code: error.message }
      }
      set.status = 400
      return { code: "invalid_request" }
    })
    .get(
      "/summary",
      async ({ request, query }) => service.summary(await actor(request.headers), query),
      { query: t.Record(t.String(), t.Optional(t.String())) },
    )
    .get("/catalog", async ({ request }) => {
      return exports.catalog(await actor(request.headers))
    })
    .get("/generated", async ({ request }) => exports.history(await actor(request.headers)))
    .get("/generated/:id", async ({ request, params, set }) => {
      const result = await exports.status(await actor(request.headers), params.id)
      if (!result) set.status = 404
      return result ?? { code: "not_found" }
    })
    .post(
      "/generated",
      async ({ request, body }) =>
        exportEnabled
          ? exports.request(await actor(request.headers, "reports.export"), body)
          : Promise.reject(new ExportUnavailableError()),
      { body: t.Record(t.String(), t.Any()) },
    )
    .post("/generated/:id/retry", async ({ request, params }) => {
      if (!exportEnabled) throw new ExportUnavailableError()
      return exports.retry(await actor(request.headers, "reports.export"), params.id)
    })
    .post("/generated/:id/delivery/retry", async ({ request, params, set }) => {
      if (!exportEnabled) throw new ExportUnavailableError()
      const result = await exports.retryDelivery(
        await actor(request.headers, "reports.export"),
        params.id,
      )
      if (!result) set.status = 404
      return result ?? { code: "not_found" }
    })
    .get("/generated/:id/download", async ({ request, params, set }) => {
      const url = await exports.download(await actor(request.headers, "reports.export"), params.id)
      if (!url) {
        set.status = 404
        return { code: "not_found" }
      }
      return { url, expiresInSeconds: 300 }
    })
    .get("/local-artifacts/*", async ({ request, params, set }) => {
      const current = await actor(request.headers, "reports.export")
      const key = decodeURIComponent(params["*"])
      if (!key.startsWith(`${current.organizationId}/`) || !exports.readLocalArtifact) {
        set.status = 404
        return { code: "not_found" }
      }
      const artifact = await exports.readLocalArtifact(key)
      if (!artifact) {
        set.status = 404
        return { code: "not_found" }
      }
      set.headers["content-type"] = artifact.contentType
      return artifact.body
    })
}
