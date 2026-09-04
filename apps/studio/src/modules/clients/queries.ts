import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ClientInput, ClientListQuery, ClientScenarioId, NoteInput } from "./contracts"
import { useClientRepository } from "./repository-context"

export const clientQueryKeys = {
  all: ["clients"] as const,
  detail: (id: string, scenarioId: ClientScenarioId) =>
    [...clientQueryKeys.all, "detail", scenarioId, id] as const,
  list: (query: ClientListQuery) => [...clientQueryKeys.all, "list", query] as const,
  tags: (scenarioId: ClientScenarioId) => [...clientQueryKeys.all, "tags", scenarioId] as const,
}

export function useClients(query: ClientListQuery) {
  const repository = useClientRepository()
  return useQuery({ queryKey: clientQueryKeys.list(query), queryFn: () => repository.list(query) })
}

export function useClient(id: string | null, scenarioId: ClientScenarioId) {
  const repository = useClientRepository()
  return useQuery({
    enabled: Boolean(id),
    queryKey: clientQueryKeys.detail(id ?? "", scenarioId),
    queryFn: () => repository.get(id ?? "", scenarioId),
  })
}

export function useClientTags(scenarioId: ClientScenarioId) {
  const repository = useClientRepository()
  return useQuery({
    queryKey: clientQueryKeys.tags(scenarioId),
    queryFn: () => repository.listTags(scenarioId),
  })
}

function useClientMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientQueryKeys.all }),
  })
}

export function useCreateClient() {
  const repository = useClientRepository()
  return useClientMutation((input: ClientInput) => repository.create(input))
}

export function useUpdateClient() {
  const repository = useClientRepository()
  return useClientMutation(
    ({ id, input, version }: { id: string; input: ClientInput; version: number }) =>
      repository.update(id, input, version),
  )
}

export function useSetClientArchived() {
  const repository = useClientRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ archived, id, version }: { archived: boolean; id: string; version: number }) =>
      repository.setArchived(id, archived, version),
    onMutate: async ({ archived, id }) => {
      await queryClient.cancelQueries({ queryKey: clientQueryKeys.all })
      const snapshot = queryClient.getQueriesData({ queryKey: clientQueryKeys.all })
      queryClient.setQueriesData({ queryKey: clientQueryKeys.all }, (current: unknown) =>
        updateCachedClient(current, id, { status: archived ? "archived" : "active" }),
      )
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.snapshot ?? []) queryClient.setQueryData(key, value)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: clientQueryKeys.all }),
  })
}

export function useAddClientNote() {
  const repository = useClientRepository()
  return useClientMutation(({ clientId, input }: { clientId: string; input: NoteInput }) =>
    repository.addNote(clientId, input),
  )
}

export function useUpdateClientNote() {
  const repository = useClientRepository()
  return useClientMutation(
    ({
      clientId,
      input,
      noteId,
      version,
    }: {
      clientId: string
      input: NoteInput
      noteId: string
      version: number
    }) => repository.updateNote(clientId, noteId, input, version),
  )
}

export function useRemoveClientNote() {
  const repository = useClientRepository()
  return useClientMutation(
    ({ clientId, noteId, version }: { clientId: string; noteId: string; version: number }) =>
      repository.removeNote(clientId, noteId, version),
  )
}

function updateCachedClient(current: unknown, id: string, update: Record<string, unknown>) {
  if (!current || typeof current !== "object") return current
  if ("id" in current && current.id === id) return { ...current, ...update }
  if ("items" in current && Array.isArray(current.items)) {
    return {
      ...current,
      items: current.items.map((item) => (item?.id === id ? { ...item, ...update } : item)),
    }
  }
  return current
}
