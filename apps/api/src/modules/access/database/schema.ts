import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { member, organization, user } from "../../idp/database/schema.js"

export const plan = pgTable(
  "access_plans",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("access_plans_key_unique").on(table.key)],
)

export const planVersion = pgTable(
  "access_plan_versions",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("access_plan_versions_plan_version_unique").on(table.planId, table.version),
    check("access_plan_versions_version_positive_check", sql`${table.version} > 0`),
  ],
)

export const planEntitlement = pgTable(
  "access_plan_entitlements",
  {
    id: text("id").primaryKey(),
    planVersionId: text("plan_version_id")
      .notNull()
      .references(() => planVersion.id, { onDelete: "restrict" }),
    capabilityKey: text("capability_key").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    quotaKey: text("quota_key"),
    quotaLimit: integer("quota_limit"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("access_plan_entitlements_version_capability_unique").on(
      table.planVersionId,
      table.capabilityKey,
    ),
    check(
      "access_plan_entitlements_quota_pair_check",
      sql`(${table.quotaKey} is null and ${table.quotaLimit} is null) or (${table.quotaKey} is not null and ${table.quotaLimit} >= 0)`,
    ),
  ],
)

export const tenantSubscription = pgTable(
  "access_tenant_subscriptions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    planVersionId: text("plan_version_id")
      .notNull()
      .references(() => planVersion.id, { onDelete: "restrict" }),
    state: text("state", { enum: ["active", "expired", "suspended"] }).notNull(),
    isCurrent: boolean("is_current").default(true).notNull(),
    version: integer("version").default(1).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("access_tenant_subscriptions_one_current")
      .on(table.organizationId)
      .where(sql`${table.isCurrent} = true`),
    index("access_tenant_subscriptions_plan_version_idx").on(table.planVersionId),
    check(
      "access_tenant_subscriptions_state_check",
      sql`${table.state} in ('active','expired','suspended')`,
    ),
    check("access_tenant_subscriptions_version_positive_check", sql`${table.version} > 0`),
  ],
)

export const accessRequest = pgTable(
  "access_requests",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    requesterMembershipId: text("requester_membership_id").notNull(),
    capabilityKey: text("capability_key").notNull(),
    status: text("status", { enum: ["pending", "approved", "denied"] })
      .default("pending")
      .notNull(),
    approvedRole: text("approved_role", { enum: ["admin", "member"] }),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("access_requests_one_pending_capability")
      .on(table.organizationId, table.requesterMembershipId, table.capabilityKey)
      .where(sql`${table.status} = 'pending'`),
    foreignKey({
      columns: [table.organizationId, table.requesterMembershipId],
      foreignColumns: [member.organizationId, member.id],
      name: "access_requests_tenant_membership_fk",
    }).onDelete("restrict"),
    index("access_requests_organization_status_created_idx").on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    check("access_requests_status_check", sql`${table.status} in ('pending','approved','denied')`),
    check("access_requests_version_positive_check", sql`${table.version} > 0`),
  ],
)

export const accessAudit = pgTable(
  "access_audit",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    reason: text("reason"),
    targetId: text("target_id"),
    outcome: text("outcome", { enum: ["allowed", "denied", "failed"] }).notNull(),
    requestId: text("request_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("access_audit_organization_created_idx").on(table.organizationId, table.createdAt),
    check("access_audit_outcome_check", sql`${table.outcome} in ('allowed','denied','failed')`),
    check(
      "access_audit_reason_length_check",
      sql`${table.reason} is null or char_length(${table.reason}) between 10 and 500`,
    ),
  ],
)
