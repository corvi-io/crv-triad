import { Elysia } from "elysia"
import type { Pool } from "pg"
import { createTenantActionAuthorizer } from "../../modules/access/application/authorize-tenant-action.js"
import { createOwnershipRoutes } from "../../modules/access/http/ownership-routes.js"
import { createAccessRoutes } from "../../modules/access/http/routes.js"
import { createAnalyticsRoutes } from "../../modules/analytics/http/routes.js"
import { createPostHogLeadCapture } from "../../modules/analytics/lead-capture.js"
import { createBackstageRoutes } from "../../modules/backstage/http/routes.js"
import { createClientService } from "../../modules/clients/application/client-service.js"
import { createDrizzleClientRepository } from "../../modules/clients/database/client-repository.js"
import { createClientRoutes } from "../../modules/clients/http/routes.js"
import type { IdpEnv } from "../../modules/idp/config/env.js"
import type { IdpDatabase } from "../../modules/idp/database/client.js"
import { createIdpRoutes } from "../../modules/idp/http/app.js"
import type { IdpAuth } from "../../modules/idp/identity/auth.js"
import type { AuthEmailSender } from "../../modules/idp/identity/transactional-email.js"
import { createLeadRoutes } from "../../modules/leads/http/routes.js"
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
}

export function createRestApp(input: CreateRestAppInput) {
  const captureAcceptedLead = createPostHogLeadCapture(input.env)
  const clientService = createClientService(createDrizzleClientRepository(input.db))
  const resolveTenantContext = createTenantContextResolver(
    input.auth,
    input.db,
    createTenantMembershipReader(input.db),
  )
  const authorizeTenantAction = createTenantActionAuthorizer(input.db)

  return new Elysia({ name: "crv-triad-api" })
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
    .use(createClientRoutes(clientService, resolveTenantContext, authorizeTenantAction))
    .use(createLeadRoutes(input.env, input.pool, { captureAcceptedLead }))
    .use(createAnalyticsRoutes(input.env))
    .all("*", ({ status }) =>
      status(404, { error: { code: "not_found", message: "Route not found." } }),
    )
}
