import { Elysia } from "elysia"
import { describe, expect, it } from "vitest"

import {
  requestContextMiddleware,
  resolveRequestId,
} from "../../../src/http/middleware/request-context.js"

describe("request context middleware", () => {
  it("accepts safe inbound request IDs", () => {
    const headers = new Headers({ "x-request-id": "req-123" })

    expect(resolveRequestId(headers, () => "generated")).toBe("req-123")
  })

  it("falls back to correlation ID when request ID is unsafe", () => {
    const headers = new Headers({ "x-request-id": "bad id", "x-correlation-id": "corr-123" })

    expect(resolveRequestId(headers, () => "generated")).toBe("corr-123")
  })

  it("echoes x-request-id on the response", async () => {
    const app = new Elysia().use(requestContextMiddleware).get("/", () => ({ ok: true }))

    const response = await app.handle(
      new Request("http://idp.test/", { headers: { "x-request-id": "req-123" } }),
    )

    expect(response.headers.get("x-request-id")).toBe("req-123")
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
