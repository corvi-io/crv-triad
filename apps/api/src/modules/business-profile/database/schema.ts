import { sql } from "drizzle-orm"
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { organization, user } from "../../idp/database/schema.js"
import { unit } from "../../units/database/schema.js"

export const businessProfile = pgTable(
  "business_profiles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    whatsapp: text("whatsapp"),
    description: text("description"),
    website: text("website"),
    instagram: text("instagram"),
    primaryUnitId: text("primary_unit_id"),
    logoObjectKey: text("logo_object_key"),
    logoContentType: text("logo_content_type"),
    logoByteSize: bigint("logo_byte_size", { mode: "number" }),
    logoChecksum: text("logo_checksum"),
    logoWidth: integer("logo_width"),
    logoHeight: integer("logo_height"),
    version: integer("version").default(1).notNull(),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("business_profiles_organization_unique").on(table.organizationId),
    foreignKey({
      columns: [table.organizationId, table.primaryUnitId],
      foreignColumns: [unit.organizationId, unit.id],
      name: "business_profiles_tenant_primary_unit_fk",
    }).onDelete("restrict"),
    check(
      "business_profiles_display_name_check",
      sql`char_length(btrim(${table.displayName})) between 2 and 80`,
    ),
    check(
      "business_profiles_description_check",
      sql`${table.description} is null or char_length(${table.description}) <= 500`,
    ),
    check("business_profiles_version_check", sql`${table.version} > 0`),
    check(
      "business_profiles_logo_shape_check",
      sql`(${table.logoObjectKey} is null and ${table.logoContentType} is null and ${table.logoByteSize} is null and ${table.logoChecksum} is null and ${table.logoWidth} is null and ${table.logoHeight} is null) or (${table.logoObjectKey} is not null and ${table.logoContentType} in ('image/jpeg','image/png','image/webp') and ${table.logoByteSize} between 1 and 5242880 and ${table.logoChecksum} is not null and ${table.logoWidth} between 1 and 4096 and ${table.logoHeight} between 1 and 4096)`,
    ),
  ],
)

export const businessLogoCleanup = pgTable(
  "business_logo_cleanups",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    objectKey: text("object_key").notNull(),
    status: text("status", { enum: ["pending", "completed"] })
      .default("pending")
      .notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastFailureCode: text("last_failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("business_logo_cleanups_tenant_object_unique").on(
      table.organizationId,
      table.objectKey,
    ),
    index("business_logo_cleanups_pending_idx").on(table.status, table.createdAt, table.id),
    check("business_logo_cleanups_attempts_check", sql`${table.attempts} >= 0`),
  ],
)
