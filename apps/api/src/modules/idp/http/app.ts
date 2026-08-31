import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"

import type { IdpEnv } from "../config/env.js"
import type { IdpDatabase } from "../database/client.js"
import type { IdpAuth } from "../identity/auth.js"
import { type AuthEmailSender, createAuthEmailSender } from "../identity/transactional-email.js"
import { createCorsMiddleware } from "./middleware/cors.js"
import { requestContextMiddleware } from "./middleware/request-context.js"
import { createOpenApiDocument } from "./openapi/app.js"
import { createAuthRoutes } from "./routes/auth.js"
import { createHealthRoutes } from "./routes/health.js"
import { createInvitationRoutes } from "./routes/invitations.js"
import { createReadyRoutes } from "./routes/ready.js"
import { createSessionContextRoutes } from "./routes/session-context.js"
import { createUserRoutes } from "./routes/users.js"

export type CreateIdpRoutesInput = {
  env: IdpEnv
  auth: IdpAuth
  authEmailSender?: AuthEmailSender
  db: IdpDatabase
}

export function createIdpRoutes({ env, auth, authEmailSender, db }: CreateIdpRoutesInput) {
  const app = new Elysia({ name: "idp-routes" })
  const emailSender = authEmailSender ?? createAuthEmailSender(env)

  app
    .use(requestContextMiddleware)
    .use(createCorsMiddleware(env))
    .use(createHealthRoutes())
    .use(createReadyRoutes(db))
    .use(createSessionContextRoutes(auth, db))
    .use(createUserRoutes(auth, db))
    .use(createInvitationRoutes(auth, db, emailSender))
    .use(createAuthRoutes(auth))

  if (env.APP_ENV !== "production") {
    const document = createOpenApiDocument(env.BETTER_AUTH_URL)
    app.use(
      openapi({
        path: "/docs",
        specPath: "/openapi.json",
        provider: "swagger-ui",
        documentation: document as never,
      }),
    )
  }

  return app
}
