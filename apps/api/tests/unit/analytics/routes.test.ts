import { describe, expect, it, vi } from "vitest"

import { createAnalyticsRoutes } from "../../../src/modules/analytics/http/routes.js"
import type { IdpEnv } from "../../../src/modules/idp/config/env.js"

const env: Pick<IdpEnv, "APP_ENV" | "AUTH_TRUSTED_ORIGINS" | "POSTHOG_UPSTREAM_URL"> = {
  APP_ENV: "test",
  AUTH_TRUSTED_ORIGINS: ["https://site.example.test"],
  POSTHOG_UPSTREAM_URL: "https://us.i.posthog.com",
}
const trustedHeaders = { origin: "https://site.example.test" }
const requestId = "01990a13-6d57-7000-8000-000000000001"

describe("analytics proxy routes", () => {
  it("forwards ingestion through the fixed origin without browser credentials", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response(null, { status: 204 }))
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/e/?ip=1", {
        method: "POST",
        body: "payload",
        headers: {
          authorization: "Bearer private",
          cookie: "session=private",
          "content-type": "text/plain",
          host: "api.example.test",
          origin: "https://site.example.test",
          "x-real-ip": "203.0.113.10",
          "x-request-id": requestId,
        },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get("access-control-allow-origin")).toBe("https://site.example.test")
    const upstream = fetch.mock.calls[0]?.[0] as Request
    expect(upstream.url).toBe("https://us.i.posthog.com/e/?ip=1")
    expect(upstream.headers.get("host")).toBe("us.i.posthog.com")
    expect(upstream.headers.get("x-forwarded-host")).toBe("api.example.test")
    expect(upstream.headers.get("x-forwarded-for")).toBe("203.0.113.10")
    expect(upstream.headers.has("authorization")).toBe(false)
    expect(upstream.headers.has("cookie")).toBe(false)
    expect(await upstream.text()).toBe("payload")
  })

  it.each([
    "/static/chunk.js",
    "/array/config.js",
  ])("routes asset path %s through the regional asset origin", async (path) => {
    const fetch = vi.fn(
      async (_request: Request) =>
        new Response("asset", {
          headers: {
            "content-encoding": "gzip",
            "content-type": "application/javascript",
            "set-cookie": "provider=private",
          },
        }),
    )
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request(`https://api.example.test/e${path}`, { headers: trustedHeaders }),
    )

    const upstream = fetch.mock.calls[0]?.[0] as Request
    expect(upstream.url).toBe(`https://us-assets.i.posthog.com${path}`)
    expect(response.headers.get("content-type")).toBe("application/javascript")
    expect(response.headers.has("content-encoding")).toBe(false)
    expect(response.headers.has("set-cookie")).toBe(false)
    expect(await response.text()).toBe("asset")
  })

  it("keeps protocol-relative paths on the allowlisted upstream", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response(null, { status: 204 }))
    const app = createAnalyticsRoutes(env, { fetch })

    await app.handle(
      new Request("https://api.example.test/e//evil.example/collect", { headers: trustedHeaders }),
    )

    const upstream = fetch.mock.calls[0]?.[0] as Request
    expect(new URL(upstream.url).origin).toBe("https://us.i.posthog.com")
    expect(new URL(upstream.url).pathname).toBe("//evil.example/collect")
  })

  it("sanitizes upstream error bodies", async () => {
    const fetch = vi.fn(
      async (_request: Request) => new Response("provider secret", { status: 401 }),
    )
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/e/", {
        headers: { ...trustedHeaders, "x-request-id": requestId },
      }),
    )

    expect(response.status).toBe(401)
    expect(response.headers.get("x-request-id")).toBe(requestId)
    expect(await response.text()).toBe(
      JSON.stringify({
        error: { code: "analytics_upstream_rejected", message: "Analytics service unavailable." },
      }),
    )
  })

  it("does not expose upstream redirects to the browser", async () => {
    const fetch = vi.fn(
      async (_request: Request) =>
        new Response(null, { status: 302, headers: { location: "https://evil.example/collect" } }),
    )
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/e/", { headers: trustedHeaders }),
    )

    expect(response.status).toBe(502)
    expect(response.headers.has("location")).toBe(false)
  })

  it("returns and logs only safe correlation data when the upstream is unavailable", async () => {
    const fetch = vi.fn(async (_request: Request) => {
      throw new Error("provider secret")
    })
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/e/", {
        headers: { ...trustedHeaders, "x-request-id": requestId },
      }),
    )

    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain("provider secret")
    expect(error).toHaveBeenCalledWith(
      JSON.stringify({ event: "analytics_proxy_failed", request_id: requestId }),
    )
    error.mockRestore()
  })

  it("rejects unsupported methods without contacting the provider", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response())
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/e/", { method: "PUT", headers: trustedHeaders }),
    )

    expect(response.status).toBe(405)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("answers trusted preflight requests without contacting the provider", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response())
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/e/", {
        method: "OPTIONS",
        headers: {
          origin: "https://site.example.test",
          "access-control-request-headers": "content-type",
        },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get("access-control-allow-origin")).toBe("https://site.example.test")
    expect(response.headers.get("access-control-allow-headers")).toBe("content-type")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("trusts only the platform client address outside local and test environments", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response(null, { status: 204 }))
    const app = createAnalyticsRoutes({ ...env, APP_ENV: "production" }, { fetch })
    await app.handle(
      new Request("https://api.example.test/e/e/", {
        headers: {
          ...trustedHeaders,
          "fly-client-ip": "198.51.100.8",
          "x-real-ip": "203.0.113.99",
        },
      }),
    )

    const upstream = fetch.mock.calls[0]?.[0] as Request
    expect(upstream.headers.get("x-forwarded-for")).toBe("198.51.100.8")
    expect(upstream.headers.get("x-real-ip")).toBe("198.51.100.8")
  })

  it("rejects untrusted and missing browser sources before contacting the provider", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response())
    const app = createAnalyticsRoutes(env, { fetch })

    const untrusted = await app.handle(
      new Request("https://api.example.test/e/e/", {
        headers: { origin: "https://evil.example" },
      }),
    )
    const missing = await app.handle(new Request("https://api.example.test/e/e/"))

    expect(untrusted.status).toBe(403)
    expect(missing.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("accepts a trusted referrer when the browser omits Origin for an asset", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response("asset"))
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/static/chunk.js", {
        headers: { referer: "https://site.example.test/" },
      }),
    )

    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it("replaces unsafe request IDs before logging", async () => {
    const fetch = vi.fn(async (_request: Request) => {
      throw new Error("unavailable")
    })
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/e/", {
        headers: { ...trustedHeaders, "x-request-id": "private@example.test" },
      }),
    )

    const safeRequestId = response.headers.get("x-request-id")
    expect(safeRequestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(safeRequestId).not.toBe("private@example.test")
    expect(error.mock.calls[0]?.[0]).not.toContain("private@example.test")
    error.mockRestore()
  })

  it("limits request bodies and request frequency before forwarding", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response(null, { status: 204 }))
    let timestamp = 0
    const app = createAnalyticsRoutes(env, {
      fetch,
      maxBodyBytes: 4,
      now: () => timestamp,
      rateLimitMax: 1,
    })
    const oversized = await app.handle(
      new Request("https://api.example.test/e/e/", {
        method: "POST",
        headers: trustedHeaders,
        body: "12345",
      }),
    )

    expect(oversized.status).toBe(413)
    const first = await app.handle(
      new Request("https://api.example.test/e/e/", {
        headers: { ...trustedHeaders, "x-real-ip": "203.0.113.20" },
      }),
    )
    const limited = await app.handle(
      new Request("https://api.example.test/e/e/", {
        headers: { ...trustedHeaders, "x-real-ip": "203.0.113.20" },
      }),
    )

    expect(first.status).toBe(204)
    expect(limited.status).toBe(429)

    timestamp = 60_001
    const afterWindow = await app.handle(
      new Request("https://api.example.test/e/e/", {
        headers: { ...trustedHeaders, "x-real-ip": "203.0.113.20" },
      }),
    )
    expect(afterWindow.status).toBe(204)
  })
})
