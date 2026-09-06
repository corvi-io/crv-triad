import { sql } from "drizzle-orm"
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { organization, user } from "../../idp/database/schema.js"
import { professional } from "../../professionals/database/schema.js"
import { unit } from "../../units/database/schema.js"
export const availabilitySeries = pgTable(
  "availability_series",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    unitId: text("unit_id").notNull(),
    professionalId: text("professional_id").notNull(),
    kind: text("kind", { enum: ["available", "break", "blocked", "absence"] }).notNull(),
    start: text("start").notNull(),
    end: text("end").notNull(),
    weekdays: text("weekdays").array().notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveUntil: date("effective_until"),
    excludedDates: text("excluded_dates").array().default(sql`'{}'::text[]`).notNull(),
    status: text("status", { enum: ["active", "archived"] })
      .default("active")
      .notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.unitId],
      foreignColumns: [unit.organizationId, unit.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.professionalId],
      foreignColumns: [professional.organizationId, professional.id],
    }),
    uniqueIndex("availability_series_tenant_id_unique").on(table.organizationId, table.id),
    index("availability_series_unit_range_idx").on(
      table.organizationId,
      table.unitId,
      table.status,
      table.effectiveFrom,
    ),
    index("availability_series_professional_idx").on(table.organizationId, table.professionalId),
    check(
      "availability_series_interval_check",
      sql`${table.start} < ${table.end} and (${table.effectiveUntil} is null or ${table.effectiveUntil} >= ${table.effectiveFrom}) and ${table.version} > 0`,
    ),
    check(
      "availability_series_kind_check",
      sql`${table.kind} in ('available','break','blocked','absence')`,
    ),
  ],
)

// Metadata-only command receipts double as the append-only availability audit trail.
export const availabilityCommand = pgTable(
  "availability_commands",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    key: text("key").notNull(),
    fingerprint: text("fingerprint").notNull(),
    action: text("action").notNull(),
    resourceId: text("resource_id").notNull(),
    resourceVersion: integer("resource_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("availability_commands_actor_key_unique").on(
      table.organizationId,
      table.actorUserId,
      table.key,
    ),
    index("availability_commands_resource_idx").on(
      table.organizationId,
      table.resourceId,
      table.createdAt,
    ),
  ],
)
