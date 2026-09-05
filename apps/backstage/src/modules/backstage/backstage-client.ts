import { getApiUrl } from "@/modules/auth/services/auth-client"

export type Operator = {
  id: string
  role: "system_owner" | "operations" | "support" | "billing"
  status: "active" | "disabled"
}

export type TenantSummary = {
  id: string
  name: string
  status: "active" | "disabled"
  createdAt: string
  memberCount: number
  clientCount: number
  activeUnitCount: number
  archivedUnitCount: number
  activeProfessionalCount: number
  archivedProfessionalCount: number
  activeServiceCount: number
  archivedServiceCount: number
  subscriptionState: "active" | "expired" | "suspended" | null
  planKey: string | null
  activeClientLimit: number | null
}

export type TenantDetail = TenantSummary & {
  slug: string
  version: number
  updatedAt: string
  activeClientCount: number
  archivedClientCount: number
  ownerName: string | null
  ownerEmail: string | null
}

export class BackstageClientError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null
    throw new BackstageClientError(body?.code ?? "unavailable", response.status)
  }
  return response.json() as Promise<T>
}

export function getOperator(signal?: AbortSignal) {
  return request<Operator>("/api/backstage/me", { signal })
}

export function getTenants(input: { page: number; search: string; signal?: AbortSignal }) {
  const query = new URLSearchParams({ page: String(input.page), pageSize: "20" })
  if (input.search.trim()) query.set("search", input.search.trim())
  return request<{ items: TenantSummary[]; page: number; pageSize: number; totalCount: number }>(
    `/api/backstage/inventory?${query}`,
    { signal: input.signal },
  )
}

export function getTenant(id: string, signal?: AbortSignal) {
  return request<TenantDetail>(`/api/backstage/tenants/${encodeURIComponent(id)}`, { signal })
}

export function createTenant(input: { name: string; ownerEmail: string }) {
  return request<{
    emailDelivery: "failed" | "sent" | "skipped" | null
    id: string
    name: string
    ownerAccess: "active" | "invited"
    slug: string
  }>("/api/backstage/tenants", { body: JSON.stringify(input), method: "POST" })
}

export function updateTenant(input: {
  id: string
  name?: string
  reason: string
  status: "active" | "disabled"
  version: number
}) {
  return request<TenantDetail>(`/api/backstage/tenants/${encodeURIComponent(input.id)}`, {
    body: JSON.stringify({
      name: input.name,
      reason: input.reason,
      status: input.status,
      version: input.version,
    }),
    method: "PATCH",
  })
}

export function createSupportContext(input: {
  durationMinutes: number
  organizationId: string
  reason: string
}) {
  return request<{ credential: string; expiresAt: string; id: string; organizationId: string }>(
    "/api/backstage/support-contexts",
    { body: JSON.stringify(input), method: "POST" },
  )
}

export async function getSupportWorkspace(input: {
  contextId: string
  credential: string
  signal?: AbortSignal
}) {
  const headers = { authorization: `Support ${input.credential}` }
  const [summary, clients] = await Promise.all([
    request<{
      activeClientCount: number
      activeMemberCount: number
      tenant: { id: string; name: string; status: string }
    }>(`/api/backstage/support-contexts/${input.contextId}/tenant-summary`, {
      headers,
      signal: input.signal,
    }),
    request<{ items: readonly { id: string; name: string; status: string }[]; totalCount: number }>(
      `/api/backstage/support-contexts/${input.contextId}/clients?page=1&pageSize=50`,
      { headers, signal: input.signal },
    ),
  ])
  return { clients, summary }
}

export function revokeSupportContext(input: { contextId: string; credential: string }) {
  return request<{ id: string; status: "revoked" }>(
    `/api/backstage/support-contexts/${input.contextId}/revoke`,
    { headers: { authorization: `Support ${input.credential}` }, method: "POST" },
  )
}
