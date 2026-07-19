import { describe, expect, expectTypeOf, it } from "vitest"
import { MemoryScenarioEngine } from "@/dev/mock-engine"
import type { SandboxRepository } from "@/dev/sandbox/module/contracts"
import { SandboxMemoryRepository } from "@/dev/sandbox/module/memory-repository"
import { sandboxScenarios } from "@/dev/sandbox/module/seeds"

function createRepository() {
  return new SandboxMemoryRepository(new MemoryScenarioEngine(sandboxScenarios, "default"))
}

describe("SandboxMemoryRepository", () => {
  it("implements the module-owned async repository port", () => {
    expectTypeOf(createRepository()).toMatchTypeOf<SandboxRepository>()
    expectTypeOf(createRepository().list).returns.toEqualTypeOf<
      ReturnType<SandboxRepository["list"]>
    >()
  })

  it("searches, filters, sorts, and paginates behind the repository boundary", async () => {
    const page = await createRepository().list({
      page: 1,
      pageSize: 10,
      search: "Registro",
      state: "paused",
      sort: { field: "title", direction: "desc" },
    })
    expect(page.items).toHaveLength(8)
    expect(page.items[0].title).toBe("Registro 022")
    expect(page.totalCount).toBe(8)
    expect(page.totalPages).toBe(1)
  })

  it("supports isolated CRUD without mutating another repository", async () => {
    const first = createRepository()
    const second = createRepository()
    const created = await first.create({
      title: "Registro novo",
      summary: "Resumo",
      state: "active",
    })
    expect(created.id).toBe("record-0025")
    await first.update(created.id, {
      title: "Registro editado",
      summary: "Resumo",
      state: "paused",
    })
    expect((await first.get(created.id))?.title).toBe("Registro editado")
    await first.delete(created.id)
    expect(await first.get(created.id)).toBeUndefined()
    expect(
      (
        await second.list({
          page: 1,
          pageSize: 10,
          search: "",
          state: "all",
          sort: { field: "title", direction: "asc" },
        })
      ).totalCount,
    ).toBe(24)
  })

  it("keeps fixed-seed scenarios reproducible", () => {
    const first = new MemoryScenarioEngine(sandboxScenarios, "large").values()
    const second = new MemoryScenarioEngine(sandboxScenarios, "large").values()
    expect(first).toEqual(second)
    expect(first).toHaveLength(500)
  })
})
