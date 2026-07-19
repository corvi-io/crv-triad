export type SandboxRecordState = "active" | "paused"

export type SandboxRecord = {
  id: string
  state: SandboxRecordState
  summary: string
  title: string
  updatedAt: string
}

export type SandboxSort = {
  direction: "asc" | "desc"
  field: "title" | "updatedAt"
}

export type SandboxListQuery = {
  page: number
  pageSize: 10 | 20 | 50
  search: string
  sort: SandboxSort
  state: "all" | SandboxRecordState
}

export type SandboxPage = {
  items: SandboxRecord[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type SandboxRecordInput = Pick<SandboxRecord, "state" | "summary" | "title">

export interface SandboxRepository {
  create(input: SandboxRecordInput): Promise<SandboxRecord>
  delete(id: string): Promise<void>
  get(id: string): Promise<SandboxRecord | undefined>
  list(query: SandboxListQuery): Promise<SandboxPage>
  update(id: string, input: SandboxRecordInput): Promise<SandboxRecord>
}
