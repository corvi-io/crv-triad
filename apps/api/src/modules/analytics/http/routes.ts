import { Elysia } from "elysia"

import type { IdpEnv } from "../../idp/config/env.js"

const proxyPrefix = "/e"
const proxyTimeoutMs = 10_000
const allowedMethods = "GET,POST,OPTIONS"
const defaultAllowedHeaders = "Content-Type,Content-Encoding"

const assetOrigins: Record<IdpEnv["POSTHOG_UPSTREAM_URL"], string> = {
  "https://eu.i.posthog.com": "https://eu-assets.i.posthog.com",
  "https://us.i.posthog.com": "https://us-assets.i.posthog.com",
}

type AnalyticsFetch = (request: Request) => Promise<Response>

type AnalyticsRouteDependencies = {
  fetch?: AnalyticsFetch
  timeoutMs?: number
}

export function createAnalyticsRoutes(
  env: Pick<IdpEnv, "APP_ENV" | "AUTH_TRUSTED_ORIGINS" | "POSTHOG_UPSTREAM_URL">,
  dependencies: AnalyticsRouteDependencies = {},
) {
  const fetchUpstream = dependencies.fetch ?? globalThis.fetch
  const timeoutMs = dependencies.timeoutMs ?? proxyTimeoutMs
  const trustedOrigins = new Set(env.AUTH_TRUSTED_ORIGINS)

  return new Elysia({ name: "analytics-routes" })
    .options(`${proxyPrefix}/*`, ({ request }) => {
      const headers = createCorsHeaders(request, trustedOrigins)
      return new Response(null, { status: 204, headers })
    })
    .all(`${proxyPrefix}/*`, async ({ request }) => {
      if (request.method !== "GET" && request.method !== "POST") {
        return safeErrorResponse(request, trustedOrigins, 405, "method_not_allowed")
      }

      const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
      const requestUrl = new URL(request.url)
      const pathname = requestUrl.pathname.slice(proxyPrefix.length) || "/"
      const upstreamOrigin = isAssetPath(pathname)
        ? assetOrigins[env.POSTHOG_UPSTREAM_URL]
        : env.POSTHOG_UPSTREAM_URL
      const upstreamUrl = new URL(upstreamOrigin)
      upstreamUrl.pathname = pathname
      upstreamUrl.search = requestUrl.search

      try {
        const upstreamRequest = new Request(upstreamUrl, {
          method: request.method,
          headers: createUpstreamHeaders(request, upstreamUrl, requestId, env.APP_ENV),
          body: request.method === "POST" ? request.body : undefined,
          duplex: request.method === "POST" ? "half" : undefined,
          redirect: "manual",
          signal: AbortSignal.timeout(timeoutMs),
        } as RequestInit & { duplex?: "half" })
        const upstreamResponse = await fetchUpstream(upstreamRequest)

        if (upstreamResponse.status >= 300) {
          return safeErrorResponse(
            request,
            trustedOrigins,
            upstreamResponse.status >= 400 ? upstreamResponse.status : 502,
            "analytics_upstream_rejected",
            requestId,
          )
        }

        const headers = createResponseHeaders(
          upstreamResponse.headers,
          request,
          trustedOrigins,
          requestId,
        )
        const body = [204, 304].includes(upstreamResponse.status) ? null : upstreamResponse.body
        return new Response(body, { status: upstreamResponse.status, headers })
      } catch {
        console.error(JSON.stringify({ event: "analytics_proxy_failed", request_id: requestId }))
        return safeErrorResponse(
          request,
          trustedOrigins,
          502,
          "analytics_upstream_unavailable",
          requestId,
        )
      }
    })
}

function isAssetPath(pathname: string) {
  return pathname.startsWith("/static/") || pathname.startsWith("/array/")
}

function createUpstreamHeaders(
  request: Request,
  upstreamUrl: URL,
  requestId: string,
  appEnv: IdpEnv["APP_ENV"],
) {
  const headers = new Headers()
  for (const name of [
    "accept",
    "accept-language",
    "content-encoding",
    "content-type",
    "user-agent",
  ]) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const originalHost = request.headers.get("host")
  if (originalHost) headers.set("x-forwarded-host", originalHost)
  const clientAddress = resolveClientAddress(request, appEnv)
  if (clientAddress) {
    headers.set("x-forwarded-for", clientAddress)
    headers.set("x-real-ip", clientAddress)
  }
  headers.set("host", upstreamUrl.host)
  headers.set("x-request-id", requestId)
  return headers
}

function resolveClientAddress(request: Request, appEnv: IdpEnv["APP_ENV"]) {
  if (appEnv !== "local" && appEnv !== "test") {
    return request.headers.get("fly-client-ip")
  }
  return request.headers.get("x-real-ip")
}

function createResponseHeaders(
  upstreamHeaders: Headers,
  request: Request,
  trustedOrigins: Set<string>,
  requestId: string,
) {
  const headers = new Headers(upstreamHeaders)
  for (const name of [
    "access-control-allow-credentials",
    "access-control-allow-headers",
    "access-control-allow-methods",
    "access-control-allow-origin",
    "connection",
    "content-encoding",
    "content-length",
    "set-cookie",
    "transfer-encoding",
  ]) {
    headers.delete(name)
  }
  applyCorsHeaders(headers, request, trustedOrigins)
  headers.set("x-request-id", requestId)
  return headers
}

function safeErrorResponse(
  request: Request,
  trustedOrigins: Set<string>,
  status: number,
  code: string,
  requestId = request.headers.get("x-request-id") ?? crypto.randomUUID(),
) {
  const headers = new Headers({ "content-type": "application/json", "x-request-id": requestId })
  applyCorsHeaders(headers, request, trustedOrigins)
  return new Response(
    JSON.stringify({ error: { code, message: "Analytics service unavailable." } }),
    {
      status,
      headers,
    },
  )
}

function createCorsHeaders(request: Request, trustedOrigins: Set<string>) {
  const headers = new Headers()
  applyCorsHeaders(headers, request, trustedOrigins)
  return headers
}

function applyCorsHeaders(headers: Headers, request: Request, trustedOrigins: Set<string>) {
  const origin = request.headers.get("origin")
  if (!origin || !trustedOrigins.has(origin)) return
  headers.set("access-control-allow-origin", origin)
  headers.set("access-control-allow-methods", allowedMethods)
  headers.set(
    "access-control-allow-headers",
    request.headers.get("access-control-request-headers") ?? defaultAllowedHeaders,
  )
  headers.set("access-control-expose-headers", "X-Request-ID")
  headers.append("vary", "Origin, Access-Control-Request-Headers")
}
