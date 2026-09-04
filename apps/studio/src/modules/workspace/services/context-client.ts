import { getApiUrl } from "@/modules/auth/services/auth-client"

export type TenantWorkspace = {
  id: string
  logo?: string | null
  name: string
  role: "admin" | "member" | "owner"
}

export type AvailableContexts = {
  activeOrganizationId: string | null
  platform: { id: "platform"; label: string } | null
  status: "available"
  tenants: readonly TenantWorkspace[]
}

export async function listAvailableContexts(signal?: AbortSignal): Promise<AvailableContexts> {
  const response = await fetch(getApiUrl("/api/contexts"), {
    credentials: "include",
    signal,
  })
  if (!response.ok) throw new Error("Workspace contexts unavailable.")
  return response.json() as Promise<AvailableContexts>
}

export async function selectTenantWorkspace(organizationId: string) {
  const response = await fetch(getApiUrl("/api/contexts/active"), {
    body: JSON.stringify({ organizationId }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error("Workspace selection failed.")
  return response.json() as Promise<{
    activeOrganizationId: string
    status: "selected"
  }>
}
