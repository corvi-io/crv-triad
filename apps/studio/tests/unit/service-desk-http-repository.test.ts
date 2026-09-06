import { afterEach, describe, expect, it, vi } from "vitest"
import { ServiceDeskHttpRepository } from "@/modules/service-desk/http-repository"

afterEach(() => vi.unstubAllGlobals())
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  })
}
describe("production service desk HTTP adapter", () => {
  it("resolves opaque real unit IDs and composes arrivals, queue and options without fixtures", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/scheduling/units")) return json([{ id: "unit-real", name: "Centro" }])
      if (url.includes("/service-desk/arrivals"))
        return json([
          {
            id: "appointment-real",
            version: 3,
            customerName: "Cliente",
            serviceName: "Corte",
            professionalName: "Ana",
            startsAt: "2026-09-05T12:00:00.000Z",
          },
        ])
      if (url.includes("/scheduling/options")) return json({ professionals: [], services: [] })
      return json({
        items: [
          {
            id: "visit-real",
            version: 2,
            unitId: "unit-real",
            unitName: "Centro",
            source: "walk-in",
            status: "waiting",
            customerDisplayName: "Visitante",
            priority: "normal",
            requestedServiceId: "service-real",
            arrivedAt: "2026-09-05T12:00:00.000Z",
            notes: "",
          },
        ],
      })
    })
    vi.stubGlobal("fetch", fetch)
    const result = await new ServiceDeskHttpRepository().getQueue({
      unitId: "centro",
      stage: "all",
      search: "",
      priority: "all",
      preference: "all",
      professionalId: "all",
      scenarioId: "typical",
    })
    expect(result.unitId).toBe("unit-real")
    expect(result.arrivals).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({ id: "visit-real", version: 2 })
    expect(fetch.mock.calls.some(([url]) => String(url).includes("scenario"))).toBe(false)
  })
  it("keeps the same command key after an unknown network outcome", async () => {
    const bodies: Record<string, unknown>[] = []
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)))
      if (bodies.length === 1) throw new TypeError("lost response")
      return json({
        id: "visit-real",
        version: 1,
        unitId: "unit-real",
        unitName: "Centro",
        source: "walk-in",
        status: "waiting",
        customerDisplayName: "Visitante",
        priority: "normal",
        requestedServiceId: "service-real",
        arrivedAt: "2026-09-05T12:00:00.000Z",
        notes: "",
      })
    })
    vi.stubGlobal("fetch", fetch)
    const repository = new ServiceDeskHttpRepository()
    const input = {
      unitId: "unit-real",
      arrivalAt: "2026-09-05T12:00:00.000Z",
      customerName: "Visitante",
      preferenceKind: "first-available" as const,
      priority: "normal" as const,
      serviceId: "service-real",
    }
    await expect(repository.addWalkIn(input)).rejects.toMatchObject({ code: "network_error" })
    await repository.addWalkIn(input)
    expect(bodies[0].idempotencyKey).toBe(bodies[1].idempotencyKey)
  })

  it("maps queue lifecycle variants, filters and bounded history", async () => {
    const visits = ["waiting", "called", "in-service", "completed", "canceled"].map(
      (status, index) => ({
        id: `visit-${status}`,
        version: index + 1,
        unitId: "unit-real",
        unitName: "Centro",
        appointmentId: index === 0 ? "appointment-real" : null,
        source: index === 0 ? "scheduled" : "walk-in",
        status,
        customerDisplayName: `Cliente ${status}`,
        guestPhone: index === 1 ? "81999999999" : null,
        priority: index === 1 ? "fit-in" : "normal",
        requestedServiceId: "service-real",
        requestedProfessionalId: index === 2 ? "professional-real" : null,
        arrivedAt: "2026-09-05T12:00:00.000Z",
        finishedAt: index > 2 ? "2026-09-05T13:00:00.000Z" : null,
        notes: "",
      }),
    )
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/scheduling/units")) return json([{ id: "unit-real", name: "Centro" }])
      if (url.includes("/service-desk/arrivals")) return json([])
      if (url.includes("/scheduling/options"))
        return json({ professionals: [], services: [], unavailableProfessionalIds: ["busy"] })
      if (url.includes("/api/clients/")) return json({ items: [] })
      if (url.includes("/service-desk/history")) return json({ items: visits.slice(3) })
      return json({ items: visits })
    })
    vi.stubGlobal("fetch", fetch)
    const result = await new ServiceDeskHttpRepository().getQueue({
      unitId: "unit-real",
      stage: "called",
      search: "",
      priority: "all",
      preference: "all",
      professionalId: "all",
      scenarioId: "typical",
    })
    expect(result.entries.map(({ stage }) => stage)).toEqual(["waiting", "called", "in-service"])
    expect(result.entries[0]).toMatchObject({
      appointmentId: "appointment-real",
      source: "scheduled",
    })
    expect(result.entries[1]).toMatchObject({ customerPhone: "81999999999", priority: "fit-in" })
    expect(result.entries[2]).toMatchObject({
      preferenceKind: "specific",
      sessionId: "visit-in-service",
    })
    expect(result.history).toEqual([
      expect.objectContaining({ status: "completed" }),
      expect.objectContaining({ status: "canceled" }),
    ])
    expect(result.unavailableProfessionalIds).toEqual(["busy"])
    expect(fetch.mock.calls.some(([url]) => String(url).includes("stage=called"))).toBe(true)
  })

  it("maps sessions and executes every production command through stable versioned requests", async () => {
    let status: "waiting" | "called" | "in-service" | "completed" | "canceled" = "in-service"
    const methods: string[] = []
    const visit = () => ({
      id: "visit-real",
      version: methods.length + 1,
      unitId: "unit-real",
      unitName: "Centro",
      appointmentId: null,
      source: "walk-in" as const,
      status,
      customerDisplayName: "Visitante",
      priority: "normal" as const,
      requestedServiceId: "service-real",
      requestedProfessionalId: null,
      arrivedAt: "2026-09-05T12:00:00.000Z",
      startedAt: null,
      finishedAt: status === "completed" ? "2026-09-05T13:00:00.000Z" : null,
      notes: "nota",
      items: [
        {
          id: "item-canceled",
          serviceId: "service-real",
          serviceName: "Ignorado",
          priceCents: 100,
          professionalId: null,
          professionalName: null,
          status: "canceled",
          sequence: 2,
        },
        {
          id: "item-real",
          serviceId: "service-real",
          serviceName: "Corte",
          priceCents: 4500,
          professionalId: "professional-real",
          professionalName: "Ana",
          status: "active",
          sequence: 1,
          startedAt: "2026-09-05T12:05:00.000Z",
          plannedEndAt: "2026-09-05T12:35:00.000Z",
        },
      ],
    })
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/scheduling/options"))
        return json({ professionals: [], services: [], unavailableProfessionalIds: [] })
      if (init?.method && init.method !== "GET") methods.push(`${init.method} ${url}`)
      return json(visit())
    })
    vi.stubGlobal("fetch", fetch)
    const repository = new ServiceDeskHttpRepository()
    expect(await repository.getSession("visit-real")).toMatchObject({
      status: "in-progress",
      items: [expect.objectContaining({ source: "initial", professionalName: "Ana" })],
    })
    await repository.call("visit-real")
    await repository.returnToWaiting("visit-real")
    await repository.cancel("visit-real", "Saiu")
    await expect(repository.start({ entryId: "visit-real" })).rejects.toThrow(
      "Selecione um profissional.",
    )
    await repository.start({ entryId: "visit-real", professionalId: "professional-real" })
    await repository.addServiceItem({
      sessionId: "visit-real",
      operationId: "add",
      serviceId: "service-real",
      professionalId: "professional-real",
    })
    await repository.removeServiceItem({
      sessionId: "visit-real",
      itemId: "item-real",
      operationId: "remove",
    })
    await repository.assignServiceItemProfessional({
      sessionId: "visit-real",
      itemId: "item-real",
      professionalId: "professional-real",
      operationId: "assign",
    })
    await repository.updateSessionNotes({
      sessionId: "visit-real",
      notes: "nova",
      operationId: "notes",
    })
    await repository.startServiceItem({
      sessionId: "visit-real",
      itemId: "item-real",
      professionalId: "professional-real",
      operationId: "start-item",
    })
    await repository.finishServiceItem({
      sessionId: "visit-real",
      itemId: "item-real",
      operationId: "finish-item",
    })
    await repository.extendServiceItem({
      sessionId: "visit-real",
      itemId: "item-real",
      minutes: 15,
      operationId: "extend",
    })
    await repository.finishSession({ sessionId: "visit-real", operationId: "finish" })
    status = "completed"
    expect((await repository.getSession("visit-real")).status).toBe("ready-for-payment")
    status = "canceled"
    expect((await repository.getSession("visit-real")).status).toBe("canceled")
    expect(methods).toHaveLength(12)
    await expect(repository.getPaymentHandoff()).rejects.toThrow("etapa separada")
    await expect(repository.completePayment()).rejects.toThrow("etapa separada")
    await expect(repository.reset()).rejects.toThrow("No development source")
  })

  it("consumes queue cursors and every client/history page while forwarding server filters", async () => {
    const urls: string[] = []
    const queueVisit = (id: string) => ({
      id,
      version: 1,
      unitId: "unit-real",
      unitName: "Centro",
      source: "walk-in",
      status: "waiting",
      customerDisplayName: id,
      priority: "fit-in",
      requestedServiceId: "service-real",
      requestedProfessionalId: "professional-real",
      arrivedAt: "2026-09-05T12:00:00.000Z",
      notes: "",
    })
    const fetch = vi.fn(async (url: string) => {
      urls.push(url)
      if (url.includes("/scheduling/units")) return json([{ id: "unit-real", name: "Centro" }])
      if (url.includes("/service-desk/arrivals")) return json([])
      if (url.includes("/scheduling/options")) return json({ professionals: [], services: [] })
      if (url.includes("/api/clients/")) {
        const page = new URL(url).searchParams.get("page")
        return page === "1"
          ? json({ items: [{ id: "client-1", name: "A" }], total: 2 })
          : json({ items: [{ id: "client-2", name: "Z" }], total: 2 })
      }
      if (url.includes("/service-desk/history")) {
        const page = new URL(url).searchParams.get("page")
        return page === "1"
          ? json({
              items: [{ ...queueVisit("history-1"), status: "completed" }],
              total: 2,
              page: 1,
              pageSize: 50,
            })
          : json({
              items: [{ ...queueVisit("history-2"), status: "canceled" }],
              total: 2,
              page: 2,
              pageSize: 50,
            })
      }
      return url.includes("cursor=next")
        ? json({ items: [queueVisit("visit-2")], nextCursor: null })
        : json({ items: [queueVisit("visit-1")], nextCursor: "next" })
    })
    vi.stubGlobal("fetch", fetch)
    const result = await new ServiceDeskHttpRepository().getQueue({
      unitId: "unit-real",
      stage: "waiting",
      search: "Pessoa",
      priority: "fit-in",
      preference: "specific",
      professionalId: "professional-real",
      scenarioId: "typical",
    })
    expect(result.entries).toHaveLength(2)
    expect(result.clients).toHaveLength(2)
    expect(result.history).toHaveLength(2)
    expect(urls.some((url) => url.includes("cursor=next"))).toBe(true)
    const queueUrl = urls.find((url) => url.includes("/service-desk/visits?")) ?? ""
    expect(queueUrl).toContain("search=Pessoa")
    expect(queueUrl).toContain("priority=fit-in")
    expect(queueUrl).toContain("preference=specific")
    expect(queueUrl).toContain("professionalId=professional-real")
  })
})
