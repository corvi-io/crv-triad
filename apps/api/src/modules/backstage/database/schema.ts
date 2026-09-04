import { sql } from "drizzle-orm"
import { check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import { organization, user } from "../../idp/database/schema.js"

export const platformOperator = pgTable(
  "platform_operators",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["active", "disabled"] })
      .default("active")
      .notNull(),
    role: text("role", { enum: ["system_owner", "operations", "support", "billing"] })
      .default("support")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("platform_operators_user_id_unique").on(table.userId),
    index("platform_operators_status_idx").on(table.status),
    check("platform_operators_status_check", sql`${table.status} in ('active', 'disabled')`),
    check(
      "platform_operators_role_check",
      sql`${table.role} in ('system_owner', 'operations', 'support', 'billing')`,
    ),
  ],
)

export const supportContext = pgTable(
  "platform_support_contexts",
  {
    id: text("id").primaryKey(),
    operatorId: text("operator_id")
      .notNull()
      .references(() => platformOperator.id, { onDelete: "restrict" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    credentialDigest: text("credential_digest").notNull(),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("platform_support_contexts_credential_digest_unique").on(table.credentialDigest),
    index("platform_support_contexts_operator_expiry_idx").on(table.operatorId, table.expiresAt),
    index("platform_support_contexts_organization_expiry_idx").on(
      table.organizationId,
      table.expiresAt,
    ),
    check(
      "platform_support_contexts_reason_length_check",
      sql`char_length(${table.reason}) between 10 and 500`,
    ),
    check(
      "platform_support_contexts_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt} and ${table.expiresAt} <= ${table.createdAt} + interval '60 minutes'`,
    ),
  ],
)

export const supportAudit = pgTable(
  "platform_support_audit",
  {
    id: text("id").primaryKey(),
    operatorId: text("operator_id")
      .notNull()
      .references(() => platformOperator.id, { onDelete: "restrict" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    supportContextId: text("support_context_id").references(() => supportContext.id, {
      onDelete: "restrict",
    }),
    action: text("action").notNull(),
    targetId: text("target_id"),
    requestId: text("request_id").notNull(),
    outcome: text("outcome", { enum: ["allowed", "denied", "failed"] }).notNull(),
    severity: text("severity", { enum: ["normal", "high"] })
      .default("normal")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .default(sql`now() + interval '365 days'`)
      .notNull(),
  },
  (table) => [
    index("platform_support_audit_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("platform_support_audit_operator_created_at_idx").on(table.operatorId, table.createdAt),
    index("platform_support_audit_expiry_id_idx").on(table.expiresAt, table.id),
    check(
      "platform_support_audit_outcome_check",
      sql`${table.outcome} in ('allowed','denied','failed')`,
    ),
    check("platform_support_audit_severity_check", sql`${table.severity} in ('normal','high')`),
  ],
)
