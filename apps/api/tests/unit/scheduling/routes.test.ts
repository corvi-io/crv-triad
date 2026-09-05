import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { SchedulingError } from "../../../src/modules/availability/domain/time.js"
import { createSchedulingRoutes } from "../../../src/modules/scheduling/http/routes.js"

const tenant = {
  organizationId: "tenant-a",
  actorUserId: "user-a",
  membershipId: "member-a",
  organizationName: "A",
  role: "owner",
}
const resolve = async () => ({ allowed: true, context: tenant })
const allow = async () => ({ allowed: true })
const endpoints = [
  ["GET", "/scheduling/units", "units"],
  ["GET", "/scheduling/options?unitId=u", "options"],
  ["GET", "/availability/summary", "summary"],
  ["GET", "/availability/series/a", "detail"],
  ["POST", "/scheduling/appointments/a/reschedule", "update"],
  ["GET", "/scheduling/range?unitId=u&startDate=2026-09-07&endDate=2026-09-07", "range"],
  ["GET", "/scheduling/appointments?unitId=u&startDate=2026-09-07&endDate=2026-09-07", "page"],
  ["GET", "/scheduling/appointments/a", "detail"],
  ["GET", "/scheduling/professionals/p?date=2026-09-07", "professionalSchedule"],
  ["GET", "/scheduling/clients/c/history", "clientHistory"],
  ["POST", "/scheduling/appointments", "create"],
  ["PATCH", "/scheduling/appointments/a", "update"],
  ["POST", "/scheduling/appointments/a/confirm", "changeStatus"],
  ["POST", "/scheduling/appointments/a/check-in", "changeStatus"],
  ["POST", "/scheduling/appointments/a/cancel", "changeStatus"],
  ["POST", "/scheduling/appointments/a/no-show", "changeStatus"],
  ["GET", "/availability?unitId=u&startDate=2026-09-07&endDate=2026-09-07", "range"],
  ["POST", "/availability/series", "save"],
  ["PATCH", "/availability/series/a", "save"],
  ["PUT", "/availability/units/u/timezone", "timezone"],
] as const
function request(
  method: string,
  path: string,
  body: unknown = { version: 1, scope: "series", timezone: "America/Recife" },
) {
  return new Request(`http://localhost/api${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "idempotency-key": "00000000-0000-4000-8000-000000000000",
      "x-request-id": "qa-request",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  })
}
function app(service: object, authorize = allow, resolver = resolve) {
  return createSchedulingRoutes(
    service as never,
    service as never,
    resolver as never,
    authorize as never,
  )
}
describe("scheduling and availability HTTP boundaries", () => {
  it.each(
    endpoints,
  )("authorizes %s %s before any resource lookup", async (method, path, operation) => {
    const call = vi.fn()
    const response = await app(
      { [operation]: call },
      async () => ({ allowed: false, reason: "insufficient_role" }) as never,
    ).handle(request(method, path))
    expect(response.status).toBe(403)
    expect(call).not.toHaveBeenCalled()
  })
  it.each(endpoints)("rejects anonymous %s %s", async (method, path, operation) => {
    const call = vi.fn()
    const response = await app(
      { [operation]: call },
      allow,
      async () => ({ allowed: false, reason: "unauthenticated" }) as never,
    ).handle(request(method, path))
    expect(response.status).toBe(401)
    expect(call).not.toHaveBeenCalled()
  })
  it.each(endpoints)("scopes %s %s to the resolved tenant", async (method, path, operation) => {
    const call = vi.fn(async () => ({ id: "result", version: 2 }))
    const body = path.includes("/timezone")
      ? { version: 1, timezone: "America/Recife" }
      : path.startsWith("/availability/series/")
        ? { version: 1, scope: "occurrence", date: "2026-09-07", archive: true }
        : { version: 1 }
    const response = await app({ [operation]: call }).handle(request(method, path, body))
    expect(response.status).toBe(
      method === "POST" && path === "/scheduling/appointments" ? 201 : 200,
    )
    expect(call).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(call.mock.calls)).toContain("tenant-a")
  })
  it.each([
    [new SchedulingError("not_found"), 404],
    [new SchedulingError("appointment_conflict", "start"), 409],
    [new SchedulingError("version_conflict"), 409],
    [new SchedulingError("invalid_range"), 400],
    [new z.ZodError([{ code: "custom", message: "PRIVATE_SENTINEL", path: ["start"] }]), 400],
    [new Error("PRIVATE_SENTINEL"), 500],
  ])("returns safe errors and correlation metadata", async (error, status) => {
    const response = await app({
      detail: async () => {
        throw error
      },
    }).handle(request("GET", "/scheduling/appointments/a"))
    expect(response.status).toBe(status)
    const body = await response.text()
    expect(body).not.toContain("PRIVATE_SENTINEL")
    expect(body).toContain("qa-request")
  })
  it("requires optimistic versions and does not expose a generic status transition", async () => {
    const update = vi.fn()
    expect(
      (await app({ update }).handle(request("PATCH", "/scheduling/appointments/a", { version: 0 })))
        .status,
    ).toBe(400)
    expect(update).not.toHaveBeenCalled()
    expect(
      (await app({}).handle(request("POST", "/scheduling/appointments/a/completed"))).status,
    ).toBe(404)
  })
  it("emits only allowlisted diagnostic metadata even when payloads contain sensitive sentinels", async () => {
    const observe = vi.fn()
    const routes = createSchedulingRoutes(
      { range: async () => ({ appointments: [{ notes: "PRIVATE_SENTINEL" }] }) } as never,
      {} as never,
      resolve as never,
      allow as never,
      observe,
    )
    const response = await routes.handle(
      request(
        "GET",
        "/scheduling/range?unitId=u&startDate=2026-09-07&endDate=2026-09-07&search=PRIVATE_SENTINEL",
      ),
    )
    expect(response.status).toBe(200)
    await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1))
    expect(observe.mock.calls[0][0]).toMatchObject({
      event: "scheduling_request",
      route: "/api/scheduling/range",
      organizationId: "tenant-a",
      resultCount: 1,
      rangeDays: 1,
      status: 200,
    })
    expect(JSON.stringify(observe.mock.calls)).not.toContain("PRIVATE_SENTINEL")
  })
})
