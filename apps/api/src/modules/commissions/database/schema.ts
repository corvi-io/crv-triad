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
import { professional } from "../../professionals/database/schema.js"
import { revenueReceipt, revenueReceiptLine } from "../../revenue-operations/database/schema.js"
import { service } from "../../services/database/schema.js"

const cents = (name: string) => bigint(name, { mode: "number" })
export type CommissionRuleSnapshot = {
  kind: "percentage" | "fixed" | "none"
  basisPoints?: number
  fixedCents?: number
  source: "override" | "default" | "none"
  policyVersion?: number
}

export const commissionPolicy = pgTable(
  "commission_policies",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    professionalId: text("professional_id").notNull(),
    serviceId: text("service_id"),
    kind: text("kind", { enum: ["percentage", "fixed", "none"] }).notNull(),
    basisPoints: integer("basis_points"),
    fixedCents: cents("fixed_cents"),
    version: integer("version").default(1).notNull(),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("commission_policies_tenant_id_unique").on(table.organizationId, table.id),
    uniqueIndex("commission_policies_default_unique")
      .on(table.organizationId, table.professionalId)
      .where(sql`${table.serviceId} is null`),
    uniqueIndex("commission_policies_override_unique")
      .on(table.organizationId, table.professionalId, table.serviceId)
      .where(sql`${table.serviceId} is not null`),
    foreignKey({
      columns: [table.organizationId, table.professionalId],
      foreignColumns: [professional.organizationId, professional.id],
      name: "commission_policies_tenant_professional_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.serviceId],
      foreignColumns: [service.organizationId, service.id],
      name: "commission_policies_tenant_service_fk",
    }).onDelete("restrict"),
    check(
      "commission_policies_rule_shape_check",
      sql`(${table.kind} = 'percentage' and ${table.basisPoints} between 1 and 10000 and ${table.fixedCents} is null) or (${table.kind} = 'fixed' and ${table.fixedCents} > 0 and ${table.basisPoints} is null and ${table.serviceId} is not null) or (${table.kind} = 'none' and ${table.basisPoints} is null and ${table.fixedCents} is null)`,
    ),
    check("commission_policies_version_check", sql`${table.version} > 0`),
  ],
)

export const commissionFact = pgTable(
  "commission_facts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    receiptId: text("receipt_id").notNull(),
    receiptLineId: text("receipt_line_id").notNull(),
    originalFactId: text("original_fact_id"),
    kind: text("kind", { enum: ["earned", "reversal"] }).notNull(),
    professionalId: text("professional_id").notNull(),
    professionalName: text("professional_name").notNull(),
    serviceId: text("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    rule: jsonb("rule").$type<CommissionRuleSnapshot>().notNull(),
    netBaseCents: cents("net_base_cents").notNull(),
    commissionCents: cents("commission_cents").notNull(),
    barbershopShareCents: cents("barbershop_share_cents").notNull(),
    localDate: text("local_date").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("commission_facts_tenant_id_unique").on(table.organizationId, table.id),
    uniqueIndex("commission_facts_receipt_line_kind_unique").on(
      table.organizationId,
      table.receiptLineId,
      table.kind,
    ),
    uniqueIndex("commission_facts_original_reversal_unique")
      .on(table.organizationId, table.originalFactId)
      .where(sql`${table.originalFactId} is not null`),
    foreignKey({
      columns: [table.organizationId, table.receiptId],
      foreignColumns: [revenueReceipt.organizationId, revenueReceipt.id],
      name: "commission_facts_tenant_receipt_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.receiptLineId],
      foreignColumns: [revenueReceiptLine.organizationId, revenueReceiptLine.id],
      name: "commission_facts_tenant_receipt_line_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.professionalId],
      foreignColumns: [professional.organizationId, professional.id],
      name: "commission_facts_tenant_professional_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.serviceId],
      foreignColumns: [service.organizationId, service.id],
      name: "commission_facts_tenant_service_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.originalFactId],
      foreignColumns: [table.organizationId, table.id],
      name: "commission_facts_tenant_original_fk",
    }).onDelete("restrict"),
    check(
      "commission_facts_amount_shape_check",
      sql`(${table.kind} = 'earned' and ${table.netBaseCents} >= 0 and ${table.commissionCents} >= 0 and ${table.barbershopShareCents} >= 0 and ${table.netBaseCents} = ${table.commissionCents} + ${table.barbershopShareCents} and ${table.originalFactId} is null) or (${table.kind} = 'reversal' and ${table.netBaseCents} <= 0 and ${table.commissionCents} <= 0 and ${table.barbershopShareCents} <= 0 and ${table.netBaseCents} = ${table.commissionCents} + ${table.barbershopShareCents} and ${table.originalFactId} is not null)`,
    ),
    index("commission_facts_tenant_date_idx").on(
      table.organizationId,
      table.localDate,
      table.occurredAt,
      table.id,
    ),
    index("commission_facts_professional_date_idx").on(
      table.organizationId,
      table.professionalId,
      table.localDate,
      table.id,
    ),
  ],
)
