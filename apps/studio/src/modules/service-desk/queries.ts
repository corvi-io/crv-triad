import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { schedulingQueryKeys } from "@/modules/scheduling/queries"
import type {
  AddServiceItemInput,
  AssignServiceItemProfessionalInput,
  InterruptSessionInput,
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
export function useInterruptSession(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: InterruptSessionInput) => {
    if (!repository.interruptSession) throw new Error("A interrupção não está disponível.")
    return repository.interruptSession(input)
  })
}
export function useFinishServiceItem(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: SessionItemInput) => {
    if (!repository.finishServiceItem)
      throw new Error("A conclusão do serviço não está disponível.")
    return repository.finishServiceItem(input)
  })
}
export function useStartServiceItem(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: SessionItemInput & { professionalId: string }) => {
    if (!repository.startServiceItem) throw new Error("O início do serviço não está disponível.")
    return repository.startServiceItem(input)
  })
}
export function useExtendServiceItem(sessionId: string) {
  const repository = useServiceDeskRepository()
  return useSessionMutation(sessionId, (input: SessionItemInput & { minutes: number }) => {
    if (!repository.extendServiceItem) throw new Error("A extensão não está disponível.")
    return repository.extendServiceItem(input)
  })
}

export function useServiceDeskQueue(query: ServiceDeskQuery) {
  const repository = useServiceDeskRepository()
  return useQuery({
    queryKey: serviceDeskQueryKeys.queue(query),
    queryFn: () => repository.getQueue(query),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
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
export function useAdmitScheduled() {
  const repository = useServiceDeskRepository()
  return useQueueMutation((input: { appointmentId: string; appointmentVersion: number }) => {
    if (!repository.admitScheduled) throw new Error("A admissão agendada não está disponível.")
    return repository.admitScheduled(input.appointmentId, input.appointmentVersion)
  }, true)
}

export function useCallQueueEntry() {
  const repository = useServiceDeskRepository()
  return useQueueMutation((entryId: string) => repository.call(entryId))
}
export function useReturnQueueEntry() {
  const repository = useServiceDeskRepository()
  return useQueueMutation((entryId: string) => {
    if (!repository.returnToWaiting) throw new Error("O retorno à espera não está disponível.")
    return repository.returnToWaiting(entryId)
  })
}
export function useCancelQueueEntry() {
  const repository = useServiceDeskRepository()
  return useQueueMutation((input: { entryId: string; reason: string }) => {
    if (!repository.cancel) throw new Error("O registro de saída não está disponível.")
    return repository.cancel(input.entryId, input.reason)
  }, true)
}

export function useStartQueueEntry() {
  const repository = useServiceDeskRepository()
  return useQueueMutation((input: StartServiceInput) => repository.start(input), true)
}
