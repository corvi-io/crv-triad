import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { schedulingQueryKeys } from "@/modules/scheduling/queries"
import type {
  AddServiceItemInput,
  AssignServiceItemProfessionalInput,
  ServiceDeskQuery,
  SessionItemInput,
  SessionMutationInput,
  StartServiceInput,
  UpdateSessionNotesInput,
  WalkInInput,
} from "./contracts"
import { useServiceDeskRepository } from "./repository-context"

export const serviceDeskQueryKeys = {
  all: ["service-desk"] as const,
  queues: ["service-desk", "queue"] as const,
  queue: (query: ServiceDeskQuery) => [...serviceDeskQueryKeys.queues, query] as const,
  session: (sessionId: string) => [...serviceDeskQueryKeys.all, "session", sessionId] as const,
}

export function useServiceSession(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useQuery({
    queryKey: serviceDeskQueryKeys.session(sessionId),
    queryFn: () => repository.getSession(sessionId),
  })
}

function useSessionMutation<TInput>(
  sessionId: string,
  mutationFn: (input: TInput) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: serviceDeskQueryKeys.session(sessionId) }),
        queryClient.invalidateQueries({ queryKey: serviceDeskQueryKeys.queues }),
      ])
    },
  })
}

export function useAddServiceItem(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: AddServiceItemInput) =>
    repository.addServiceItem(input),
  )
}

export function useRemoveServiceItem(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: SessionItemInput) =>
    repository.removeServiceItem(input),
  )
}

export function useAssignServiceItemProfessional(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: AssignServiceItemProfessionalInput) =>
    repository.assignServiceItemProfessional(input),
  )
}

export function useUpdateSessionNotes(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: UpdateSessionNotesInput) =>
    repository.updateSessionNotes(input),
  )
}

export function useFinishSession(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: SessionMutationInput) =>
    repository.finishSession(input),
  )
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
