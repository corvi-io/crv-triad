import { createHmac } from "node:crypto"
import type { Pool } from "pg"

type RateLimitInput = {
  pool: Pool
  clientAddress: string
  secret: string
  hourlyLimit: number
  dailyLimit: number
  now?: Date
  connectionRetryDelaysMs?: number[]
}

export async function consumeLeadRateLimit(input: RateLimitInput): Promise<boolean> {
  const now = input.now ?? new Date()
  const digest = createHmac("sha256", input.secret).update(input.clientAddress).digest("hex")
  const windows = [
    { name: "hour", limit: input.hourlyLimit, durationMs: 3_600_000 },
    { name: "day", limit: input.dailyLimit, durationMs: 86_400_000 },
  ] as const

  const client = await connectWithRetry(input.pool, input.connectionRetryDelaysMs ?? [150, 500])
  try {
    await client.query("BEGIN")
    for (const window of windows) {
      const startedAt = new Date(Math.floor(now.getTime() / window.durationMs) * window.durationMs)
      const expiresAt = new Date(startedAt.getTime() + window.durationMs * 2)
      const result = await client.query<{ request_count: number }>(
        `INSERT INTO lead_rate_limit_buckets
          (subject_digest, window, window_started_at, request_count, expires_at)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (subject_digest, window, window_started_at)
         DO UPDATE SET request_count = lead_rate_limit_buckets.request_count + 1
         RETURNING request_count`,
        [digest, window.name, startedAt, expiresAt],
      )
      if ((result.rows[0]?.request_count ?? window.limit + 1) > window.limit) {
        await client.query("ROLLBACK")
        return false
      }
    }
    await client.query("COMMIT")
    return true
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

async function connectWithRetry(pool: Pool, retryDelaysMs: number[]) {
  let lastError: unknown

  for (const delayMs of [0, ...retryDelaysMs]) {
    if (delayMs > 0) await Bun.sleep(delayMs)
    try {
      return await pool.connect()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}
