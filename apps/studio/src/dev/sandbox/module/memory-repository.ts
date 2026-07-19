import type { MemoryScenarioEngine } from "@/dev/mock-engine"
import type {
  SandboxListQuery,
  SandboxPage,
  SandboxRecord,
  SandboxRecordInput,
  SandboxRepository,
} from "./contracts"

export class SandboxMemoryRepository implements SandboxRepository {
  private readonly engine: MemoryScenarioEngine<SandboxRecord>

  constructor(engine: MemoryScenarioEngine<SandboxRecord>) {
    this.engine = engine
  }

  list(query: SandboxListQuery): Promise<SandboxPage> {
    return this.engine.execute("list", () => {
      const needle = query.search.trim().toLocaleLowerCase("pt-BR")
      const filtered = this.engine
        .values()
        .filter((record) => query.state === "all" || record.state === query.state)
        .filter(
          (record) =>
            needle.length === 0 ||
            record.title.toLocaleLowerCase("pt-BR").includes(needle) ||
            record.summary.toLocaleLowerCase("pt-BR").includes(needle),
        )
        .sort((left, right) => {
          const compared = left[query.sort.field].localeCompare(right[query.sort.field], "pt-BR")
          return query.sort.direction === "asc" ? compared : -compared
        })
      const totalPages = Math.max(1, Math.ceil(filtered.length / query.pageSize))
      const page = Math.min(Math.max(1, query.page), totalPages)
      const start = (page - 1) * query.pageSize
      return {
        items: filtered.slice(start, start + query.pageSize),
        page,
        pageSize: query.pageSize,
        totalCount: filtered.length,
        totalPages,
      }
    })
  }

  get(id: string) {
    return this.engine.execute("read", () => this.engine.get(id))
  }

  create(input: SandboxRecordInput) {
    return this.engine.execute("create", () =>
      this.engine.create({
        ...input,
        updatedAt: new Date(Date.UTC(2026, 6, 18, 12)).toISOString(),
      }),
    )
  }

  update(id: string, input: SandboxRecordInput) {
    return this.engine.execute("update", () => {
      const record = this.engine.update(id, {
        ...input,
        updatedAt: new Date(Date.UTC(2026, 6, 18, 12)).toISOString(),
      })
      if (!record) {
        throw new Error("Registro não encontrado.")
      }
      return record
    })
  }

  async delete(id: string) {
    await this.engine.execute("delete", () => {
      if (!this.engine.delete(id)) {
        throw new Error("Registro não encontrado.")
      }
    })
  }
}
