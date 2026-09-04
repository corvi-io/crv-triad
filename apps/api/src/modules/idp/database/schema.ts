import { relations, sql } from "drizzle-orm"
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

export const user = pgTable("idp_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  status: text("status", { enum: ["active", "disabled"] })
    .default("active")
    .notNull(),
  role: text("role", { enum: ["admin", "member"] })
    .default("member")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const organization = pgTable(
  "idp_organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    metadata: text("metadata"),
    status: text("status", { enum: ["active", "disabled"] })
      .default("active")
      .notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idp_organizations_slug_unique").on(table.slug)],
)

export const session = pgTable(
  "idp_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("idp_sessions_user_id_idx").on(table.userId),
    index("idp_sessions_active_organization_id_idx").on(table.activeOrganizationId),
  ],
)

export const member = pgTable(
  "idp_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] })
      .default("member")
      .notNull(),
    status: text("status", { enum: ["active", "disabled"] })
      .default("active")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idp_members_organization_user_unique").on(table.organizationId, table.userId),
    uniqueIndex("idp_members_organization_id_unique").on(table.organizationId, table.id),
    index("idp_members_user_status_idx").on(table.userId, table.status),
    index("idp_members_organization_status_idx").on(table.organizationId, table.status),
    uniqueIndex("idp_members_one_active_owner_per_organization")
      .on(table.organizationId)
      .where(sql`${table.role} = 'owner' and ${table.status} = 'active'`),
  ],
)

export const organizationInvitation = pgTable(
  "idp_organization_invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["owner", "admin", "member"] }),
    status: text("status", { enum: ["pending", "accepted", "rejected", "canceled"] })
      .default("pending")
      .notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idp_organization_invitations_organization_id_idx").on(table.organizationId),
    index("idp_organization_invitations_email_idx").on(table.email),
    index("idp_organization_invitations_inviter_id_idx").on(table.inviterId),
  ],
)

export const account = pgTable(
  "idp_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idp_accounts_user_id_idx").on(table.userId),
    uniqueIndex("idp_accounts_provider_account_unique").on(table.providerId, table.accountId),
  ],
)

export const verification = pgTable(
  "idp_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idp_verifications_identifier_idx").on(table.identifier)],
)

export const invitation = pgTable(
  "idp_invitations",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    role: text("role", { enum: ["admin", "member"] })
      .default("member")
      .notNull(),
    status: text("status", {
      enum: ["pending", "accepted", "expired", "revoked", "superseded"],
    })
      .default("pending")
      .notNull(),
    tokenDigest: text("token_digest"),
    tokenIssuedAt: timestamp("token_issued_at", { withTimezone: true }),
    invitedByUserId: text("invited_by_user_id").references(() => user.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idp_invitations_email_status_idx").on(table.email, table.status),
    index("idp_invitations_invited_by_user_id_idx").on(table.invitedByUserId),
    uniqueIndex("idp_invitations_token_digest_unique").on(table.tokenDigest),
  ],
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(member),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
  activeOrganization: one(organization, {
    fields: [session.activeOrganizationId],
    references: [organization.id],
  }),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(organizationInvitation),
}))

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, { fields: [member.userId], references: [user.id] }),
}))

export const organizationInvitationRelations = relations(organizationInvitation, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationInvitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, {
    fields: [organizationInvitation.inviterId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  invitedBy: one(user, { fields: [invitation.invitedByUserId], references: [user.id] }),
  acceptedBy: one(user, { fields: [invitation.acceptedByUserId], references: [user.id] }),
}))
