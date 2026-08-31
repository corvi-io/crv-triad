import { describe, expect, it, vi } from "vitest"

import { consumeLeadRateLimit } from "../../../src/modules/leads/rate-limit.js"

function createPool(counts: number[]) {
  const query = vi.fn(async (sql: string) => {
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] }
    return { rows: [{ request_count: counts.shift() }] }
  })
  const release = vi.fn()
  return { pool: { connect: async () => ({ query, release }) }, query, release }
}

describe("consumeLeadRateLimit", () => {
  it("atomically consumes hourly and daily buckets", async () => {
    const { pool, query, release } = createPool([1, 1])
    await expect(
      consumeLeadRateLimit({
        pool: pool as never,
        clientAddress: "127.0.0.1",
        secret: "a".repeat(32),
        hourlyLimit: 5,
        dailyLimit: 20,
        now: new Date("2026-08-31T12:34:00Z"),
      }),
    ).resolves.toBe(true)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('(subject_digest, "window", window_started_at'),
      expect.any(Array),
    )
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (subject_digest, "window", window_started_at)'),
      expect.any(Array),
    )
    expect(query).toHaveBeenCalledWith("COMMIT")
    expect(release).toHaveBeenCalledOnce()
  })

  it("rolls back when a bucket exceeds its limit", async () => {
    const { pool, query } = createPool([6])
    await expect(
      consumeLeadRateLimit({
        pool: pool as never,
        clientAddress: "127.0.0.1",
        secret: "a".repeat(32),
        hourlyLimit: 5,
        dailyLimit: 20,
      }),
    ).resolves.toBe(false)
    expect(query).toHaveBeenCalledWith("ROLLBACK")
  })

  it("rolls back and releases the client on database failure", async () => {
    const release = vi.fn()
    const query = vi.fn(async (sql: string) => {
      if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] }
      throw new Error("database unavailable")
    })
    const pool = { connect: async () => ({ query, release }) }
    await expect(
      consumeLeadRateLimit({
        pool: pool as never,
        clientAddress: "local",
        secret: "a".repeat(32),
        hourlyLimit: 5,
        dailyLimit: 20,
      }),
    ).rejects.toThrow("database unavailable")
    expect(release).toHaveBeenCalledOnce()
  })

  it("retries a transient connection failure before consuming buckets", async () => {
    const { pool: connectedPool, query } = createPool([1, 1])
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error("database waking up"))
      .mockImplementation(() => connectedPool.connect())

    await expect(
      consumeLeadRateLimit({
        pool: { connect } as never,
        clientAddress: "127.0.0.1",
        secret: "a".repeat(32),
        hourlyLimit: 5,
        dailyLimit: 20,
        connectionRetryDelaysMs: [0],
      }),
    ).resolves.toBe(true)

    expect(connect).toHaveBeenCalledTimes(2)
    expect(query).toHaveBeenCalledWith("COMMIT")
  })

  it("fails closed after exhausting connection retries", async () => {
    const connect = vi.fn().mockRejectedValue(new Error("database unavailable"))

    await expect(
      consumeLeadRateLimit({
        pool: { connect } as never,
        clientAddress: "127.0.0.1",
        secret: "a".repeat(32),
        hourlyLimit: 5,
        dailyLimit: 20,
        connectionRetryDelaysMs: [0, 0],
      }),
    ).rejects.toThrow("database unavailable")

    expect(connect).toHaveBeenCalledTimes(3)
  })
})
