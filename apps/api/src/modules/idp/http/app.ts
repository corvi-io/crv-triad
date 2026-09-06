import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"

import type { IdpEnv } from "../config/env.js"
import type { IdpDatabase } from "../database/client.js"
import type { IdpAuth, InvitationAcceptedObserver } from "../identity/auth.js"
import type { InvitationDisplayContextProvider } from "../identity/invitation-display-context.js"
import { type AuthEmailSender, createAuthEmailSender } from "../identity/transactional-email.js"
import {
  createProfileImageStorage,
  type ProfileImageStorage,
} from "../profile/profile-image-storage.js"
import { createCorsMiddleware } from "./middleware/cors.js"
import { createOpenApiDocument } from "./openapi/app.js"
import { createAuthRoutes } from "./routes/auth.js"
import { createHealthRoutes } from "./routes/health.js"
import { createInvitationRoutes } from "./routes/invitations.js"
import { createProfileImageRoutes } from "./routes/profile-image.js"
import { createReadyRoutes } from "./routes/ready.js"
import { createSessionContextRoutes } from "./routes/session-context.js"
import { createUserRoutes } from "./routes/users.js"

export type CreateIdpRoutesInput = {
  env: IdpEnv
  auth: IdpAuth
  authEmailSender?: AuthEmailSender
  db: IdpDatabase
  onInvitationAccepted?: InvitationAcceptedObserver
  invitationDisplayContext?: InvitationDisplayContextProvider
  profileImageStorage?: ProfileImageStorage
}

export function createIdpRoutes({
  env,
  auth,
  authEmailSender,
  db,
  onInvitationAccepted,
  invitationDisplayContext,
  profileImageStorage,
}: CreateIdpRoutesInput) {
  const app = new Elysia({ name: "idp-routes" })
  const emailSender = authEmailSender ?? createAuthEmailSender(env)

  app
    .use(createCorsMiddleware(env))
    .use(createHealthRoutes())
    .use(createReadyRoutes(db))
    .use(createSessionContextRoutes(auth, db))
    .use(createProfileImageRoutes(auth, db, profileImageStorage ?? createProfileImageStorage(env)))
    .use(createUserRoutes(auth, db))
    .use(
      createInvitationRoutes(auth, db, emailSender, onInvitationAccepted, invitationDisplayContext),
    )
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
