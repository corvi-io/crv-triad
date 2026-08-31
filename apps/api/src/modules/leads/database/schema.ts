import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

export const leadRateLimitBucket = pgTable(
  "lead_rate_limit_buckets",
  {
    subjectDigest: text("subject_digest").notNull(),
    window: text("window", { enum: ["hour", "day"] }).notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    requestCount: integer("request_count").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.subjectDigest, table.window, table.windowStartedAt] })],
)
