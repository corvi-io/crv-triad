export type IdentifiedRecord = { id: string }

export type MockOperation = "create" | "delete" | "list" | "read" | "update"

export type ScenarioDefinition<TRecord extends IdentifiedRecord> = {
  description: string
  id: string
  label: string
  latencyMs?: number
  records: readonly TRecord[]
  persistentFailure?: boolean
}

export type ScenarioSnapshot = {
  failureMode: "always" | "never" | "next"
  latencyMs: number
  recordCount: number
  scenarioId: string
}
