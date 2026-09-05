import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi } from "vitest"
import type { Appointment } from "@/modules/scheduling/contracts"
import { SchedulingHttpRepository } from "@/modules/scheduling/http-repository"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { WorkspaceContextProvider } from "@/modules/workspace/context-provider"

export const location = {
  id: "unit-real",
  name: "Unidade Real",
  timezone: "America/Recife",
  version: 1,
}
export const person = {
  id: "professional-real",
  name: "Pessoa Profissional",
  unitIds: [location.id],
  status: "active",
}
export const offering = {
  id: "service-real",
  name: "Corte Real",
  durationMinutes: 30,
  priceCents: 4500,
  eligibleProfessionalIds: [person.id],
  status: "active",
}
export const customer = {
  id: "client-real",
  name: "Cliente Real",
  phone: "81999999999",
  email: "",
  status: "active",
  version: 1,
  notes: [],
  tags: [],
  appointments: [],
  createdAt: "2026-01-01T00:00:00Z",
  nextAppointmentAt: null,
  lastVisitAt: null,
  preferenceNote: "",
  preferredServices: [],
  unitPreferenceIds: [],
  professionalPreferenceIds: [],
}
export const booking: Appointment = {
  id: "appointment-real",
  clientId: customer.id,
  customerName: customer.name,
  customerPhone: "",
  date: "2026-09-07",
  start: "09:00",
  startsAt: "2026-09-07T12:00:00Z",
  durationMinutes: 30,
  priceCents: 4500,
  notes: "Anotação preservada",
  origin: "reception",
  paymentStatus: "pending",
  professionalId: person.id,
  professionalName: person.name,
  serviceId: offering.id,
  serviceName: offering.name,
  unitId: location.id,
  unitName: location.name,
  timezone: location.timezone,
  status: "scheduled",
  version: 1,
  tags: [],
  events: [
    {
      id: "event-real",
      action: "create",
      actorName: "Recepção",
      createdAt: "2026-09-05T12:00:00Z",
      fromStatus: null,
      toStatus: "scheduled",
      version: 1,
    },
  ],
}
export const series = {
  id: "series-real",
  unitId: location.id,
  professionalId: person.id,
  kind: "available",
  start: "09:00",
  end: "18:00",
  weekdays: ["monday"],
  effectiveFrom: "2026-09-07",
  effectiveUntil: null,
  status: "active",
  version: 1,
  excludedDates: [],
}
export const occurrence = {
  ...series,
  id: "occurrence-real",
  seriesId: series.id,
  date: booking.date,
}
export const range = {
  appointments: [booking],
  occupancies: [],
  availability: [occurrence],
  periods: [],
  professionals: [person],
  professionalOptions: [person],
  services: [offering],
  date: booking.date,
  timezone: location.timezone,
  unitName: location.name,
  startTime: "09:00",
  endTime: "18:00",
}
export type RequestRecord = {
  path: string
  method: string
  body: Record<string, unknown>
  key: string | null
}
export type Handler = (request: RequestRecord) => Response | undefined
export function respond(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  })
}
export function httpFixture(handler?: Handler) {
  const requests: RequestRecord[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost:8000")
      const request = {
        path: url.pathname + url.search,
        method: init?.method ?? "GET",
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
        key: new Headers(init?.headers).get("idempotency-key"),
      }
      requests.push(request)
      const custom = handler?.(request)
      if (custom) return custom
      if (url.pathname === "/api/scheduling/units") return respond([location])
      if (url.pathname === "/api/scheduling/options")
        return respond({ professionals: [person], services: [offering] })
      if (url.pathname === "/api/professionals/options") return respond([person])
      if (url.pathname === "/api/units/options") return respond([location])
      if (url.pathname === "/api/services/options") return respond([offering])
      if (url.pathname === "/api/availability")
        return respond({
          timezone: location.timezone,
          series: [series],
          archived: [],
          occurrences: [occurrence],
        })
      if (url.pathname.startsWith("/api/availability/series")) return respond(series)
      if (url.pathname === "/api/scheduling/range") return respond(range)
      if (["/api/clients", "/api/clients/"].includes(url.pathname))
        return respond({ items: [customer], totalCount: 1, totalPages: 1, page: 1, pageSize: 20 })
      if (url.pathname === "/api/clients/duplicates") return respond([])
      if (url.pathname.startsWith("/api/clients/")) return respond(customer)
      if (url.pathname.includes("/history"))
        return respond({ items: [booking], nextAppointment: booking })
      if (url.pathname.startsWith("/api/scheduling/professionals/")) return respond([booking])
      if (url.pathname === "/api/scheduling/appointments" && request.method === "GET")
        return respond({ items: [booking], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 })
      if (url.pathname.startsWith("/api/scheduling/appointments")) return respond(booking)
      throw new Error(`Unexpected test request: ${request.method} ${url.pathname}`)
    }),
  )
  return requests
}
export function renderProduction(children: ReactNode, manage = true) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  cache.setQueryData(["access-summary"], {
    capabilities: [{ capability: "availability.manage", allowed: manage }],
    role: "owner",
    organizationId: "test-tenant",
    subscriptionState: "active",
  })
  const repository = new SchedulingHttpRepository()
  return {
    ...render(
      <QueryClientProvider client={cache}>
        <WorkspaceContextProvider>
          <SchedulingRepositoryProvider repository={repository}>
            {children}
          </SchedulingRepositoryProvider>
        </WorkspaceContextProvider>
      </QueryClientProvider>,
    ),
    cache,
    repository,
  }
}
