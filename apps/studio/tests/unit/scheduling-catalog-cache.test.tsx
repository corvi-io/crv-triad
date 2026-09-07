import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import type { AvailabilityResult, SetupEntityPage } from "@/modules/barbershop-setup/contracts"
import {
  resetSetupQueries,
  useCopySetupAvailabilityToWeekdays,
  useCreateSetupEntity,
  useSetSetupEntityArchived,
  useUpdateBarbershopProfile,
  useUpdateSetupAvailability,
  useUpdateSetupAvailabilityBatch,
  useUpdateSetupEntity,
} from "@/modules/barbershop-setup/queries"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"
import { activationReadinessKey } from "@/modules/onboarding/readiness"

function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function harness(repository: BarbershopSetupMemoryRepository) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cache}>
      <BarbershopSetupRepositoryProvider repository={repository}>
        {children}
      </BarbershopSetupRepositoryProvider>
    </QueryClientProvider>
  )
  return { cache, wrapper }
}
describe("catalog cache boundaries consumed by scheduling", () => {
  it.each([
    false,
    true,
  ])("rolls back a rejected archive/restore without changing unrelated cached resources, archived=%s", async (archived) => {
    const repository = new BarbershopSetupMemoryRepository(),
      { cache, wrapper } = harness(repository)
    const page = await repository.list({
      kind: "unit",
      scenarioId: "multi-unit",
      page: 1,
      pageSize: 20,
      search: "",
      sort: { field: "name", direction: "asc" },
      status: "all",
    })
    const record = page.items[0],
      key = ["barbershop-setup", "list", "units"]
    cache.setQueryData(key, page)
    cache.setQueryData(["barbershop-setup", "overview"], { completedCount: 2 })
    const pending = deferred<typeof record>()
    vi.spyOn(repository, "setArchived").mockReturnValue(pending.promise)
    const { result } = renderHook(useSetSetupEntityArchived, { wrapper })
    let mutation: Promise<unknown>
    act(() => {
      mutation = result.current
        .mutateAsync({ kind: "unit", id: record.id, archived })
        .catch((error) => error)
    })
    await waitFor(() =>
      expect(cache.getQueryData<SetupEntityPage>(key)?.items[0].status).toBe(
        archived ? "archived" : "active",
      ),
    )
    await act(async () => {
      pending.reject(new Error("Unavailable"))
      await mutation
    })
    expect(cache.getQueryData(key)).toEqual(page)
    expect(cache.getQueryData(["barbershop-setup", "overview"])).toEqual({ completedCount: 2 })
  })
  it("does not restore a previous tenant's snapshot after cache generation changes", async () => {
    const repository = new BarbershopSetupMemoryRepository(),
      { cache, wrapper } = harness(repository)
    const page = await repository.list({
        kind: "unit",
        scenarioId: "single-unit",
        page: 1,
        pageSize: 20,
        search: "",
        sort: { field: "name", direction: "asc" },
        status: "all",
      }),
      record = page.items[0],
      key = ["barbershop-setup", "list", "units"]
    cache.setQueryData(key, page)
    const pending = deferred<typeof record>()
    vi.spyOn(repository, "setArchived").mockReturnValue(pending.promise)
    const { result } = renderHook(useSetSetupEntityArchived, { wrapper })
    let mutation: Promise<unknown>
    act(() => {
      mutation = result.current
        .mutateAsync({ kind: "unit", id: record.id, archived: true })
        .catch((error) => error)
    })
    await waitFor(() =>
      expect(cache.getQueryData<SetupEntityPage>(key)?.items[0].status).toBe("archived"),
    )
    await act(() => resetSetupQueries(cache))
    await act(async () => {
      pending.reject(new Error("Unavailable"))
      await mutation
    })
    expect(cache.getQueryData(key)).toBeUndefined()
  })
  it.each([
    "single",
    "batch",
  ] as const)("rolls back %s availability edits atomically", async (mode) => {
    const repository = new BarbershopSetupMemoryRepository(),
      { cache, wrapper } = harness(repository)
    const projection = await repository.getAvailability({ scenarioId: "single-unit" }),
      record = projection.records[0],
      edited = { ...record, closed: true },
      key = ["barbershop-setup", "availability", "selected"]
    cache.setQueryData(key, projection)
    cache.setQueryData(["barbershop-setup", "overview"], { completedCount: 2 })
    const pending = deferred<never>()
    if (mode === "single")
      vi.spyOn(repository, "updateAvailability").mockReturnValue(pending.promise)
    else vi.spyOn(repository, "updateAvailabilityBatch").mockReturnValue(pending.promise)
    const { result } = renderHook(
      () => ({ single: useUpdateSetupAvailability(), batch: useUpdateSetupAvailabilityBatch() }),
      { wrapper },
    )
    let mutation: Promise<unknown>
    act(() => {
      mutation = (
        mode === "single"
          ? result.current.single.mutateAsync(edited)
          : result.current.batch.mutateAsync({ records: [edited] })
      ).catch((error) => error)
    })
    await waitFor(() =>
      expect(cache.getQueryData<AvailabilityResult>(key)?.records[0].closed).toBe(true),
    )
    await act(async () => {
      pending.reject(new Error("Rejected interval"))
      await mutation
    })
    expect(cache.getQueryData(key)).toEqual(projection)
  })
  it.each([
    "single",
    "batch",
  ] as const)("discards failed %s availability completion from an old tenant generation", async (mode) => {
    const repository = new BarbershopSetupMemoryRepository(),
      { cache, wrapper } = harness(repository)
    const projection = await repository.getAvailability({ scenarioId: "single-unit" }),
      record = projection.records[0],
      key = ["barbershop-setup", "availability", "selected"]
    cache.setQueryData(key, projection)
    const pending = deferred<never>()
    if (mode === "single")
      vi.spyOn(repository, "updateAvailability").mockReturnValue(pending.promise)
    else vi.spyOn(repository, "updateAvailabilityBatch").mockReturnValue(pending.promise)
    const { result } = renderHook(
      () => ({ single: useUpdateSetupAvailability(), batch: useUpdateSetupAvailabilityBatch() }),
      { wrapper },
    )
    let mutation: Promise<unknown>
    act(() => {
      mutation = (
        mode === "single"
          ? result.current.single.mutateAsync({ ...record, closed: true })
          : result.current.batch.mutateAsync({ records: [{ ...record, closed: true }] })
      ).catch((error) => error)
    })
    await waitFor(() =>
      expect(cache.getQueryData<AvailabilityResult>(key)?.records[0].closed).toBe(true),
    )
    await act(() => resetSetupQueries(cache))
    await act(async () => {
      pending.reject(new Error("Rejected interval"))
      await mutation
    })
    expect(cache.getQueryData(key)).toBeUndefined()
  })
  it.each([
    false,
    true,
  ])("applies copied weekdays only to the current query generation, reset=%s", async (reset) => {
    const repository = new BarbershopSetupMemoryRepository(),
      { cache, wrapper } = harness(repository)
    const projection = await repository.getAvailability({ scenarioId: "single-unit" }),
      record = projection.records[0],
      key = ["barbershop-setup", "availability", "selected"]
    cache.setQueryData(key, projection)
    const updates = [{ ...record, closed: true }],
      pending = deferred<typeof updates>()
    vi.spyOn(repository, "copyAvailabilityToWeekdays").mockReturnValue(pending.promise)
    const { result } = renderHook(useCopySetupAvailabilityToWeekdays, { wrapper })
    let mutation: Promise<unknown>
    act(() => {
      mutation = result.current.mutateAsync({ source: record, targetIds: [record.id] })
    })
    await waitFor(() => expect(repository.copyAvailabilityToWeekdays).toHaveBeenCalled())
    if (reset) await act(() => resetSetupQueries(cache))
    await act(async () => {
      pending.resolve(updates)
      await mutation
    })
    if (reset) expect(cache.getQueryData(key)).toBeUndefined()
    else expect(cache.getQueryData<AvailabilityResult>(key)?.records[0].closed).toBe(true)
  })
  it("invalidates catalog readers after create and optimistic-version edit", async () => {
    const repository = new BarbershopSetupMemoryRepository(),
      { cache, wrapper } = harness(repository)
    const page = await repository.list({
        kind: "service",
        scenarioId: "single-unit",
        page: 1,
        pageSize: 20,
        search: "",
        sort: { field: "name", direction: "asc" },
        status: "all",
      }),
      record = page.items[0]
    if (record.kind !== "service") throw new Error("Expected service fixture")
    cache.setQueryData(["barbershop-setup", "overview"], {})
    cache.setQueryData(activationReadinessKey, { completedCount: 0 })
    const { result } = renderHook(
      () => ({ create: useCreateSetupEntity(), update: useUpdateSetupEntity() }),
      { wrapper },
    )
    await act(() =>
      result.current.create.mutateAsync({
        kind: "service",
        input: { ...record, name: "Serviço adicional" },
      }),
    )
    expect(cache.getQueryState(["barbershop-setup", "overview"])?.isInvalidated).toBe(true)
    expect(cache.getQueryState(activationReadinessKey)?.isInvalidated).toBe(true)
    await act(() =>
      result.current.update.mutateAsync({
        kind: "service",
        id: record.id,
        version: 1,
        input: { ...record, name: "Serviço atualizado" },
      }),
    )
    expect(
      (
        await repository.list({
          kind: "service",
          scenarioId: "single-unit",
          page: 1,
          pageSize: 20,
          search: "Serviço atualizado",
          sort: { field: "name", direction: "asc" },
          status: "all",
        })
      ).items,
    ).toHaveLength(1)
  })

  it("refreshes onboarding readiness after saving the business profile", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const { cache, wrapper } = harness(repository)
    const profile = (await repository.getCompletion("single-unit")).profile
    cache.setQueryData(activationReadinessKey, { completedCount: 0 })
    const { result } = renderHook(useUpdateBarbershopProfile, { wrapper })

    await act(() => result.current.mutateAsync({ ...profile, displayName: "Barbearia atualizada" }))

    expect(cache.getQueryState(activationReadinessKey)?.isInvalidated).toBe(true)
  })
})
