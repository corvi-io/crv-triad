import { Elysia } from "elysia"

const safeRequestIdPattern = /^[a-zA-Z0-9._:-]{1,128}$/

export function resolveRequestId(headers: Headers, fallbackId: () => string): string {
  const inboundRequestId = headers.get("x-request-id")
  if (inboundRequestId && safeRequestIdPattern.test(inboundRequestId)) return inboundRequestId

  const inboundCorrelationId = headers.get("x-correlation-id")
  if (inboundCorrelationId && safeRequestIdPattern.test(inboundCorrelationId)) {
    return inboundCorrelationId
  }

  return fallbackId()
}

export const requestContextMiddleware = new Elysia({ name: "request-context" }).onRequest(
  ({ request, set }) => {
    set.headers = {
      "x-request-id": resolveRequestId(request.headers, () => crypto.randomUUID()),
    }
  },
)
