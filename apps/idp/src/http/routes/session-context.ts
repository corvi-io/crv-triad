import { Elysia } from "elysia"

import type { IdpDatabase } from "../../database/client.js"
import type { IdpAuth } from "../../identity/auth.js"
import { buildSessionContext } from "../../identity/session-context.js"

export function createSessionContextRoutes(auth: IdpAuth, db: IdpDatabase) {
  return new Elysia({ name: "session-context-routes" }).get(
    "/internal/session-context",
    async ({ request, status }) => {
      const sessionContext = await auth.api.getSession({ headers: request.headers })
      if (!sessionContext) {
        return status(401, { error: { code: "unauthorized", message: "Session is required." } })
      }

      const context = await buildSessionContext(db, sessionContext)
      if (!context) {
        return status(403, { error: { code: "forbidden", message: "User is not active." } })
      }

      return context
    },
  )
}
