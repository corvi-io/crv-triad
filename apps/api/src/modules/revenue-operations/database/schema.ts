import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
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
import { serviceDeskHandoff } from "../../service-desk/database/schema.js"
import { unit } from "../../units/database/schema.js"

const cents = (name: string) => bigint(name, { mode: "number" })

export const revenuePaymentMethod = pgTable(
  "revenue_payment_methods",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    method: text("method", { enum: ["pix", "cash", "debit", "credit"] }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    version: integer("version").default(1).notNull(),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("revenue_methods_tenant_method_unique").on(table.organizationId, table.method),
    check("revenue_methods_version_check", sql`${table.version} > 0`),
  ],
)

export type RevenueCheckoutLineSnapshot = {
  itemId: string
  serviceId: string
  serviceName: string
  professionalId: string
  professionalName: string
  handoffPriceCents: number
  startedAt: string
  finishedAt: string
}

export const revenueCheckout = pgTable(
  "revenue_checkouts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    unitId: text("unit_id").notNull(),
    visitId: text("visit_id").notNull(),
    clientId: text("client_id"),
    appointmentId: text("appointment_id"),
    customerDisplayName: text("customer_display_name").notNull(),
    unitName: text("unit_name").notNull(),
    timezone: text("timezone").notNull(),
    handoffVersion: integer("handoff_version").notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: ["open", "registered"] })
      .default("open")
      .notNull(),
    discountCents: cents("discount_cents").default(0).notNull(),
    surchargeCents: cents("surcharge_cents").default(0).notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("revenue_checkouts_tenant_id_unique").on(table.organizationId, table.id),
    uniqueIndex("revenue_checkouts_tenant_visit_unique").on(table.organizationId, table.visitId),
    foreignKey({
      columns: [table.organizationId, table.unitId],
      foreignColumns: [unit.organizationId, unit.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.visitId],
      foreignColumns: [serviceDeskHandoff.organizationId, serviceDeskHandoff.visitId],
    }),
    check(
      "revenue_checkouts_amounts_check",
      sql`${table.discountCents} >= 0 and ${table.surchargeCents} >= 0`,
    ),
    check("revenue_checkouts_version_check", sql`${table.version} > 0`),
    index("revenue_checkouts_worklist_idx").on(
      table.organizationId,
      table.unitId,
      table.status,
      table.finishedAt,
      table.id,
    ),
  ],
)

export const revenueCheckoutLine = pgTable(
  "revenue_checkout_lines",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    checkoutId: text("checkout_id").notNull(),
    itemId: text("item_id").notNull(),
    sequence: integer("sequence").notNull(),
    snapshot: jsonb("snapshot").$type<RevenueCheckoutLineSnapshot>().notNull(),
    priceCents: cents("price_cents").notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("revenue_checkout_lines_item_unique").on(
      table.organizationId,
      table.checkoutId,
      table.itemId,
    ),
    uniqueIndex("revenue_checkout_lines_sequence_unique").on(
      table.organizationId,
      table.checkoutId,
      table.sequence,
    ),
    foreignKey({
      columns: [table.organizationId, table.checkoutId],
      foreignColumns: [revenueCheckout.organizationId, revenueCheckout.id],
    }),
    check("revenue_checkout_lines_price_check", sql`${table.priceCents} >= 0`),
    check("revenue_checkout_lines_version_check", sql`${table.version} > 0`),
  ],
)

export const revenueCheckoutAdjustment = pgTable(
  "revenue_checkout_adjustments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    checkoutId: text("checkout_id").notNull(),
    kind: text("kind", { enum: ["line-price", "discount", "surcharge"] }).notNull(),
    lineId: text("line_id"),
    previousCents: cents("previous_cents").notNull(),
    nextCents: cents("next_cents").notNull(),
    reason: text("reason").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    actorDisplayName: text("actor_display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.checkoutId],
      foreignColumns: [revenueCheckout.organizationId, revenueCheckout.id],
    }),
    check(
      "revenue_checkout_adjustments_reason_check",
      sql`char_length(btrim(${table.reason})) between 3 and 160`,
    ),
  ],
)

export const revenueCheckoutTender = pgTable(
  "revenue_checkout_tenders",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    checkoutId: text("checkout_id").notNull(),
    method: text("method", { enum: ["pix", "cash", "debit", "credit"] }).notNull(),
    appliedCents: cents("applied_cents").notNull(),
    receivedCents: cents("received_cents"),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("revenue_checkout_tenders_method_unique").on(
      table.organizationId,
      table.checkoutId,
      table.method,
    ),
    foreignKey({
      columns: [table.organizationId, table.checkoutId],
      foreignColumns: [revenueCheckout.organizationId, revenueCheckout.id],
    }),
    check("revenue_checkout_tenders_applied_check", sql`${table.appliedCents} > 0`),
    check(
      "revenue_checkout_tenders_received_check",
      sql`${table.receivedCents} is null or ${table.receivedCents} >= ${table.appliedCents}`,
    ),
  ],
)

export const revenueCashDay = pgTable(
  "revenue_cash_days",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    unitId: text("unit_id").notNull(),
    localDate: text("local_date").notNull(),
    timezone: text("timezone").notNull(),
    openingCashCents: cents("opening_cash_cents").notNull(),
    status: text("status", { enum: ["open", "closed"] })
      .default("open")
      .notNull(),
    version: integer("version").default(1).notNull(),
    openedBy: text("opened_by")
      .notNull()
      .references(() => user.id),
    openedByName: text("opened_by_name").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("revenue_cash_days_tenant_id_unique").on(table.organizationId, table.id),
    uniqueIndex("revenue_cash_days_unit_date_unique").on(
      table.organizationId,
      table.unitId,
      table.localDate,
    ),
    foreignKey({
      columns: [table.organizationId, table.unitId],
      foreignColumns: [unit.organizationId, unit.id],
    }),
    check("revenue_cash_days_opening_check", sql`${table.openingCashCents} >= 0`),
    check("revenue_cash_days_version_check", sql`${table.version} > 0`),
    index("revenue_cash_days_history_idx").on(table.organizationId, table.unitId, table.localDate),
  ],
)

export const revenueCashMovement = pgTable(
  "revenue_cash_movements",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    cashDayId: text("cash_day_id").notNull(),
    kind: text("kind", {
      enum: ["supply", "withdrawal", "movement-reversal", "receipt", "receipt-reversal"],
    }).notNull(),
    amountCents: cents("amount_cents").notNull(),
    reason: text("reason"),
    originalMovementId: text("original_movement_id"),
    receiptId: text("receipt_id"),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    actorDisplayName: text("actor_display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.cashDayId],
      foreignColumns: [revenueCashDay.organizationId, revenueCashDay.id],
    }),
    uniqueIndex("revenue_cash_movements_original_unique").on(
      table.organizationId,
      table.originalMovementId,
    ),
    check("revenue_cash_movements_amount_check", sql`${table.amountCents} <> 0`),
    check(
      "revenue_cash_movements_shape_check",
      sql`(${table.kind} = 'supply' and ${table.amountCents} > 0 and ${table.reason} is not null and ${table.originalMovementId} is null and ${table.receiptId} is null) or (${table.kind} = 'withdrawal' and ${table.amountCents} < 0 and ${table.reason} is not null and ${table.originalMovementId} is null and ${table.receiptId} is null) or (${table.kind} = 'movement-reversal' and ${table.reason} is not null and ${table.originalMovementId} is not null and ${table.receiptId} is null) or (${table.kind} in ('receipt', 'receipt-reversal') and ${table.reason} is null and ${table.originalMovementId} is null and ${table.receiptId} is not null)`,
    ),
    check(
      "revenue_cash_movements_reason_check",
      sql`${table.reason} is null or char_length(btrim(${table.reason})) between 3 and 160`,
    ),
    index("revenue_cash_movements_day_idx").on(
      table.organizationId,
      table.cashDayId,
      table.createdAt,
      table.id,
    ),
  ],
)

export const revenueReceipt = pgTable(
  "revenue_receipts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    checkoutId: text("checkout_id").notNull(),
    replacesReceiptId: text("replaces_receipt_id"),
    cashDayId: text("cash_day_id").notNull(),
    localDate: text("local_date").notNull(),
    timezone: text("timezone").notNull(),
    status: text("status", { enum: ["active", "reversed"] })
      .default("active")
      .notNull(),
    subtotalCents: cents("subtotal_cents").notNull(),
    discountCents: cents("discount_cents").notNull(),
    surchargeCents: cents("surcharge_cents").notNull(),
    totalCents: cents("total_cents").notNull(),
    changeCents: cents("change_cents").default(0).notNull(),
    checkoutVersion: integer("checkout_version").notNull(),
    policyVersion: integer("policy_version").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    actorDisplayName: text("actor_display_name").notNull(),
    registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("revenue_receipts_tenant_id_unique").on(table.organizationId, table.id),
    uniqueIndex("revenue_receipts_active_checkout_unique")
      .on(table.organizationId, table.checkoutId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("revenue_receipts_replacement_unique").on(
      table.organizationId,
      table.replacesReceiptId,
    ),
    foreignKey({
      columns: [table.organizationId, table.checkoutId],
      foreignColumns: [revenueCheckout.organizationId, revenueCheckout.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.cashDayId],
      foreignColumns: [revenueCashDay.organizationId, revenueCashDay.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.replacesReceiptId],
      foreignColumns: [table.organizationId, table.id],
    }),
    check(
      "revenue_receipts_amounts_check",
      sql`${table.subtotalCents} >= 0 and ${table.discountCents} >= 0 and ${table.surchargeCents} >= 0 and ${table.totalCents} = ${table.subtotalCents} - ${table.discountCents} + ${table.surchargeCents} and ${table.totalCents} >= 0 and ${table.changeCents} >= 0`,
    ),
    index("revenue_receipts_day_idx").on(
      table.organizationId,
      table.cashDayId,
      table.registeredAt,
      table.id,
    ),
  ],
)

export const revenueReceiptLine = pgTable(
  "revenue_receipt_lines",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    receiptId: text("receipt_id").notNull(),
    checkoutLineId: text("checkout_line_id").notNull(),
    sequence: integer("sequence").notNull(),
    snapshot: jsonb("snapshot").$type<RevenueCheckoutLineSnapshot>().notNull(),
    grossCents: cents("gross_cents").notNull(),
    netCents: cents("net_cents").notNull(),
  },
  (table) => [
    unique("revenue_receipt_lines_tenant_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.receiptId],
      foreignColumns: [revenueReceipt.organizationId, revenueReceipt.id],
    }),
    uniqueIndex("revenue_receipt_lines_sequence_unique").on(
      table.organizationId,
      table.receiptId,
      table.sequence,
    ),
    check(
      "revenue_receipt_lines_amounts_check",
      sql`${table.grossCents} >= 0 and ${table.netCents} >= 0`,
    ),
  ],
)

export const revenueReceiptTender = pgTable(
  "revenue_receipt_tenders",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    receiptId: text("receipt_id").notNull(),
    method: text("method", { enum: ["pix", "cash", "debit", "credit"] }).notNull(),
    appliedCents: cents("applied_cents").notNull(),
    receivedCents: cents("received_cents"),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.receiptId],
      foreignColumns: [revenueReceipt.organizationId, revenueReceipt.id],
    }),
    uniqueIndex("revenue_receipt_tenders_method_unique").on(
      table.organizationId,
      table.receiptId,
      table.method,
    ),
    check("revenue_receipt_tenders_applied_check", sql`${table.appliedCents} > 0`),
    check(
      "revenue_receipt_tenders_received_check",
      sql`(${table.method} = 'cash' and ${table.receivedCents} >= ${table.appliedCents}) or (${table.method} <> 'cash' and ${table.receivedCents} is null)`,
    ),
  ],
)

export type RevenueReceiptReversalSnapshot = {
  totalCents: number
  lines: Array<{ receiptLineId: string; netCents: number }>
  tenders: Array<{ receiptTenderId: string; method: string; appliedCents: number }>
}

export const revenueReceiptReversal = pgTable(
  "revenue_receipt_reversals",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    receiptId: text("receipt_id").notNull(),
    cashDayId: text("cash_day_id").notNull(),
    snapshot: jsonb("snapshot").$type<RevenueReceiptReversalSnapshot>().notNull(),
    reason: text("reason").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    actorDisplayName: text("actor_display_name").notNull(),
    reversedAt: timestamp("reversed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("revenue_receipt_reversals_receipt_unique").on(
      table.organizationId,
      table.receiptId,
    ),
    foreignKey({
      columns: [table.organizationId, table.receiptId],
      foreignColumns: [revenueReceipt.organizationId, revenueReceipt.id],
    }),
    foreignKey({
      columns: [table.organizationId, table.cashDayId],
      foreignColumns: [revenueCashDay.organizationId, revenueCashDay.id],
    }),
    check(
      "revenue_receipt_reversals_reason_check",
      sql`char_length(btrim(${table.reason})) between 3 and 160`,
    ),
  ],
)

export type RevenueClosingSnapshot = {
  openingCashCents: number
  cashReceiptCents: number
  cashReceiptReversalCents: number
  supplyCents: number
  withdrawalCents: number
  expectedCashCents: number
  countedCashCents: number
  differenceCents: number
  grossReceiptCents: number
  reversedReceiptCents: number
  netReceiptCents: number
  noChargeCount: number
  receiptCount: number
  reversalCount: number
  discountCents: number
  surchargeCents: number
  paymentMethods: Array<{
    method: string
    grossCents: number
    reversedCents: number
    netCents: number
  }>
  pendingCheckoutCount: number
}

export const revenueClosingRevision = pgTable(
  "revenue_closing_revisions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    cashDayId: text("cash_day_id").notNull(),
    revision: integer("revision").notNull(),
    kind: text("kind", { enum: ["close", "reopen"] }).notNull(),
    snapshot: jsonb("snapshot").$type<RevenueClosingSnapshot>(),
    reason: text("reason"),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    actorDisplayName: text("actor_display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("revenue_closing_revisions_number_unique").on(
      table.organizationId,
      table.cashDayId,
      table.revision,
    ),
    foreignKey({
      columns: [table.organizationId, table.cashDayId],
      foreignColumns: [revenueCashDay.organizationId, revenueCashDay.id],
    }),
    check(
      "revenue_closing_revisions_reason_check",
      sql`${table.reason} is null or char_length(btrim(${table.reason})) between 3 and 160`,
    ),
    check(
      "revenue_closing_revisions_shape_check",
      sql`(${table.kind} = 'close' and ${table.snapshot} is not null) or (${table.kind} = 'reopen' and ${table.snapshot} is null and ${table.reason} is not null)`,
    ),
  ],
)

export const revenueCommand = pgTable(
  "revenue_commands",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    key: text("key").notNull(),
    action: text("action").notNull(),
    fingerprint: text("fingerprint").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("revenue_commands_actor_key_unique").on(
      table.organizationId,
      table.actorUserId,
      table.key,
    ),
    index("revenue_commands_resource_idx").on(
      table.organizationId,
      table.resourceType,
      table.resourceId,
    ),
  ],
)
