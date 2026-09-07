import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { client } from "../../clients/database/schema.js"
import { organization, user } from "../../idp/database/schema.js"
import { professional } from "../../professionals/database/schema.js"
import { appointment } from "../../scheduling/database/schema.js"
import { service } from "../../services/database/schema.js"
import { unit } from "../../units/database/schema.js"

export const serviceDeskVisit = pgTable(
  "service_desk_visits",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    unitId: text("unit_id").notNull(),
    appointmentId: text("appointment_id"),
    clientId: text("client_id"),
    source: text("source", { enum: ["scheduled", "walk-in"] }).notNull(),
    status: text("status", {
      enum: ["waiting", "called", "in-service", "completed", "canceled"],
    }).notNull(),
    customerDisplayName: text("customer_display_name").notNull(),
    guestPhone: text("guest_phone"),
    unitName: text("unit_name").notNull(),
    timezone: text("timezone").notNull(),
    priority: text("priority", { enum: ["normal", "fit-in"] })
      .default("normal")
      .notNull(),
    requestedServiceId: text("requested_service_id").notNull(),
    requestedProfessionalId: text("requested_professional_id"),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }).notNull(),
    submittedLocalArrival: text("submitted_local_arrival"),
    notes: text("notes").default("").notNull(),
    closureReason: text("closure_reason"),
    version: integer("version").default(1).notNull(),
    calledAt: timestamp("called_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("service_desk_visits_tenant_id_unique").on(table.organizationId, table.id),
    uniqueIndex("service_desk_visits_tenant_appointment_unique").on(
      table.organizationId,
      table.appointmentId,
    ),
    foreignKey({
      columns: [table.organizationId, table.unitId],
      foreignColumns: [unit.organizationId, unit.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.appointmentId],
      foreignColumns: [appointment.organizationId, appointment.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.requestedServiceId],
      foreignColumns: [service.organizationId, service.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.requestedProfessionalId],
      foreignColumns: [professional.organizationId, professional.id],
    }),
    index("service_desk_visits_active_queue_idx").on(
      table.organizationId,
      table.unitId,
      table.status,
      table.arrivedAt,
      table.id,
    ),
    index("service_desk_visits_client_history_idx").on(
      table.organizationId,
      table.clientId,
      table.finishedAt,
      table.id,
    ),
    check("service_desk_visits_version_check", sql`${table.version} > 0`),
    check("service_desk_visits_notes_check", sql`char_length(${table.notes}) <= 500`),
    check(
      "service_desk_visits_customer_check",
      sql`char_length(btrim(${table.customerDisplayName})) between 2 and 100`,
    ),
  ],
)

export const serviceDeskItem = pgTable(
  "service_desk_items",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    visitId: text("visit_id").notNull(),
    serviceId: text("service_id").notNull(),
    professionalId: text("professional_id"),
    serviceName: text("service_name").notNull(),
    professionalName: text("professional_name"),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    status: text("status", { enum: ["pending", "active", "completed", "canceled"] })
      .default("pending")
      .notNull(),
    sequence: integer("sequence").notNull(),
    plannedEndAt: timestamp("planned_end_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_desk_items_tenant_id_unique").on(table.organizationId, table.id),
    uniqueIndex("service_desk_items_visit_sequence_unique").on(
      table.organizationId,
      table.visitId,
      table.sequence,
    ),
    foreignKey({
      columns: [table.organizationId, table.visitId],
      foreignColumns: [serviceDeskVisit.organizationId, serviceDeskVisit.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.serviceId],
      foreignColumns: [service.organizationId, service.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.professionalId],
      foreignColumns: [professional.organizationId, professional.id],
    }),
    index("service_desk_items_visit_idx").on(table.organizationId, table.visitId, table.sequence),
    check(
      "service_desk_items_values_check",
      sql`${table.sequence} between 1 and 20 and ${table.durationMinutes} > 0 and ${table.priceCents} >= 0`,
    ),
  ],
)

export const serviceDeskEvent = pgTable(
  "service_desk_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    visitId: text("visit_id").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    action: text("action").notNull(),
    changedFields: text("changed_fields").array().notNull(),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.visitId],
      foreignColumns: [serviceDeskVisit.organizationId, serviceDeskVisit.id],
    }),
    index("service_desk_events_visit_idx").on(table.organizationId, table.visitId, table.version),
  ],
)

export const serviceDeskCommand = pgTable(
  "service_desk_commands",
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
    uniqueIndex("service_desk_commands_actor_key_unique").on(
      table.organizationId,
      table.actorUserId,
      table.key,
    ),
  ],
)

export type CompletedServiceHandoff = {
  schemaVersion: 1
  tenantId: string
  unitId: string
  unitName: string
  timezone: string
  visitId: string
  clientId: string | null
  appointmentId: string | null
  customerDisplayName: string
  finishedAt: string
  visitVersion: number
  items: {
    itemId: string
    serviceId: string
    serviceName: string
    professionalId: string
    professionalName: string
    priceCents: number
    startedAt: string
    finishedAt: string
  }[]
}
export const serviceDeskHandoff = pgTable(
  "service_desk_completed_handoffs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    visitId: text("visit_id").notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    payload: jsonb("payload").$type<CompletedServiceHandoff>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("service_desk_handoffs_visit_unique").on(table.organizationId, table.visitId),
    foreignKey({
      columns: [table.organizationId, table.visitId],
      foreignColumns: [serviceDeskVisit.organizationId, serviceDeskVisit.id],
    }),
  ],
)
