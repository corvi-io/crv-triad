import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { SandboxListQuery, SandboxRecordInput } from "./contracts"
import { useSandboxRepository } from "./repository-context"

export const sandboxQueryKeys = {
  all: ["development-sandbox-records"] as const,
  list: (query: SandboxListQuery) => [...sandboxQueryKeys.all, "list", query] as const,
}

export function useSandboxRecords(query: SandboxListQuery) {
  const repository = useSandboxRepository()
  return useQuery({
    queryKey: sandboxQueryKeys.list(query),
    queryFn: () => repository.list(query),
  })
}

export function useCreateSandboxRecord() {
  const repository = useSandboxRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SandboxRecordInput) => repository.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sandboxQueryKeys.all }),
  })
}

export function useUpdateSandboxRecord() {
  const repository = useSandboxRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SandboxRecordInput }) =>
      repository.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sandboxQueryKeys.all }),
  })
}

export function useDeleteSandboxRecord() {
  const repository = useSandboxRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sandboxQueryKeys.all }),
  })
}
