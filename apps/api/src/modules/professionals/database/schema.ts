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
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { invitation, organization, user } from "../../idp/database/schema.js"
import { unit } from "../../units/database/schema.js"

export const professional = pgTable(
  "professionals",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    commissionBasisPoints: integer("commission_basis_points").default(0).notNull(),
    specialties: text("specialties").array().default(sql`'{}'::text[]`).notNull(),
    globalUserId: text("global_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["active", "archived"] })
      .default("active")
      .notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("professionals_version_positive_check", sql`${table.version} > 0`),
    check(
      "professionals_commission_basis_points_check",
      sql`${table.commissionBasisPoints} between 0 and 10000`,
    ),
    uniqueIndex("professionals_organization_id_unique").on(table.organizationId, table.id),
    uniqueIndex("professionals_organization_user_unique").on(
      table.organizationId,
      table.globalUserId,
    ),
    index("professionals_organization_status_id_idx").on(
      table.organizationId,
      table.status,
      table.id,
    ),
    index("professionals_global_user_id_idx").on(table.globalUserId),
  ],
)

export const professionalInvitation = pgTable(
  "professional_invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    identityInvitationId: text("identity_invitation_id")
      .notNull()
      .references(() => invitation.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    commissionBasisPoints: integer("commission_basis_points").default(0).notNull(),
    specialties: text("specialties").array().default(sql`'{}'::text[]`).notNull(),
    assignments: jsonb("assignments")
      .$type<{ serviceIds: string[]; unitIds: string[] }>()
      .default({ serviceIds: [], unitIds: [] })
      .notNull(),
    status: text("status", { enum: ["pending", "accepted", "revoked", "expired"] })
      .default("pending")
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("professional_invitations_identity_unique").on(table.identityInvitationId),
    index("professional_invitations_org_status_idx").on(table.organizationId, table.status),
    index("professional_invitations_email_status_idx").on(table.email, table.status),
  ],
)

export const professionalUnit = pgTable(
  "professional_units",
  {
    organizationId: text("organization_id").notNull(),
    professionalId: text("professional_id").notNull(),
    unitId: text("unit_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.professionalId],
      foreignColumns: [professional.organizationId, professional.id],
      name: "professional_units_tenant_professional_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.unitId],
      foreignColumns: [unit.organizationId, unit.id],
      name: "professional_units_tenant_unit_fk",
    }).onDelete("restrict"),
    uniqueIndex("professional_units_pair_unique").on(
      table.organizationId,
      table.professionalId,
      table.unitId,
    ),
    index("professional_units_unit_idx").on(table.organizationId, table.unitId),
  ],
)
