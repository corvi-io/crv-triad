import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { organization } from "../../idp/database/schema.js"

export const unit = pgTable(
  "units",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    normalizedCode: text("normalized_code").notNull(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    timezone: text("timezone"),
    openingPeriods: jsonb("opening_periods")
      .$type<readonly { days: readonly string[]; end: string; start: string }[]>()
      .default([])
      .notNull(),
    status: text("status", { enum: ["active", "archived"] })
      .default("active")
      .notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("units_version_positive_check", sql`${table.version} > 0`),
    uniqueIndex("units_organization_normalized_code_unique").on(
      table.organizationId,
      table.normalizedCode,
    ),
    unique("units_organization_id_unique").on(table.organizationId, table.id),
    index("units_organization_status_name_id_idx").on(
      table.organizationId,
      table.status,
      table.name,
      table.id,
    ),
  ],
)
