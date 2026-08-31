import type { IdentifiedRecord, MockOperation, ScenarioDefinition, ScenarioSnapshot } from "./types"

const MAX_LATENCY_MS = 2_000

export class SimulatedMockFailure extends Error {
  readonly operation: MockOperation

  constructor(operation: MockOperation) {
    super(`Intentional development failure for ${operation}.`)
    this.name = "SimulatedMockFailure"
    this.operation = operation
  }
}

export class MemoryScenarioEngine<TRecord extends IdentifiedRecord> {
  readonly scenarios: readonly ScenarioDefinition<TRecord>[]

  #activeScenario: ScenarioDefinition<TRecord>
  #failureMode: "always" | "never" | "next" = "never"
  #latencyMs = 0
  #records = new Map<string, TRecord>()
  #sequence = 1

  constructor(scenarios: readonly ScenarioDefinition<TRecord>[], initialScenarioId: string) {
    if (scenarios.length === 0) {
      throw new Error("At least one development scenario is required.")
    }

    this.scenarios = scenarios
    const initialScenario = scenarios.find((scenario) => scenario.id === initialScenarioId)
    if (!initialScenario) {
      throw new Error(`Unknown initial scenario: ${initialScenarioId}`)
    }

    this.#activeScenario = initialScenario
    this.#restore(initialScenario)
  }

  get snapshot(): ScenarioSnapshot {
    return {
      failureMode: this.#failureMode,
      latencyMs: this.#latencyMs,
      recordCount: this.#records.size,
      scenarioId: this.#activeScenario.id,
    }
  }

  selectScenario(scenarioId: string) {
    const scenario = this.scenarios.find((candidate) => candidate.id === scenarioId)
    if (!scenario) {
      throw new Error(`Unknown development scenario: ${scenarioId}`)
    }
    this.#activeScenario = scenario
    this.#restore(scenario)
  }

  reset() {
    this.#restore(this.#activeScenario)
  }

  failNext() {
    this.#failureMode = "next"
  }

  setLatency(latencyMs: number) {
    if (!Number.isFinite(latencyMs)) {
      throw new Error("Latency must be a finite number.")
    }
    this.#latencyMs = Math.min(MAX_LATENCY_MS, Math.max(0, Math.round(latencyMs)))
  }

  async execute<TResult>(operation: MockOperation, action: () => TResult): Promise<TResult> {
    const latencyMs = this.#latencyMs
    const shouldFail = this.#failureMode !== "never"
    if (this.#failureMode === "next") {
      this.#failureMode = "never"
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs))
    }

    if (shouldFail) {
      throw new SimulatedMockFailure(operation)
    }

    return action()
  }

  values() {
    return Array.from(this.#records.values(), clone)
  }

  get(id: string) {
    const record = this.#records.get(id)
    return record ? clone(record) : undefined
  }

  create(record: Omit<TRecord, "id">, prefix = "record") {
    let id = `${prefix}-${String(this.#sequence).padStart(4, "0")}`
    while (this.#records.has(id)) {
      this.#sequence += 1
      id = `${prefix}-${String(this.#sequence).padStart(4, "0")}`
    }
    this.#sequence += 1
    const created = { ...record, id } as TRecord
    this.#records.set(id, clone(created))
    return clone(created)
  }

  update(id: string, update: Partial<Omit<TRecord, "id">>) {
    const current = this.#records.get(id)
    if (!current) {
      return undefined
    }
    const next = { ...current, ...update, id } as TRecord
    this.#records.set(id, clone(next))
    return clone(next)
  }

  delete(id: string) {
    return this.#records.delete(id)
  }

  #restore(scenario: ScenarioDefinition<TRecord>) {
    this.#records = new Map(scenario.records.map((record) => [record.id, clone(record)]))
    this.#latencyMs = Math.min(MAX_LATENCY_MS, Math.max(0, scenario.latencyMs ?? 0))
    this.#failureMode = scenario.persistentFailure ? "always" : "never"
    this.#sequence = scenario.records.length + 1
  }
}

function clone<TValue>(value: TValue): TValue {
  return structuredClone(value)
}
