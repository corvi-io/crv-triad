import { Elysia } from "elysia"
import type { Pool } from "pg"
import { createTenantActionAuthorizer } from "../../modules/access/application/authorize-tenant-action.js"
import { createOwnershipRoutes } from "../../modules/access/http/ownership-routes.js"
import { createAccessRoutes } from "../../modules/access/http/routes.js"
import { createAnalyticsRoutes } from "../../modules/analytics/http/routes.js"
import { createPostHogLeadCapture } from "../../modules/analytics/lead-capture.js"
import { createAvailabilityService } from "../../modules/availability/application/availability-service.js"
import { createBackstageRoutes } from "../../modules/backstage/http/routes.js"
import { createBusinessProfileService } from "../../modules/business-profile/application/business-profile-service.js"
import { createBusinessProfileRoutes } from "../../modules/business-profile/http/routes.js"
import { createLocalBusinessLogoStorage } from "../../modules/business-profile/infra/logo-storage.js"
import { createClientService } from "../../modules/clients/application/client-service.js"
import { createDrizzleClientRepository } from "../../modules/clients/database/client-repository.js"
import { createClientRoutes } from "../../modules/clients/http/routes.js"
import { createCommissionService } from "../../modules/commissions/application/commission-service.js"
import { createCommissionRoutes } from "../../modules/commissions/http/routes.js"
import type { IdpEnv } from "../../modules/idp/config/env.js"
import type { IdpDatabase } from "../../modules/idp/database/client.js"
import { createIdpRoutes } from "../../modules/idp/http/app.js"
import { requestContextMiddleware } from "../../modules/idp/http/middleware/request-context.js"
import type { IdpAuth, InvitationAcceptedObserver } from "../../modules/idp/identity/auth.js"
import type { AuthEmailSender } from "../../modules/idp/identity/transactional-email.js"
import { createLeadRoutes } from "../../modules/leads/http/routes.js"
import {
  createFakeArtifactStorage,
  createFakeReportDispatcher,
} from "../../modules/reporting/application/export-providers.js"
import { createReportExportService } from "../../modules/reporting/application/report-export-service.js"
import { createReportWorker } from "../../modules/reporting/application/report-worker.js"
import { createReportingService } from "../../modules/reporting/application/reporting-service.js"
import { createReportingRoutes } from "../../modules/reporting/http/routes.js"
import { createR2ArtifactStorage } from "../../modules/reporting/infra/r2-artifact-storage.js"
import { createTriggerReportDispatcher } from "../../modules/reporting/infra/trigger-report-dispatcher.js"
import {
  createRevenueOperationsService,
  hasOpenRevenueCashDay,
} from "../../modules/revenue-operations/application/revenue-operations-service.js"
import { createRevenueOperationsRoutes } from "../../modules/revenue-operations/http/routes.js"
import {
  createSchedulingService,
  guardAvailabilityAppointments,
} from "../../modules/scheduling/application/scheduling-service.js"
import { nextClientAppointment } from "../../modules/scheduling/database/client-projection.js"
import { createSchedulingRoutes } from "../../modules/scheduling/http/routes.js"
import { createServiceDeskService } from "../../modules/service-desk/application/service-desk-service.js"
import { createServiceDeskRoutes } from "../../modules/service-desk/http/routes.js"
import { createCatalogAuditWriter } from "../../modules/services/application/catalog-audit.js"
import { createCatalogService } from "../../modules/services/application/catalog-service.js"
import { createCatalogRoutes } from "../../modules/services/http/catalog-routes.js"
import { createContextDiscovery } from "../../modules/tenancy/application/context-discovery.js"
import { createTenantContextResolver } from "../../modules/tenancy/application/create-tenant-context-resolver.js"
import { createTenantContextSelector } from "../../modules/tenancy/application/select-tenant-context.js"
import { createTenantMembershipReader } from "../../modules/tenancy/database/membership-reader.js"
import { createContextRoutes } from "../../modules/tenancy/http/routes.js"

export type CreateRestAppInput = {
  env: IdpEnv
  auth: IdpAuth
  authEmailSender?: AuthEmailSender
  db: IdpDatabase
  pool: Pool
  onInvitationAccepted?: InvitationAcceptedObserver
}

export function createRestApp(input: CreateRestAppInput) {
  const captureAcceptedLead = createPostHogLeadCapture(input.env)
  const clientService = createClientService(
    createDrizzleClientRepository(input.db, nextClientAppointment),
  )
  const resolveTenantContext = createTenantContextResolver(
    input.auth,
    input.db,
    createTenantMembershipReader(input.db),
  )
  const authorizeTenantAction = createTenantActionAuthorizer(input.db)
  const catalogService = createCatalogService(input.db)
  const schedulingService = createSchedulingService(input.db, input.env.BETTER_AUTH_SECRET)
  const serviceDeskService = createServiceDeskService(
    input.db,
    schedulingService,
    input.env.BETTER_AUTH_SECRET,
  )
  const observeBusinessRequest = (event: object) =>
    console.info(JSON.stringify({ ...event, appEnvironment: input.env.APP_ENV }))
  const reportingService = createReportingService(input.db)
  const artifactStorage =
    input.env.REPORT_EXPORT_PROVIDER === "trigger"
      ? createR2ArtifactStorage({
          endpoint: input.env.R2_REPORT_ENDPOINT,
          accessKeyId: input.env.R2_REPORT_ACCESS_KEY_ID,
          secretAccessKey: input.env.R2_REPORT_SECRET_ACCESS_KEY,
          bucket: input.env.R2_REPORT_BUCKET,
        })
      : createFakeArtifactStorage()
  const reportWorker = createReportWorker(input.db, reportingService, artifactStorage)
  const fakeReportDispatcher = createFakeReportDispatcher()
  const reportDispatcher =
    input.env.REPORT_EXPORT_PROVIDER === "trigger"
      ? createTriggerReportDispatcher()
      : {
          async dispatch(
            payload: Parameters<ReturnType<typeof createFakeReportDispatcher>["dispatch"]>[0],
            idempotencyKey: string,
          ) {
            const run = await fakeReportDispatcher.dispatch(payload, idempotencyKey)
            queueMicrotask(() => void reportWorker.run(payload).catch(() => undefined))
            return run
          },
        }

  return new Elysia({ name: "crv-triad-api" })
    .use(requestContextMiddleware)
    .use(createIdpRoutes(input))
    .use(
      createContextRoutes(
        createContextDiscovery(input.auth, input.db),
        createTenantContextSelector(input.auth, input.db),
      ),
    )
    .use(createAccessRoutes(input.db, resolveTenantContext, authorizeTenantAction))
    .use(createOwnershipRoutes(input.db, resolveTenantContext))
    .use(createBackstageRoutes(input.auth, input.db, input.authEmailSender))
    .use(
      createBusinessProfileRoutes(
        createBusinessProfileService(
          input.db,
          createLocalBusinessLogoStorage(input.env.BUSINESS_MEDIA_LOCAL_DIRECTORY),
        ),
        resolveTenantContext,
        authorizeTenantAction,
      ),
    )
    .use(
      createCommissionRoutes(
        createCommissionService(input.db),
        resolveTenantContext,
        authorizeTenantAction,
      ),
    )
    .use(createClientRoutes(clientService, resolveTenantContext, authorizeTenantAction))
    .use(
      createCatalogRoutes(
        catalogService,
        resolveTenantContext,
        authorizeTenantAction,
        input.authEmailSender,
        createCatalogAuditWriter(input.db),
      ),
    )
    .use(
      createSchedulingRoutes(
        schedulingService,
        createAvailabilityService(
          input.db,
          guardAvailabilityAppointments,
          input.env.BETTER_AUTH_SECRET,
          hasOpenRevenueCashDay,
        ),
        resolveTenantContext,
        authorizeTenantAction,
        observeBusinessRequest,
      ),
    )
    .use(
      createServiceDeskRoutes(
        serviceDeskService,
        resolveTenantContext,
        authorizeTenantAction,
        observeBusinessRequest,
      ),
    )
    .use(
      createRevenueOperationsRoutes(
        createRevenueOperationsService(input.db, serviceDeskService, input.env.BETTER_AUTH_SECRET),
        resolveTenantContext,
        authorizeTenantAction,
        observeBusinessRequest,
      ),
    )
    .use(
      createReportingRoutes(
        reportingService,
        createReportExportService(input.db, reportDispatcher, artifactStorage),
        resolveTenantContext,
        authorizeTenantAction,
      ),
    )
    .use(createLeadRoutes(input.env, input.pool, { captureAcceptedLead }))
    .use(createAnalyticsRoutes(input.env))
    .all("*", ({ status }) =>
      status(404, { error: { code: "not_found", message: "Route not found." } }),
    )
}
