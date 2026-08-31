import { Elysia } from "elysia"

import type { IdpEnv } from "../../idp/config/env.js"

const proxyPrefix = "/e"
const proxyTimeoutMs = 10_000
const proxyMaxBodyBytes = 20 * 1024 * 1024
const proxyRateLimitMax = 600
const proxyRateLimitMaxKeys = 10_000
const proxyRateLimitWindowMs = 60_000
const allowedMethods = "GET,POST,OPTIONS"
const defaultAllowedHeaders = "Content-Type,Content-Encoding"
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const assetOrigins: Record<IdpEnv["POSTHOG_UPSTREAM_URL"], string> = {
  "https://eu.i.posthog.com": "https://eu-assets.i.posthog.com",
  "https://us.i.posthog.com": "https://us-assets.i.posthog.com",
}

type AnalyticsFetch = (request: Request) => Promise<Response>

type AnalyticsRouteDependencies = {
  fetch?: AnalyticsFetch
  maxBodyBytes?: number
  now?: () => number
  rateLimitMax?: number
  timeoutMs?: number
}

export function createAnalyticsRoutes(
  env: Pick<IdpEnv, "APP_ENV" | "AUTH_TRUSTED_ORIGINS" | "POSTHOG_UPSTREAM_URL">,
  dependencies: AnalyticsRouteDependencies = {},
) {
  const fetchUpstream = dependencies.fetch ?? globalThis.fetch
  const maxBodyBytes = dependencies.maxBodyBytes ?? proxyMaxBodyBytes
  const now = dependencies.now ?? Date.now
  const rateLimitMax = dependencies.rateLimitMax ?? proxyRateLimitMax
  const timeoutMs = dependencies.timeoutMs ?? proxyTimeoutMs
  const trustedOrigins = new Set(env.AUTH_TRUSTED_ORIGINS)
  const rateLimits = new Map<string, { count: number; resetAt: number }>()
  let nextRateLimitCleanupAt = 0

  return new Elysia({ name: "analytics-routes" })
    .options(`${proxyPrefix}/*`, ({ request }) => {
      const headers = createCorsHeaders(request, trustedOrigins)
      return new Response(null, { status: 204, headers })
    })
    .all(`${proxyPrefix}/*`, async ({ request }) => {
      if (request.method !== "GET" && request.method !== "POST") {
        return safeErrorResponse(request, trustedOrigins, 405, "method_not_allowed")
      }

      const requestId = resolveRequestId(request)
      if (!hasTrustedRequestSource(request, trustedOrigins)) {
        return safeErrorResponse(
          request,
          trustedOrigins,
          403,
          "analytics_source_forbidden",
          requestId,
        )
      }

      const clientAddress = resolveClientAddress(request, env.APP_ENV)
      const timestamp = now()
      if (timestamp >= nextRateLimitCleanupAt) {
        removeExpiredRateLimits(rateLimits, timestamp)
        nextRateLimitCleanupAt = timestamp + proxyRateLimitWindowMs
      }
      if (isRateLimited(rateLimits, clientAddress ?? "unknown", timestamp, rateLimitMax)) {
        return safeErrorResponse(request, trustedOrigins, 429, "analytics_rate_limited", requestId)
      }

      let requestBody: Uint8Array | undefined
      if (request.method === "POST") {
        try {
          requestBody = await readBoundedBody(request, maxBodyBytes)
        } catch {
          return safeErrorResponse(
            request,
            trustedOrigins,
            413,
            "analytics_payload_too_large",
            requestId,
          )
        }
      }

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
          body: requestBody,
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

function resolveRequestId(request: Request) {
  const candidate = request.headers.get("x-request-id")
  return candidate && requestIdPattern.test(candidate) ? candidate : crypto.randomUUID()
}

function hasTrustedRequestSource(request: Request, trustedOrigins: Set<string>) {
  const origin = request.headers.get("origin")
  if (origin) return trustedOrigins.has(origin)

  const referer = request.headers.get("referer")
  if (!referer) return false
  try {
    return trustedOrigins.has(new URL(referer).origin)
  } catch {
    return false
  }
}

function isRateLimited(
  limits: Map<string, { count: number; resetAt: number }>,
  key: string,
  timestamp: number,
  maximum: number,
) {
  const current = limits.get(key)
  if (!current || timestamp >= current.resetAt) {
    if (!current && limits.size >= proxyRateLimitMaxKeys) {
      const oldestKey = limits.keys().next().value
      if (oldestKey) limits.delete(oldestKey)
    }
    limits.set(key, { count: 1, resetAt: timestamp + proxyRateLimitWindowMs })
    return false
  }
  current.count += 1
  return current.count > maximum
}

function removeExpiredRateLimits(
  limits: Map<string, { count: number; resetAt: number }>,
  timestamp: number,
) {
  for (const [key, value] of limits) {
    if (timestamp >= value.resetAt) limits.delete(key)
  }
}

async function readBoundedBody(request: Request, maximum: number) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maximum) throw new Error("body_too_large")
  if (!request.body) return new Uint8Array()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > maximum) {
      await reader.cancel()
      throw new Error("body_too_large")
    }
    chunks.push(value)
  }

  const body = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
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
  requestId = resolveRequestId(request),
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
