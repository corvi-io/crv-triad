import { describe, expect, it, vi } from "vitest"
import { MemoryScenarioEngine, SimulatedMockFailure } from "@/dev/mock-engine"

type RecordFixture = { id: string; value: string }

const scenarios = [
  {
    id: "default",
    label: "Default",
    description: "Default",
    records: [{ id: "record-0001", value: "A" }],
  },
  { id: "empty", label: "Empty", description: "Empty", records: [] },
] as const

describe("MemoryScenarioEngine", () => {
  it("isolates copies, creates deterministic IDs, and resets the active scenario", () => {
    const engine = new MemoryScenarioEngine<RecordFixture>(scenarios, "default")
    const values = engine.values()
    values[0].value = "changed outside"

    expect(engine.values()).toEqual([{ id: "record-0001", value: "A" }])
    expect(engine.create({ value: "B" })).toEqual({ id: "record-0002", value: "B" })
    engine.reset()
    expect(engine.values()).toEqual([{ id: "record-0001", value: "A" }])
    expect(engine.create({ value: "B" }).id).toBe("record-0002")
  })

  it("switches scenarios without leaking prior mutations", () => {
    const engine = new MemoryScenarioEngine<RecordFixture>(scenarios, "default")
    engine.create({ value: "B" })
    engine.selectScenario("empty")
    expect(engine.values()).toEqual([])
    engine.selectScenario("default")
    expect(engine.values()).toEqual([{ id: "record-0001", value: "A" }])
  })

  it("bounds latency and consumes an intentional one-shot failure", async () => {
    vi.useFakeTimers()
    const engine = new MemoryScenarioEngine<RecordFixture>(scenarios, "default")
    engine.setLatency(10_000)
    engine.failNext()
    const first = engine.execute("list", () => "unreachable")
    const firstExpectation = expect(first).rejects.toBeInstanceOf(SimulatedMockFailure)
    await vi.advanceTimersByTimeAsync(2_000)
    await firstExpectation

    const second = engine.execute("list", () => "ok")
    await vi.advanceTimersByTimeAsync(2_000)
    await expect(second).resolves.toBe("ok")
    expect(engine.snapshot.latencyMs).toBe(2_000)
    vi.useRealTimers()
  })
})
