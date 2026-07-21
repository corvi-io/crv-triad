import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AppointmentInput, ScheduleDayQuery } from "./contracts"
import { useSchedulingRepository } from "./repository-context"

export const schedulingQueryKeys = {
  all: ["scheduling"] as const,
  day: (query: ScheduleDayQuery) => [...schedulingQueryKeys.all, "day", query] as const,
}

export function useScheduleDay(query: ScheduleDayQuery) {
  const repository = useSchedulingRepository()
  return useQuery({
    queryKey: schedulingQueryKeys.day(query),
    queryFn: () => repository.getDay(query),
  })
}

function useScheduleMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulingQueryKeys.all }),
  })
}

export function useCreateAppointment() {
  const repository = useSchedulingRepository()
  return useScheduleMutation((input: AppointmentInput) => repository.create(input))
}

export function useUpdateAppointment() {
  const repository = useSchedulingRepository()
  return useScheduleMutation(({ id, input }: { id: string; input: AppointmentInput }) =>
    repository.update(id, input),
  )
}

export function useCancelAppointment() {
  const repository = useSchedulingRepository()
  return useScheduleMutation((id: string) => repository.cancel(id))
}

export function useScenarioActions() {
  const repository = useSchedulingRepository()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: schedulingQueryKeys.all })
  return {
    reset: async () => {
      await repository.reset()
      await refresh()
    },
    scenarios: repository.scenarios(),
    select: async (id: string) => {
      await repository.selectScenario(id)
      await refresh()
    },
  }
}
