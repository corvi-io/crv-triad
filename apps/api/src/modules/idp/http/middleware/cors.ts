import { Elysia } from "elysia"

import type { IdpEnv } from "../../config/env.js"

const allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
const defaultAllowedHeaders = "Authorization,Content-Type,X-Correlation-ID,X-Request-ID"
const exposedHeaders = "X-Request-ID"

type CorsEnv = Pick<IdpEnv, "AUTH_TRUSTED_ORIGINS">

export function createCorsMiddleware(env: CorsEnv) {
  const trustedOrigins = new Set(env.AUTH_TRUSTED_ORIGINS)

  return new Elysia({ name: "cors" }).onRequest(({ request, set }) => {
    const origin = request.headers.get("origin")
    if (!origin || !trustedOrigins.has(origin)) return

    const corsHeaders = createCorsHeaders(origin, request)
    for (const [header, value] of Object.entries(corsHeaders)) {
      set.headers[header] = value
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }
  })
}

function createCorsHeaders(origin: string, request: Request) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": allowedMethods,
    "Access-Control-Allow-Headers":
      request.headers.get("access-control-request-headers") ?? defaultAllowedHeaders,
    "Access-Control-Expose-Headers": exposedHeaders,
    Vary: "Origin, Access-Control-Request-Headers",
  }
}
