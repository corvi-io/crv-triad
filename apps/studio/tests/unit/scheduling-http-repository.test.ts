import { afterEach, describe, expect, it, vi } from "vitest"
import type { AppointmentInput } from "@/modules/scheduling/contracts"
import {
  createSchedulingCommandClient,
  SchedulingHttpRepository,
  schedulingRequest,
} from "@/modules/scheduling/http-repository"

const input = {
  unitId: "unit-a",
  clientId: "client-a",
  professionalId: "pro-a",
  serviceId: "service-a",
  date: "2026-09-07",
  start: "09:00",
  notes: "PRIVATE_SENTINEL",
  origin: "reception",
  version: 3,
  priceCents: 999,
  durationMinutes: 999,
  status: "completed",
} as AppointmentInput
const response = () =>
  new Response(JSON.stringify({ id: "appointment-a", version: 4 }), {
    headers: { "content-type": "application/json" },
  })
afterEach(() => vi.unstubAllGlobals())
describe("production scheduling HTTP adapter", () => {
  it("uses canonical IDs and versions without submitting client-controlled snapshots or status", async () => {
    const fetch = vi.fn(async () => response())
    vi.stubGlobal("fetch", fetch)
    const repository = new SchedulingHttpRepository()
    await repository.update("appointment-a", input)
    const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain("/api/scheduling/appointments/appointment-a")
    expect(options.credentials).toBe("include")
    expect(JSON.parse(String(options.body))).toEqual({
      unitId: input.unitId,
      clientId: input.clientId,
      professionalId: input.professionalId,
      serviceId: input.serviceId,
      date: input.date,
      start: input.start,
      notes: input.notes,
      origin: input.origin,
      version: 3,
    })
    expect(new Headers(options.headers).get("idempotency-key")).toMatch(/^[a-f0-9-]{36}$/)
  })
  it("reuses a command key after connection loss without manufacturing success", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(response())
    vi.stubGlobal("fetch", fetch)
    const repository = new SchedulingHttpRepository()
    await expect(repository.create(input)).rejects.toMatchObject({ code: "network_error" })
    await repository.create(input)
    expect(fetch.mock.calls[0][1].headers["idempotency-key"]).toBe(
      fetch.mock.calls[1][1].headers["idempotency-key"],
    )
    expect(repository.scenarios()).toEqual([])
  })
  it("provides dedicated reschedule and cancellation commands with explicit reasons", async () => {
    const fetch = vi.fn(async () => response())
    vi.stubGlobal("fetch", fetch)
    const repository = new SchedulingHttpRepository()
    await repository.reschedule("appointment-a", input)
    await repository.cancel("appointment-a", "barbershop", 4, "Bounded note")
    expect(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[0])).toContain(
      "/reschedule",
    )
    expect(
      JSON.parse(String((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body)),
    ).toEqual({ version: 4, cancellationReason: "barbershop", cancellationNote: "Bounded note" })
    await expect(
      repository.transition({ id: "appointment-a", status: "completed", version: 4 }),
    ).rejects.toMatchObject({ code: "invalid_transition" })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it.each([
    400, 401, 403, 404, 409, 500,
  ])("sanitizes HTTP %i without fixture fallback", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: status === 409 ? "appointment_conflict" : "unexpected",
              message: "PRIVATE_SENTINEL",
            }),
            { status },
          ),
      ),
    )
    try {
      await schedulingRequest("/api/scheduling/units")
      throw new Error("Expected failure")
    } catch (error) {
      expect(String(error)).not.toContain("PRIVATE_SENTINEL")
      expect(String(error)).toContain(
        status === 409 ? "Este horário já foi ocupado" : "Não foi possível concluir",
      )
    }
  })
  it("preserves availability receipt keys for ambiguous server failures", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "internal_error" }), { status: 500 }),
      )
      .mockResolvedValueOnce(response())
    vi.stubGlobal("fetch", fetch)
    const command = createSchedulingCommandClient()
    await expect(command("/api/availability/series", { start: "09:00" })).rejects.toMatchObject({
      code: "internal_error",
    })
    await command("/api/availability/series", { start: "09:00" })
    expect(fetch.mock.calls[0][1].headers["idempotency-key"]).toBe(
      fetch.mock.calls[1][1].headers["idempotency-key"],
    )
  })
})
