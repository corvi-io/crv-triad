import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  AvailabilityQuery,
  AvailabilityResult,
  SetupAvailability,
  SetupEntity,
  SetupEntityInput,
  SetupEntityKind,
  SetupEntityPage,
  SetupListQuery,
  SetupOverview,
  SetupScenarioId,
} from "./contracts"
import { useBarbershopSetupRepository } from "./repository-context"

export const barbershopSetupQueryKeys = {
  all: ["barbershop-setup-presentation"] as const,
  availability: (query: AvailabilityQuery) =>
    [...barbershopSetupQueryKeys.all, "availability", query] as const,
  list: (query: SetupListQuery) => [...barbershopSetupQueryKeys.all, "list", query] as const,
  overview: (scenarioId: SetupScenarioId) =>
    [...barbershopSetupQueryKeys.all, "overview", scenarioId] as const,
}

export function useSetupOverview(scenarioId: SetupScenarioId) {
  const repository = useBarbershopSetupRepository()
  return useQuery({
    queryKey: barbershopSetupQueryKeys.overview(scenarioId),
    queryFn: () => repository.getOverview(scenarioId),
  })
}

export function useSetupEntities(query: SetupListQuery) {
  const repository = useBarbershopSetupRepository()
  return useQuery({
    queryKey: barbershopSetupQueryKeys.list(query),
    queryFn: () => repository.list(query),
  })
}

export function useSetupAvailability(query: AvailabilityQuery) {
  const repository = useBarbershopSetupRepository()
  return useQuery({
    queryKey: barbershopSetupQueryKeys.availability(query),
    queryFn: () => repository.getAvailability(query),
  })
}

function useEntityMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<SetupEntity>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: barbershopSetupQueryKeys.all }),
  })
}

export function useCreateSetupEntity() {
  const repository = useBarbershopSetupRepository()
  return useEntityMutation(({ kind, input }: { kind: SetupEntityKind; input: SetupEntityInput }) =>
    repository.create(kind, input),
  )
}

export function useUpdateSetupEntity() {
  const repository = useBarbershopSetupRepository()
  return useEntityMutation(
    ({ id, input, kind }: { id: string; input: SetupEntityInput; kind: SetupEntityKind }) =>
      repository.update(kind, id, input),
  )
}

export function useSetSetupEntityArchived() {
  const repository = useBarbershopSetupRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      archived,
      id,
      kind,
    }: {
      archived: boolean
      id: string
      kind: SetupEntityKind
    }) => repository.setArchived(kind, id, archived),
    onMutate: async ({ archived, id }) => {
      await queryClient.cancelQueries({ queryKey: barbershopSetupQueryKeys.all })
      const snapshots = queryClient.getQueriesData<SetupEntityPage>({
        queryKey: barbershopSetupQueryKeys.all,
      })
      for (const [key, page] of snapshots) {
        if (!page?.items) continue
        queryClient.setQueryData<SetupEntityPage>(key, {
          ...page,
          items: page.items.map((item) =>
            item.id === id ? { ...item, status: archived ? "archived" : "active" } : item,
          ),
        })
      }
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.snapshots ?? []) queryClient.setQueryData(key, value)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: barbershopSetupQueryKeys.all }),
  })
}

export function useUpdateSetupAvailability() {
  const repository = useBarbershopSetupRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetupAvailability) => repository.updateAvailability(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: barbershopSetupQueryKeys.all })
      const snapshots = queryClient.getQueriesData<AvailabilityResult>({
        queryKey: barbershopSetupQueryKeys.all,
      })
      for (const [key, result] of snapshots) {
        if (!result?.records) continue
        queryClient.setQueryData<AvailabilityResult>(key, {
          ...result,
          records: result.records.map((record) => (record.id === input.id ? input : record)),
        })
      }
      return { snapshots }
    },
    onError: (_error, _input, context) => {
      for (const [key, value] of context?.snapshots ?? []) queryClient.setQueryData(key, value)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: barbershopSetupQueryKeys.all }),
  })
}

export async function resetSetupQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.cancelQueries({ queryKey: barbershopSetupQueryKeys.all })
  queryClient.removeQueries({ queryKey: barbershopSetupQueryKeys.all })
}

export type { SetupOverview }
