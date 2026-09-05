import { relations, sql } from "drizzle-orm"
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

import { organization, user } from "../../idp/database/schema.js"
import { professional } from "../../professionals/database/schema.js"
import { service } from "../../services/database/schema.js"
import { unit } from "../../units/database/schema.js"

export const client = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    globalUserId: text("global_user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    phone: text("phone"),
    normalizedPhone: text("normalized_phone"),
    email: text("email"),
    normalizedEmail: text("normalized_email"),
    preferenceNote: text("preference_note").default("").notNull(),
    servicePreferences: text("service_preferences").array().default(sql`'{}'::text[]`).notNull(),
    tags: text("tags").array().default(sql`'{}'::text[]`).notNull(),
    status: text("status", { enum: ["active", "archived"] })
      .default("active")
      .notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "clients_contact_required_check",
      sql`${table.normalizedPhone} is not null or ${table.normalizedEmail} is not null`,
    ),
    check("clients_version_positive_check", sql`${table.version} > 0`),
    index("clients_organization_status_name_id_idx").on(
      table.organizationId,
      table.status,
      table.name,
      table.id,
    ),
    index("clients_organization_created_at_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id,
    ),
    index("clients_organization_normalized_phone_idx").on(
      table.organizationId,
      table.normalizedPhone,
    ),
    index("clients_organization_normalized_email_idx").on(
      table.organizationId,
      table.normalizedEmail,
    ),
    index("clients_global_user_id_idx").on(table.globalUserId),
    uniqueIndex("clients_organization_id_unique").on(table.organizationId, table.id),
  ],
)

export const clientNote = pgTable(
  "client_notes",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    clientId: text("client_id").notNull(),
    body: text("body").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("client_notes_body_length_check", sql`char_length(${table.body}) between 1 and 2000`),
    check("client_notes_version_positive_check", sql`${table.version} > 0`),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
      name: "client_notes_tenant_client_fk",
    }).onDelete("cascade"),
    index("client_notes_organization_client_created_at_idx").on(
      table.organizationId,
      table.clientId,
      table.createdAt,
    ),
    uniqueIndex("client_notes_organization_client_id_unique").on(
      table.organizationId,
      table.clientId,
      table.id,
    ),
  ],
)

export const clientServicePreference = pgTable(
  "client_service_preferences",
  {
    organizationId: text("organization_id").notNull(),
    clientId: text("client_id").notNull(),
    serviceId: text("service_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
      name: "client_service_preferences_tenant_client_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.serviceId],
      foreignColumns: [service.organizationId, service.id],
      name: "client_service_preferences_tenant_service_fk",
    }).onDelete("restrict"),
    uniqueIndex("client_service_preferences_pair_unique").on(
      table.organizationId,
      table.clientId,
      table.serviceId,
    ),
    index("client_service_preferences_service_idx").on(table.organizationId, table.serviceId),
  ],
)

export const clientProfessionalPreference = pgTable(
  "client_professional_preferences",
  {
    organizationId: text("organization_id").notNull(),
    clientId: text("client_id").notNull(),
    professionalId: text("professional_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
      name: "client_professional_preferences_tenant_client_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.professionalId],
      foreignColumns: [professional.organizationId, professional.id],
      name: "client_professional_preferences_tenant_professional_fk",
    }).onDelete("restrict"),
    uniqueIndex("client_professional_preferences_pair_unique").on(
      table.organizationId,
      table.clientId,
      table.professionalId,
    ),
    index("client_professional_preferences_professional_idx").on(
      table.organizationId,
      table.professionalId,
    ),
  ],
)

export const clientUnitPreference = pgTable(
  "client_unit_preferences",
  {
    organizationId: text("organization_id").notNull(),
    clientId: text("client_id").notNull(),
    unitId: text("unit_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
      name: "client_unit_preferences_tenant_client_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.unitId],
      foreignColumns: [unit.organizationId, unit.id],
      name: "client_unit_preferences_tenant_unit_fk",
    }).onDelete("restrict"),
    uniqueIndex("client_unit_preferences_pair_unique").on(
      table.organizationId,
      table.clientId,
      table.unitId,
    ),
    index("client_unit_preferences_unit_idx").on(table.organizationId, table.unitId),
  ],
)

export const clientRelations = relations(client, ({ many, one }) => ({
  organization: one(organization, {
    fields: [client.organizationId],
    references: [organization.id],
  }),
  globalUser: one(user, { fields: [client.globalUserId], references: [user.id] }),
  notes: many(clientNote),
}))

export const clientNoteRelations = relations(clientNote, ({ one }) => ({
  client: one(client, { fields: [clientNote.clientId], references: [client.id] }),
}))
