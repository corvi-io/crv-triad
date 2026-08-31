import { Elysia } from "elysia"
import type { Pool } from "pg"

import { createAnalyticsRoutes } from "../../modules/analytics/http/routes.js"
import type { IdpEnv } from "../../modules/idp/config/env.js"
import type { IdpDatabase } from "../../modules/idp/database/client.js"
import { createIdpRoutes } from "../../modules/idp/http/app.js"
import type { IdpAuth } from "../../modules/idp/identity/auth.js"
import type { AuthEmailSender } from "../../modules/idp/identity/transactional-email.js"
import { createLeadRoutes } from "../../modules/leads/http/routes.js"

export type CreateRestAppInput = {
  env: IdpEnv
  auth: IdpAuth
  authEmailSender?: AuthEmailSender
  db: IdpDatabase
  pool: Pool
}

export function createRestApp(input: CreateRestAppInput) {
  return new Elysia({ name: "crv-triad-api" })
    .use(createIdpRoutes(input))
    .use(createLeadRoutes(input.env, input.pool))
    .use(createAnalyticsRoutes(input.env))
    .all("*", ({ status }) =>
      status(404, { error: { code: "not_found", message: "Route not found." } }),
    )
}
