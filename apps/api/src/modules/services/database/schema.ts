import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { organization } from "../../idp/database/schema.js"
import { professional } from "../../professionals/database/schema.js"
import { unit } from "../../units/database/schema.js"

export const service = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    status: text("status", { enum: ["active", "archived"] })
      .default("active")
      .notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("services_version_positive_check", sql`${table.version} > 0`),
    check("services_duration_positive_check", sql`${table.durationMinutes} > 0`),
    check("services_price_nonnegative_check", sql`${table.priceCents} >= 0`),
    uniqueIndex("services_organization_normalized_name_unique").on(
      table.organizationId,
      table.normalizedName,
    ),
    uniqueIndex("services_organization_id_unique").on(table.organizationId, table.id),
    index("services_organization_status_name_id_idx").on(
      table.organizationId,
      table.status,
      table.name,
      table.id,
    ),
  ],
)

export const serviceUnit = pgTable(
  "service_units",
  {
    organizationId: text("organization_id").notNull(),
    serviceId: text("service_id").notNull(),
    unitId: text("unit_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.serviceId],
      foreignColumns: [service.organizationId, service.id],
      name: "service_units_tenant_service_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.unitId],
      foreignColumns: [unit.organizationId, unit.id],
      name: "service_units_tenant_unit_fk",
    }).onDelete("restrict"),
    uniqueIndex("service_units_pair_unique").on(
      table.organizationId,
      table.serviceId,
      table.unitId,
    ),
    index("service_units_unit_idx").on(table.organizationId, table.unitId),
  ],
)

export const professionalService = pgTable(
  "professional_services",
  {
    organizationId: text("organization_id").notNull(),
    professionalId: text("professional_id").notNull(),
    serviceId: text("service_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.professionalId],
      foreignColumns: [professional.organizationId, professional.id],
      name: "professional_services_tenant_professional_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.serviceId],
      foreignColumns: [service.organizationId, service.id],
      name: "professional_services_tenant_service_fk",
    }).onDelete("cascade"),
    uniqueIndex("professional_services_pair_unique").on(
      table.organizationId,
      table.professionalId,
      table.serviceId,
    ),
    index("professional_services_service_idx").on(table.organizationId, table.serviceId),
  ],
)
