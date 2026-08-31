import { describe, expect, it, vi } from "vitest"

import { createAnalyticsRoutes } from "../../../src/modules/analytics/http/routes.js"
import type { IdpEnv } from "../../../src/modules/idp/config/env.js"

const env: Pick<IdpEnv, "APP_ENV" | "AUTH_TRUSTED_ORIGINS" | "POSTHOG_UPSTREAM_URL"> = {
  APP_ENV: "test",
  AUTH_TRUSTED_ORIGINS: ["https://site.example.test"],
  POSTHOG_UPSTREAM_URL: "https://us.i.posthog.com",
}

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
          "x-request-id": "request-1",
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
    const response = await app.handle(new Request(`https://api.example.test/e${path}`))

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

    await app.handle(new Request("https://api.example.test/e//evil.example/collect"))

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
      new Request("https://api.example.test/e/e/", { headers: { "x-request-id": "request-2" } }),
    )

    expect(response.status).toBe(401)
    expect(response.headers.get("x-request-id")).toBe("request-2")
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
    const response = await app.handle(new Request("https://api.example.test/e/e/"))

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
      new Request("https://api.example.test/e/e/", { headers: { "x-request-id": "request-3" } }),
    )

    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain("provider secret")
    expect(error).toHaveBeenCalledWith(
      JSON.stringify({ event: "analytics_proxy_failed", request_id: "request-3" }),
    )
    error.mockRestore()
  })

  it("rejects unsupported methods without contacting the provider", async () => {
    const fetch = vi.fn(async (_request: Request) => new Response())
    const app = createAnalyticsRoutes(env, { fetch })
    const response = await app.handle(
      new Request("https://api.example.test/e/e/", { method: "PUT" }),
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
        headers: { "fly-client-ip": "198.51.100.8", "x-real-ip": "203.0.113.99" },
      }),
    )

    const upstream = fetch.mock.calls[0]?.[0] as Request
    expect(upstream.headers.get("x-forwarded-for")).toBe("198.51.100.8")
    expect(upstream.headers.get("x-real-ip")).toBe("198.51.100.8")
  })
})
