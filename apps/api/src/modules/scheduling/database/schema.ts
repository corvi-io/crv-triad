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
import { client } from "../../clients/database/schema.js"
import { organization, user } from "../../idp/database/schema.js"
import { professional } from "../../professionals/database/schema.js"
import { service } from "../../services/database/schema.js"
import { unit } from "../../units/database/schema.js"
import { statuses } from "../domain/appointment.js"
export const appointment = pgTable(
  "scheduling_appointments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    unitId: text("unit_id").notNull(),
    professionalId: text("professional_id").notNull(),
    serviceId: text("service_id").notNull(),
    clientId: text("client_id").notNull(),
    customerName: text("customer_name").notNull(),
    professionalName: text("professional_name").notNull(),
    serviceName: text("service_name").notNull(),
    unitName: text("unit_name").notNull(),
    timezone: text("timezone").notNull(),
    date: date("date").notNull(),
    start: text("start").notNull(),
    end: text("end").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    status: text("status", { enum: statuses }).default("scheduled").notNull(),
    notes: text("notes").default("").notNull(),
    origin: text("origin", { enum: ["phone", "reception", "whatsapp"] })
      .default("reception")
      .notNull(),
    cancellationReason: text("cancellation_reason"),
    cancellationNote: text("cancellation_note"),
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
    foreignKey({
      columns: [table.organizationId, table.serviceId],
      foreignColumns: [service.organizationId, service.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
    }),
    uniqueIndex("scheduling_appointments_tenant_id_unique").on(table.organizationId, table.id),
    index("scheduling_appointments_unit_date_idx").on(
      table.organizationId,
      table.unitId,
      table.date,
      table.start,
      table.id,
    ),
    index("scheduling_appointments_professional_time_idx").on(
      table.organizationId,
      table.professionalId,
      table.startsAt,
    ),
    index("scheduling_appointments_client_time_idx").on(
      table.organizationId,
      table.clientId,
      table.startsAt,
    ),
    index("scheduling_appointments_service_idx").on(table.organizationId, table.serviceId),
    check(
      "scheduling_appointments_values_check",
      sql`${table.startsAt} < ${table.endsAt} and ${table.durationMinutes} > 0 and ${table.priceCents} >= 0 and ${table.version} > 0`,
    ),
    check(
      "scheduling_appointments_status_check",
      sql`${table.status} in ('scheduled','confirmed','arrived','waiting','in-progress','completed','canceled','no-show')`,
    ),
  ],
)
export const appointmentEvent = pgTable(
  "scheduling_appointment_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    appointmentId: text("appointment_id").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    action: text("action").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    changedFields: text("changed_fields").array().notNull(),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.appointmentId],
      foreignColumns: [appointment.organizationId, appointment.id],
    }),
    index("scheduling_events_appointment_idx").on(
      table.organizationId,
      table.appointmentId,
      table.version,
    ),
    index("scheduling_events_actor_idx").on(table.actorUserId),
  ],
)
export const schedulingCommand = pgTable(
  "scheduling_commands",
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
    resourceId: text("resource_id").notNull(),
    resourceVersion: integer("resource_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("scheduling_commands_actor_key_unique").on(
      table.organizationId,
      table.actorUserId,
      table.key,
    ),
    index("scheduling_commands_actor_idx").on(table.actorUserId),
  ],
)
