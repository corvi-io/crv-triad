import { useQuery } from "@tanstack/react-query"
import { getApiUrl } from "@/modules/auth/services/auth-client"

export type ActivationReadiness = {
  canManage: boolean
  completedCount: number
  nextStepId: string | null
  outcome: "schedule_ready" | "setup_required"
  steps: readonly {
    complete: boolean
    description: string
    id: string
    section: string
    title: string
  }[]
  totalCount: number
}

export const activationReadinessKey = ["onboarding", "readiness"] as const

export function useActivationReadiness() {
  return useQuery({
    queryKey: activationReadinessKey,
    queryFn: async (): Promise<ActivationReadiness> => {
      const response = await fetch(getApiUrl("/api/onboarding/readiness"), {
        credentials: "include",
      })
      if (!response.ok) throw new Error("readiness_unavailable")
      return response.json() as Promise<ActivationReadiness>
    },
  })
}
