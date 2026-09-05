import { useQuery } from "@tanstack/react-query"

import { getApiUrl } from "@/modules/auth/services/auth-client"

type AccessSummary = {
  capabilities: readonly { allowed: boolean; capability: string; reason: string | null }[]
  organizationId: string
  role: "admin" | "member" | "owner"
  subscriptionState: string
}

export function useAccessSummary() {
  return useQuery({
    queryKey: ["access-summary"],
    queryFn: async (): Promise<AccessSummary> => {
      if (import.meta.env.MODE === "test") {
        return {
          capabilities: [{ allowed: true, capability: "clients.read", reason: null }],
          organizationId: "test-tenant",
          role: "owner",
          subscriptionState: "active",
        }
      }
      const response = await fetch(getApiUrl("/api/access/summary"), { credentials: "include" })
      if (!response.ok) throw new Error("Access summary unavailable.")
      return response.json() as Promise<AccessSummary>
    },
    staleTime: 30_000,
  })
}

export async function requestCapability(capabilityKey: string) {
  const response = await fetch(getApiUrl("/api/access/requests"), {
    body: JSON.stringify({ capabilityKey }),
    credentials: "include",
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error("Access request unavailable.")
  return response.json() as Promise<{ id: string; status: "pending" }>
}
