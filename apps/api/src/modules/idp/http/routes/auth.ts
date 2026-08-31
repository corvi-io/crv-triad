import { Elysia } from "elysia"

import type { IdpAuth } from "../../identity/auth.js"

export function createAuthRoutes(auth: IdpAuth) {
  return new Elysia({ name: "auth-routes" }).all("/api/auth/*", ({ request }) =>
    auth.handler(request),
  )
}
