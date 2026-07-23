import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { schedulingQueryKeys } from "@/modules/scheduling/queries"
import type { ServiceDeskQuery, StartServiceInput, WalkInInput } from "./contracts"
import { useServiceDeskRepository } from "./repository-context"

export const serviceDeskQueryKeys = {
  all: ["service-desk"] as const,
  queue: (query: ServiceDeskQuery) => [...serviceDeskQueryKeys.all, "queue", query] as const,
}

export function useServiceDeskQueue(query: ServiceDeskQuery) {
  const repository = useServiceDeskRepository()
  return useQuery({
    queryKey: serviceDeskQueryKeys.queue(query),
    queryFn: () => repository.getQueue(query),
  })
}

function useQueueMutation<TInput>(
  mutationFn: (input: TInput) => Promise<unknown>,
  invalidateScheduling = false,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: serviceDeskQueryKeys.all })
      if (invalidateScheduling) {
        await queryClient.invalidateQueries({ queryKey: schedulingQueryKeys.all })
      }
    },
  })
}

export function useAddWalkIn() {
  const repository = useServiceDeskRepository()
  return useQueueMutation((input: WalkInInput) => repository.addWalkIn(input))
}

export function useCallQueueEntry() {
  const repository = useServiceDeskRepository()
  return useQueueMutation((entryId: string) => repository.call(entryId))
}

export function useStartQueueEntry() {
  const repository = useServiceDeskRepository()
  return useQueueMutation((input: StartServiceInput) => repository.start(input), true)
}
