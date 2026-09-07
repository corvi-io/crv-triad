import { sql } from "drizzle-orm"
import {
  bigint,
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

import { organization, user } from "../../idp/database/schema.js"
import type { ReportConfigSnapshot, ReportType } from "../application/report-catalog.js"

export type ReportFilters = {
  from: string
  to: string
  timezone: string
  unitId?: string
  professionalId?: string
  serviceId?: string
  paymentMethod?: "pix" | "cash" | "debit" | "credit"
}
export const reportRequest = pgTable(
  "report_requests",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    format: text("format", { enum: ["pdf", "csv"] }).notNull(),
    reportType: text("report_type").$type<ReportType>().default("sales_revenue").notNull(),
    configVersion: integer("config_version").default(1).notNull(),
    configSnapshot: jsonb("config_snapshot").$type<ReportConfigSnapshot>(),
    filters: jsonb("filters").$type<ReportFilters>().notNull(),
    requesterEmail: text("requester_email"),
    requesterEmailVerifiedAt: timestamp("requester_email_verified_at", { withTimezone: true }),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status", { enum: ["queued", "running", "ready", "failed", "expired"] })
      .default("queued")
      .notNull(),
    version: integer("version").default(1).notNull(),
    activeAttempt: integer("active_attempt").default(1).notNull(),
    providerRunReference: text("provider_run_reference"),
    safeFailureCode: text("safe_failure_code"),
    emailDeliveryStatus: text("email_delivery_status", {
      enum: ["pending", "sending", "sent", "failed", "not_applicable"],
    })
      .default("pending")
      .notNull(),
    emailDeliveryFailureCode: text("email_delivery_failure_code"),
    emailDeliveryAttempt: integer("email_delivery_attempt").default(0).notNull(),
    emailDeliveryClaimedAt: timestamp("email_delivery_claimed_at", { withTimezone: true }),
    emailDeliveredAt: timestamp("email_delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("report_requests_tenant_id_unique").on(table.organizationId, table.id),
    uniqueIndex("report_requests_tenant_key_unique").on(table.organizationId, table.idempotencyKey),
    check(
      "report_requests_version_check",
      sql`${table.version} > 0 and ${table.activeAttempt} > 0 and ${table.configVersion} > 0 and ${table.emailDeliveryAttempt} >= 0`,
    ),
    index("report_requests_history_idx").on(table.organizationId, table.createdAt, table.id),
    index("report_requests_status_idx").on(table.status, table.updatedAt, table.id),
  ],
)

export const reportAttempt = pgTable(
  "report_attempts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    reportRequestId: text("report_request_id").notNull(),
    attempt: integer("attempt").notNull(),
    status: text("status", { enum: ["queued", "running", "ready", "failed"] })
      .default("queued")
      .notNull(),
    providerRunReference: text("provider_run_reference"),
    safeFailureCode: text("safe_failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("report_attempts_number_unique").on(
      table.organizationId,
      table.reportRequestId,
      table.attempt,
    ),
    foreignKey({
      columns: [table.organizationId, table.reportRequestId],
      foreignColumns: [reportRequest.organizationId, reportRequest.id],
      name: "report_attempts_tenant_request_fk",
    }).onDelete("restrict"),
    check("report_attempts_number_check", sql`${table.attempt} > 0`),
    index("report_attempts_status_idx").on(table.status, table.createdAt, table.id),
  ],
)

export const reportArtifact = pgTable(
  "report_artifacts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    reportRequestId: text("report_request_id").notNull(),
    attempt: integer("attempt").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type", { enum: ["application/pdf", "text/csv"] }).notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    checksum: text("checksum").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("report_artifacts_request_attempt_unique").on(
      table.organizationId,
      table.reportRequestId,
      table.attempt,
    ),
    uniqueIndex("report_artifacts_object_key_unique").on(table.objectKey),
    foreignKey({
      columns: [table.organizationId, table.reportRequestId],
      foreignColumns: [reportRequest.organizationId, reportRequest.id],
      name: "report_artifacts_tenant_request_fk",
    }).onDelete("restrict"),
    check("report_artifacts_size_check", sql`${table.byteSize} > 0`),
    index("report_artifacts_expiry_idx").on(table.expiresAt, table.id),
  ],
)
