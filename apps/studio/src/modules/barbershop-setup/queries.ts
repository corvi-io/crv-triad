import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  AvailabilityQuery,
  AvailabilityResult,
  CopyAvailabilityToWeekdaysInput,
  SetupAvailability,
  SetupEntity,
  SetupEntityInput,
  SetupEntityKind,
  SetupEntityPage,
  SetupListQuery,
  SetupOverview,
  SetupScenarioId,
  UpdateAvailabilityBatchInput,
} from "./contracts"
import { useBarbershopSetupRepository } from "./repository-context"

const queryGenerations = new WeakMap<QueryClient, number>()

function getQueryGeneration(queryClient: QueryClient) {
  return queryGenerations.get(queryClient) ?? 0
}

function isCurrentGeneration(queryClient: QueryClient, generation: number) {
  return getQueryGeneration(queryClient) === generation
}

export const barbershopSetupQueryKeys = {
  all: ["barbershop-setup"] as const,
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
    onMutate: () => ({ generation: getQueryGeneration(queryClient) }),
    onSuccess: (_data, _variables, context) => {
      if (isCurrentGeneration(queryClient, context.generation))
        return queryClient.invalidateQueries({ queryKey: barbershopSetupQueryKeys.all })
    },
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
      const generation = getQueryGeneration(queryClient)
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
      return { generation, snapshots }
    },
    onError: (_error, _variables, context) => {
      if (!context || !isCurrentGeneration(queryClient, context.generation)) return
      for (const [key, value] of context?.snapshots ?? []) queryClient.setQueryData(key, value)
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context && isCurrentGeneration(queryClient, context.generation))
        return queryClient.invalidateQueries({ queryKey: barbershopSetupQueryKeys.all })
    },
  })
}

export function useUpdateSetupAvailability() {
  const repository = useBarbershopSetupRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetupAvailability) => repository.updateAvailability(input),
    onMutate: async (input) => {
      const generation = getQueryGeneration(queryClient)
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
      return { generation, snapshots }
    },
    onError: (_error, _input, context) => {
      if (!context || !isCurrentGeneration(queryClient, context.generation)) return
      for (const [key, value] of context?.snapshots ?? []) queryClient.setQueryData(key, value)
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context && isCurrentGeneration(queryClient, context.generation))
        return queryClient.invalidateQueries({ queryKey: barbershopSetupQueryKeys.all })
    },
  })
}

export function useUpdateSetupAvailabilityBatch() {
  const repository = useBarbershopSetupRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAvailabilityBatchInput) => repository.updateAvailabilityBatch(input),
    onMutate: async ({ records }) => {
      const generation = getQueryGeneration(queryClient)
      await queryClient.cancelQueries({ queryKey: barbershopSetupQueryKeys.all })
      const snapshots = queryClient.getQueriesData<AvailabilityResult>({
        queryKey: barbershopSetupQueryKeys.all,
      })
      const updates = new Map(records.map((record) => [record.id, record]))
      for (const [key, result] of snapshots) {
        if (!result?.records) continue
        queryClient.setQueryData<AvailabilityResult>(key, {
          ...result,
          records: result.records.map((record) => updates.get(record.id) ?? record),
        })
      }
      return { generation, snapshots }
    },
    onError: (_error, _input, context) => {
      if (!context || !isCurrentGeneration(queryClient, context.generation)) return
      for (const [key, value] of context.snapshots) queryClient.setQueryData(key, value)
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context && isCurrentGeneration(queryClient, context.generation))
        return queryClient.invalidateQueries({ queryKey: barbershopSetupQueryKeys.all })
    },
  })
}

export function useCopySetupAvailabilityToWeekdays() {
  const repository = useBarbershopSetupRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CopyAvailabilityToWeekdaysInput) =>
      repository.copyAvailabilityToWeekdays(input),
    onMutate: () => ({ generation: getQueryGeneration(queryClient) }),
    onSuccess: (updates, _input, context) => {
      if (!isCurrentGeneration(queryClient, context.generation)) return
      const updatesById = new Map(updates.map((record) => [record.id, record]))
      for (const [key, result] of queryClient.getQueriesData<AvailabilityResult>({
        queryKey: [...barbershopSetupQueryKeys.all, "availability"],
      })) {
        if (!result) continue
        queryClient.setQueryData<AvailabilityResult>(key, {
          ...result,
          records: result.records.map((record) => updatesById.get(record.id) ?? record),
        })
      }
      return queryClient.invalidateQueries({
        queryKey: [...barbershopSetupQueryKeys.all, "availability"],
      })
    },
  })
}

export async function resetSetupQueries(queryClient: QueryClient) {
  queryGenerations.set(queryClient, getQueryGeneration(queryClient) + 1)
  await queryClient.cancelQueries({ queryKey: barbershopSetupQueryKeys.all })
  queryClient.removeQueries({ queryKey: barbershopSetupQueryKeys.all })
}

export type { SetupOverview }
