import type { Professional, Service } from "@/modules/scheduling/contracts"
import { schedulingRequest } from "@/modules/scheduling/http-repository"
import type {
  QueueEntry,
  ServiceDeskQuery,
  ServiceDeskRepository,
  ServiceDeskSnapshot,
  ServiceSession,
  WalkInInput,
} from "./contracts"

type Visit = {
  id: string
  version: number
  unitId: string
  unitName: string
  appointmentId?: string | null
  source: "scheduled" | "walk-in"
  status: "waiting" | "called" | "in-service" | "completed" | "canceled"
  customerDisplayName: string
  guestPhone?: string | null
  priority: "normal" | "fit-in"
  requestedServiceId: string
  requestedProfessionalId?: string | null
  arrivedAt: string
  notes: string
  startedAt?: string | null
  finishedAt?: string | null
}
type Item = {
  id: string
  serviceId: string
  serviceName: string
  professionalName?: string | null
  priceCents: number
  professionalId?: string | null
  status: "pending" | "active" | "completed" | "canceled"
  startedAt?: string | null
  finishedAt?: string | null
  plannedEndAt?: string | null
  sequence: number
}
type Options = {
  professionals: readonly Professional[]
  services: readonly Service[]
  unavailableProfessionalIds?: readonly string[]
}
type ClientPage = { items: readonly { id: string; name: string }[]; total?: number }
type QueuePage = { items: Visit[]; nextCursor?: string | null }
type HistoryPage = { items: Visit[]; total: number; page: number; pageSize: number }
const stages: Record<Visit["status"], QueueEntry["stage"] | undefined> = {
  waiting: "waiting",
  called: "called",
  "in-service": "in-service",
  completed: undefined,
  canceled: undefined,
}
export class ServiceDeskHttpRepository implements ServiceDeskRepository {
  readonly #versions = new Map<string, number>()
  readonly #units = new Map<string, { name: string; timezone: string | null }>()
  readonly #retries = new Map<string, string>()
  async #command(
    path: string,
    id: string,
    operationId?: string,
    extra: Record<string, unknown> = {},
    method = "POST",
  ) {
    const expectedVersion = this.#versions.get(id)
    if (!expectedVersion) await this.getSession(id)
    const body = {
      expectedVersion: this.#versions.get(id),
      ...extra,
    }
    const token = JSON.stringify({ path, method, body })
    const idempotencyKey = operationId ?? this.#retries.get(token) ?? crypto.randomUUID()
    this.#retries.set(token, idempotencyKey)
    const result = await schedulingRequest<Visit>(path, {
      method,
      body: { ...body, idempotencyKey },
    })
    this.#retries.delete(token)
    this.#versions.set(id, result.version)
    return result
  }
  async #resolveUnit(requested: string) {
    const units =
      await schedulingRequest<readonly { id: string; name: string; timezone: string | null }[]>(
        "/api/scheduling/units",
      )
    for (const entry of units) this.#units.set(entry.id, entry)
    const selected = units.some(({ id }) => id === requested) ? requested : units[0]?.id
    if (!selected) throw new Error("Nenhuma unidade ativa disponível.")
    return { selected, units }
  }
  async getQueue(query: ServiceDeskQuery): Promise<ServiceDeskSnapshot> {
    const { selected, units } = await this.#resolveUnit(query.unitId)
    const params = new URLSearchParams({ unitId: selected })
    if (query.stage !== "all" && query.stage !== "ready-for-payment")
      params.set("stage", query.stage)
    if (query.search.trim()) params.set("search", query.search.trim())
    if (query.priority !== "all") params.set("priority", query.priority)
    if (query.preference !== "all") params.set("preference", query.preference)
    if (query.professionalId !== "all") params.set("professionalId", query.professionalId)
    const [result, arrivals, options, clients, history] = await Promise.all([
      this.#allQueuePages(params),
      this.#allArrivalPages(selected),
      schedulingRequest<Options>(`/api/scheduling/options?unitId=${encodeURIComponent(selected)}`),
      this.#allClientPages(),
      schedulingRequest<HistoryPage>(
        `/api/service-desk/history?unitId=${encodeURIComponent(selected)}&page=${query.historyPage ?? 1}&pageSize=10`,
      ),
    ])
    const entries = result.items
      .map((visit) => {
        this.#versions.set(visit.id, visit.version)
        return this.#entry(visit)
      })
      .filter((entry): entry is QueueEntry => Boolean(entry))
    return {
      entries,
      clients: clients.items,
      history: history.items.map((visit) => ({
        id: visit.id,
        customerName: visit.customerDisplayName,
        finishedAt: visit.finishedAt ?? visit.arrivedAt,
        status: visit.status === "completed" ? "completed" : "canceled",
      })),
      historyPage: history.page,
      historyPageSize: history.pageSize,
      historyTotal: history.total,
      arrivals: arrivals.items,
      now: new Date().toISOString(),
      professionals: options.professionals,
      services: options.services,
      unavailableProfessionalIds: options.unavailableProfessionalIds ?? [],
      unitId: selected,
      unitName: this.#units.get(selected)?.name ?? "Unidade",
      unitTimezone: this.#units.get(selected)?.timezone ?? null,
      units,
    }
  }
  async #allQueuePages(params: URLSearchParams) {
    const items: Visit[] = []
    let cursor: string | null | undefined
    do {
      const pageParams = new URLSearchParams(params)
      if (cursor) pageParams.set("cursor", cursor)
      const page = await schedulingRequest<QueuePage>(`/api/service-desk/visits?${pageParams}`)
      items.push(...page.items)
      cursor = page.nextCursor
    } while (cursor)
    return { items }
  }
  async #allClientPages() {
    const items: { id: string; name: string }[] = []
    let page = 1
    let total = Number.POSITIVE_INFINITY
    while (items.length < total) {
      const result = await schedulingRequest<ClientPage>(
        `/api/clients/?contact=all&duplicate=all&page=${page}&pageSize=50&search=&sortDirection=asc&sortBy=name&status=active&tag=`,
      )
      items.push(...result.items)
      total = result.total ?? items.length
      if (result.items.length === 0) break
      page += 1
    }
    return { items }
  }
  async #allArrivalPages(unitId: string) {
    const items: NonNullable<ServiceDeskSnapshot["arrivals"]>[number][] = []
    let cursor: string | null | undefined
    do {
      const params = new URLSearchParams({ unitId })
      if (cursor) params.set("cursor", cursor)
      const result = await schedulingRequest<{
        items: NonNullable<ServiceDeskSnapshot["arrivals"]>
        nextCursor?: string | null
      }>(`/api/service-desk/arrivals?${params}`)
      items.push(...result.items)
      cursor = result.nextCursor
    } while (cursor)
    return { items }
  }
  #entry(visit: Visit): QueueEntry | undefined {
    const stage = stages[visit.status]
    if (!stage) return undefined
    return {
      id: visit.id,
      sessionId: visit.status === "in-service" ? visit.id : undefined,
      appointmentId: visit.appointmentId ?? undefined,
      arrivalAt: visit.arrivedAt,
      customerName: visit.customerDisplayName,
      customerPhone: visit.guestPhone ?? undefined,
      preferenceKind: visit.requestedProfessionalId ? "specific" : "first-available",
      priority: visit.priority,
      professionalId: visit.requestedProfessionalId ?? undefined,
      serviceId: visit.requestedServiceId,
      source: visit.source,
      stage,
      unitId: visit.unitId,
      notes: visit.notes,
      version: visit.version,
    }
  }
  #activeEntry(visit: Visit) {
    const entry = this.#entry(visit)
    if (!entry) throw new Error("O atendimento não está mais na fila ativa.")
    return entry
  }
  async addWalkIn(input: WalkInInput) {
    const token = JSON.stringify(input)
    const idempotencyKey = this.#retries.get(token) ?? crypto.randomUUID()
    this.#retries.set(token, idempotencyKey)
    const result = await schedulingRequest<Visit>("/api/service-desk/visits/walk-ins", {
      method: "POST",
      body: {
        unitId: input.unitId,
        clientId: input.clientId,
        guestName: input.clientId ? undefined : input.customerName,
        guestPhone: input.clientId ? undefined : input.customerPhone,
        serviceId: input.serviceId,
        professionalId: input.professionalId,
        priority: input.priority,
        arrivedAt: input.arrivalAt,
        notes: input.notes ?? "",
        idempotencyKey,
      },
    })
    this.#retries.delete(token)
    this.#versions.set(result.id, result.version)
    return this.#activeEntry(result)
  }
  async admitScheduled(appointmentId: string, appointmentVersion: number) {
    const token = `admit:${appointmentId}:${appointmentVersion}`
    const idempotencyKey = this.#retries.get(token) ?? crypto.randomUUID()
    this.#retries.set(token, idempotencyKey)
    const result = await schedulingRequest<Visit>(
      `/api/service-desk/arrivals/${encodeURIComponent(appointmentId)}/admit`,
      { method: "POST", body: { appointmentVersion, idempotencyKey } },
    )
    this.#retries.delete(token)
    this.#versions.set(result.id, result.version)
    return this.#activeEntry(result)
  }
  async call(entryId: string) {
    return this.#activeEntry(
      await this.#command(`/api/service-desk/visits/${encodeURIComponent(entryId)}/call`, entryId),
    )
  }
  async returnToWaiting(entryId: string) {
    return this.#activeEntry(
      await this.#command(
        `/api/service-desk/visits/${encodeURIComponent(entryId)}/return-to-waiting`,
        entryId,
      ),
    )
  }
  async cancel(entryId: string, reason: string) {
    const visit = await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(entryId)}/cancel`,
      entryId,
      undefined,
      { reason },
    )
    const entry = this.#entry({ ...visit, status: "waiting" })
    if (!entry) throw new Error("A saída não pôde ser projetada.")
    return entry
  }
  async start(input: { entryId: string; professionalId?: string }) {
    if (!input.professionalId) throw new Error("Selecione um profissional.")
    return this.#activeEntry(
      await this.#command(
        `/api/service-desk/visits/${encodeURIComponent(input.entryId)}/start`,
        input.entryId,
        undefined,
        { professionalId: input.professionalId },
      ),
    )
  }
  async getSession(id: string): Promise<ServiceSession> {
    const visit = await schedulingRequest<Visit & { items: Item[] }>(
      `/api/service-desk/visits/${encodeURIComponent(id)}`,
    )
    this.#versions.set(id, visit.version)
    const options = await schedulingRequest<Options>(
      `/api/scheduling/options?unitId=${encodeURIComponent(visit.unitId)}`,
    )
    return {
      id,
      version: visit.version,
      appointmentId: visit.appointmentId ?? undefined,
      customerName: visit.customerDisplayName,
      queueEntryId: id,
      source: visit.source,
      unitId: visit.unitId,
      unitName: visit.unitName,
      startedAt: visit.startedAt ?? visit.arrivedAt,
      finishedAt: visit.finishedAt ?? undefined,
      status:
        visit.status === "completed"
          ? "ready-for-payment"
          : visit.status === "canceled"
            ? "canceled"
            : "in-progress",
      notes: visit.notes,
      now: new Date().toISOString(),
      professionals: options.professionals,
      services: options.services,
      unavailableProfessionalIds: options.unavailableProfessionalIds ?? [],
      items: visit.items
        .filter(({ status }) => status !== "canceled")
        .map((item) => ({
          id: item.id,
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          professionalName: item.professionalName ?? undefined,
          priceCents: item.priceCents,
          professionalId: item.professionalId ?? "",
          source: item.sequence === 1 ? "initial" : "added",
          status: item.status,
          addedAt: item.startedAt ?? visit.arrivedAt,
          plannedEndAt: item.plannedEndAt ?? undefined,
          startedAt: item.startedAt ?? undefined,
          finishedAt: item.finishedAt ?? undefined,
        })),
    }
  }
  async addServiceItem(input: {
    sessionId: string
    operationId: string
    serviceId: string
    professionalId: string
  }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/items`,
      input.sessionId,
      input.operationId,
      { serviceId: input.serviceId, professionalId: input.professionalId },
    )
    return this.getSession(input.sessionId)
  }
  async removeServiceItem(input: { sessionId: string; itemId: string; operationId: string }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/items/${encodeURIComponent(input.itemId)}/remove`,
      input.sessionId,
      input.operationId,
    )
    return this.getSession(input.sessionId)
  }
  async assignServiceItemProfessional(input: {
    sessionId: string
    itemId: string
    professionalId: string
    operationId: string
  }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/items/${encodeURIComponent(input.itemId)}/assign`,
      input.sessionId,
      input.operationId,
      { professionalId: input.professionalId },
    )
    return this.getSession(input.sessionId)
  }
  async updateSessionNotes(input: { sessionId: string; notes: string; operationId: string }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/notes`,
      input.sessionId,
      input.operationId,
      { notes: input.notes },
      "PATCH",
    )
    return this.getSession(input.sessionId)
  }
  async finishSession(input: { sessionId: string; operationId: string }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/finish`,
      input.sessionId,
      input.operationId,
    )
    return this.getSession(input.sessionId)
  }
  async interruptSession(input: { sessionId: string; operationId: string; reason: string }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/interrupt`,
      input.sessionId,
      input.operationId,
      { reason: input.reason },
    )
    return this.getSession(input.sessionId)
  }
  async finishServiceItem(input: { sessionId: string; itemId: string; operationId: string }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/items/${encodeURIComponent(input.itemId)}/finish`,
      input.sessionId,
      input.operationId,
    )
    return this.getSession(input.sessionId)
  }
  async startServiceItem(input: {
    sessionId: string
    itemId: string
    professionalId: string
    operationId: string
  }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/items/${encodeURIComponent(input.itemId)}/start`,
      input.sessionId,
      input.operationId,
      { professionalId: input.professionalId },
    )
    return this.getSession(input.sessionId)
  }
  async extendServiceItem(input: {
    sessionId: string
    itemId: string
    minutes: number
    operationId: string
  }) {
    await this.#command(
      `/api/service-desk/visits/${encodeURIComponent(input.sessionId)}/items/${encodeURIComponent(input.itemId)}/extend`,
      input.sessionId,
      input.operationId,
      { minutes: input.minutes },
    )
    return this.getSession(input.sessionId)
  }
  async getPaymentHandoff(): Promise<never> {
    throw new Error("O pagamento será disponibilizado em uma etapa separada.")
  }
  async completePayment(): Promise<never> {
    throw new Error("O pagamento será disponibilizado em uma etapa separada.")
  }
  async reset() {
    throw new Error("No development source is active.")
  }
}
