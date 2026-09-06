CREATE TABLE "access_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"changed_fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"reason" text,
	"target_id" text,
	"outcome" text NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_audit_outcome_check" CHECK ("access_audit"."outcome" in ('allowed','denied','failed')),
	CONSTRAINT "access_audit_reason_length_check" CHECK ("access_audit"."reason" is null or char_length("access_audit"."reason") between 10 and 500)
);
--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"requester_membership_id" text NOT NULL,
	"capability_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_role" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_requests_status_check" CHECK ("access_requests"."status" in ('pending','approved','denied')),
	CONSTRAINT "access_requests_version_positive_check" CHECK ("access_requests"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "access_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_plan_entitlements" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_version_id" text NOT NULL,
	"capability_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"quota_key" text,
	"quota_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_plan_entitlements_quota_pair_check" CHECK (("access_plan_entitlements"."quota_key" is null and "access_plan_entitlements"."quota_limit" is null) or ("access_plan_entitlements"."quota_key" is not null and "access_plan_entitlements"."quota_limit" >= 0))
);
--> statement-breakpoint
CREATE TABLE "access_plan_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_plan_versions_version_positive_check" CHECK ("access_plan_versions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "access_tenant_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan_version_id" text NOT NULL,
	"state" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_tenant_subscriptions_state_check" CHECK ("access_tenant_subscriptions"."state" in ('active','expired','suspended')),
	CONSTRAINT "access_tenant_subscriptions_version_positive_check" CHECK ("access_tenant_subscriptions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "platform_operators" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"role" text DEFAULT 'support' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_operators_status_check" CHECK ("platform_operators"."status" in ('active', 'disabled')),
	CONSTRAINT "platform_operators_role_check" CHECK ("platform_operators"."role" in ('system_owner', 'operations', 'support', 'billing'))
);
--> statement-breakpoint
CREATE TABLE "platform_support_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"operator_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"support_context_id" text,
	"action" text NOT NULL,
	"target_id" text,
	"request_id" text NOT NULL,
	"outcome" text NOT NULL,
	"severity" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '365 days' NOT NULL,
	CONSTRAINT "platform_support_audit_outcome_check" CHECK ("platform_support_audit"."outcome" in ('allowed','denied','failed')),
	CONSTRAINT "platform_support_audit_severity_check" CHECK ("platform_support_audit"."severity" in ('normal','high'))
);
--> statement-breakpoint
CREATE TABLE "platform_support_contexts" (
	"id" text PRIMARY KEY NOT NULL,
	"operator_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"credential_digest" text NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_support_contexts_reason_length_check" CHECK (char_length("platform_support_contexts"."reason") between 10 and 500),
	CONSTRAINT "platform_support_contexts_expiry_check" CHECK ("platform_support_contexts"."expires_at" > "platform_support_contexts"."created_at" and "platform_support_contexts"."expires_at" <= "platform_support_contexts"."created_at" + interval '60 minutes')
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"global_user_id" text,
	"name" text NOT NULL,
	"phone" text,
	"normalized_phone" text,
	"email" text,
	"normalized_email" text,
	"preference_note" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_contact_required_check" CHECK ("clients"."normalized_phone" is not null or "clients"."normalized_email" is not null),
	CONSTRAINT "clients_version_positive_check" CHECK ("clients"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "client_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"body" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_notes_body_length_check" CHECK (char_length("client_notes"."body") between 1 and 2000),
	CONSTRAINT "client_notes_version_positive_check" CHECK ("client_notes"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "client_professional_preferences" (
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"professional_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_service_preferences" (
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_unit_preferences" (
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idp_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idp_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"token_digest" text,
	"token_issued_at" timestamp with time zone,
	"invited_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idp_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idp_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idp_organization_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"inviter_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idp_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "idp_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "idp_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"status" text DEFAULT 'active' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idp_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "idp_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_rate_limit_buckets" (
	"subject_digest" text NOT NULL,
	"window" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lead_rate_limit_buckets_subject_digest_window_window_started_at_pk" PRIMARY KEY("subject_digest","window","window_started_at")
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"commission_basis_points" integer DEFAULT 0 NOT NULL,
	"specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"global_user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_version_positive_check" CHECK ("professionals"."version" > 0),
	CONSTRAINT "professionals_commission_basis_points_check" CHECK ("professionals"."commission_basis_points" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "professional_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"identity_invitation_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"commission_basis_points" integer DEFAULT 0 NOT NULL,
	"specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"assignments" jsonb DEFAULT '{"serviceIds":[],"unitIds":[]}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_units" (
	"organization_id" text NOT NULL,
	"professional_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_services" (
	"organization_id" text NOT NULL,
	"professional_id" text NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_version_positive_check" CHECK ("services"."version" > 0),
	CONSTRAINT "services_duration_positive_check" CHECK ("services"."duration_minutes" > 0),
	CONSTRAINT "services_price_nonnegative_check" CHECK ("services"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "service_units" (
	"organization_id" text NOT NULL,
	"service_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"opening_days" text[] DEFAULT '{}'::text[] NOT NULL,
	"opening_start" text NOT NULL,
	"opening_end" text NOT NULL,
	"opening_periods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_version_positive_check" CHECK ("units"."version" > 0),
	CONSTRAINT "units_opening_time_check" CHECK ("units"."opening_start" < "units"."opening_end")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idp_members_organization_id_unique" ON "idp_members" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_organization_id_unique" ON "clients" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "professionals_organization_id_unique" ON "professionals" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_organization_id_unique" ON "services" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "units_organization_id_unique" ON "units" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_user_id_idp_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_tenant_membership_fk" FOREIGN KEY ("organization_id","requester_membership_id") REFERENCES "public"."idp_members"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_plan_entitlements" ADD CONSTRAINT "access_plan_entitlements_plan_version_id_access_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."access_plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_plan_versions" ADD CONSTRAINT "access_plan_versions_plan_id_access_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."access_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tenant_subscriptions" ADD CONSTRAINT "access_tenant_subscriptions_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tenant_subscriptions" ADD CONSTRAINT "access_tenant_subscriptions_plan_version_id_access_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."access_plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_operators" ADD CONSTRAINT "platform_operators_user_id_idp_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_audit" ADD CONSTRAINT "platform_support_audit_operator_id_platform_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."platform_operators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_audit" ADD CONSTRAINT "platform_support_audit_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_audit" ADD CONSTRAINT "platform_support_audit_support_context_id_platform_support_contexts_id_fk" FOREIGN KEY ("support_context_id") REFERENCES "public"."platform_support_contexts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_contexts" ADD CONSTRAINT "platform_support_contexts_operator_id_platform_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."platform_operators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_contexts" ADD CONSTRAINT "platform_support_contexts_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_global_user_id_idp_users_id_fk" FOREIGN KEY ("global_user_id") REFERENCES "public"."idp_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_tenant_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_professional_preferences" ADD CONSTRAINT "client_professional_preferences_tenant_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_professional_preferences" ADD CONSTRAINT "client_professional_preferences_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_preferences" ADD CONSTRAINT "client_service_preferences_tenant_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_preferences" ADD CONSTRAINT "client_service_preferences_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_unit_preferences" ADD CONSTRAINT "client_unit_preferences_tenant_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_unit_preferences" ADD CONSTRAINT "client_unit_preferences_tenant_unit_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_accounts" ADD CONSTRAINT "idp_accounts_user_id_idp_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."idp_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_invitations" ADD CONSTRAINT "idp_invitations_invited_by_user_id_idp_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_invitations" ADD CONSTRAINT "idp_invitations_accepted_by_user_id_idp_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_members" ADD CONSTRAINT "idp_members_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_members" ADD CONSTRAINT "idp_members_user_id_idp_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."idp_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_organization_invitations" ADD CONSTRAINT "idp_organization_invitations_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_organization_invitations" ADD CONSTRAINT "idp_organization_invitations_inviter_id_idp_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."idp_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_sessions" ADD CONSTRAINT "idp_sessions_user_id_idp_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."idp_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_sessions" ADD CONSTRAINT "idp_sessions_active_organization_id_idp_organizations_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_global_user_id_idp_users_id_fk" FOREIGN KEY ("global_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_invitations" ADD CONSTRAINT "professional_invitations_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_invitations" ADD CONSTRAINT "professional_invitations_identity_invitation_id_idp_invitations_id_fk" FOREIGN KEY ("identity_invitation_id") REFERENCES "public"."idp_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_units" ADD CONSTRAINT "professional_units_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_units" ADD CONSTRAINT "professional_units_tenant_unit_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_units" ADD CONSTRAINT "service_units_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_units" ADD CONSTRAINT "service_units_tenant_unit_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_audit_organization_created_idx" ON "access_audit" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "access_requests_one_pending_capability" ON "access_requests" USING btree ("organization_id","requester_membership_id","capability_key") WHERE "access_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "access_requests_organization_status_created_idx" ON "access_requests" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "access_plans_key_unique" ON "access_plans" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "access_plan_entitlements_version_capability_unique" ON "access_plan_entitlements" USING btree ("plan_version_id","capability_key");--> statement-breakpoint
CREATE UNIQUE INDEX "access_plan_versions_plan_version_unique" ON "access_plan_versions" USING btree ("plan_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "access_tenant_subscriptions_one_current" ON "access_tenant_subscriptions" USING btree ("organization_id") WHERE "access_tenant_subscriptions"."is_current" = true;--> statement-breakpoint
CREATE INDEX "access_tenant_subscriptions_plan_version_idx" ON "access_tenant_subscriptions" USING btree ("plan_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_operators_user_id_unique" ON "platform_operators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_operators_status_idx" ON "platform_operators" USING btree ("status");--> statement-breakpoint
CREATE INDEX "platform_support_audit_organization_created_at_idx" ON "platform_support_audit" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_support_audit_operator_created_at_idx" ON "platform_support_audit" USING btree ("operator_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_support_audit_expiry_id_idx" ON "platform_support_audit" USING btree ("expires_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_support_contexts_credential_digest_unique" ON "platform_support_contexts" USING btree ("credential_digest");--> statement-breakpoint
CREATE INDEX "platform_support_contexts_operator_expiry_idx" ON "platform_support_contexts" USING btree ("operator_id","expires_at");--> statement-breakpoint
CREATE INDEX "platform_support_contexts_organization_expiry_idx" ON "platform_support_contexts" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE INDEX "clients_organization_status_name_id_idx" ON "clients" USING btree ("organization_id","status","name","id");--> statement-breakpoint
CREATE INDEX "clients_organization_created_at_id_idx" ON "clients" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "clients_organization_normalized_phone_idx" ON "clients" USING btree ("organization_id","normalized_phone");--> statement-breakpoint
CREATE INDEX "clients_organization_normalized_email_idx" ON "clients" USING btree ("organization_id","normalized_email");--> statement-breakpoint
CREATE INDEX "clients_global_user_id_idx" ON "clients" USING btree ("global_user_id");--> statement-breakpoint
CREATE INDEX "client_notes_organization_client_created_at_idx" ON "client_notes" USING btree ("organization_id","client_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "client_notes_organization_client_id_unique" ON "client_notes" USING btree ("organization_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_professional_preferences_pair_unique" ON "client_professional_preferences" USING btree ("organization_id","client_id","professional_id");--> statement-breakpoint
CREATE INDEX "client_professional_preferences_professional_idx" ON "client_professional_preferences" USING btree ("organization_id","professional_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_service_preferences_pair_unique" ON "client_service_preferences" USING btree ("organization_id","client_id","service_id");--> statement-breakpoint
CREATE INDEX "client_service_preferences_service_idx" ON "client_service_preferences" USING btree ("organization_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_unit_preferences_pair_unique" ON "client_unit_preferences" USING btree ("organization_id","client_id","unit_id");--> statement-breakpoint
CREATE INDEX "client_unit_preferences_unit_idx" ON "client_unit_preferences" USING btree ("organization_id","unit_id");--> statement-breakpoint
CREATE INDEX "idp_accounts_user_id_idx" ON "idp_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idp_accounts_provider_account_unique" ON "idp_accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idp_invitations_email_status_idx" ON "idp_invitations" USING btree ("email","status");--> statement-breakpoint
CREATE INDEX "idp_invitations_invited_by_user_id_idx" ON "idp_invitations" USING btree ("invited_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idp_invitations_token_digest_unique" ON "idp_invitations" USING btree ("token_digest");--> statement-breakpoint
CREATE UNIQUE INDEX "idp_members_organization_user_unique" ON "idp_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idp_members_user_status_idx" ON "idp_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idp_members_organization_status_idx" ON "idp_members" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idp_members_one_active_owner_per_organization" ON "idp_members" USING btree ("organization_id") WHERE "idp_members"."role" = 'owner' and "idp_members"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "idp_organizations_slug_unique" ON "idp_organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idp_organization_invitations_organization_id_idx" ON "idp_organization_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idp_organization_invitations_email_idx" ON "idp_organization_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idp_organization_invitations_inviter_id_idx" ON "idp_organization_invitations" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "idp_sessions_user_id_idx" ON "idp_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idp_sessions_active_organization_id_idx" ON "idp_sessions" USING btree ("active_organization_id");--> statement-breakpoint
CREATE INDEX "idp_verifications_identifier_idx" ON "idp_verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "lead_rate_limit_buckets_expires_at_idx" ON "lead_rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "professionals_organization_user_unique" ON "professionals" USING btree ("organization_id","global_user_id");--> statement-breakpoint
CREATE INDEX "professionals_organization_status_id_idx" ON "professionals" USING btree ("organization_id","status","id");--> statement-breakpoint
CREATE INDEX "professionals_global_user_id_idx" ON "professionals" USING btree ("global_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_invitations_identity_unique" ON "professional_invitations" USING btree ("identity_invitation_id");--> statement-breakpoint
CREATE INDEX "professional_invitations_org_status_idx" ON "professional_invitations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "professional_invitations_email_status_idx" ON "professional_invitations" USING btree ("email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_units_pair_unique" ON "professional_units" USING btree ("organization_id","professional_id","unit_id");--> statement-breakpoint
CREATE INDEX "professional_units_unit_idx" ON "professional_units" USING btree ("organization_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_services_pair_unique" ON "professional_services" USING btree ("organization_id","professional_id","service_id");--> statement-breakpoint
CREATE INDEX "professional_services_service_idx" ON "professional_services" USING btree ("organization_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_organization_normalized_name_unique" ON "services" USING btree ("organization_id","normalized_name");--> statement-breakpoint
CREATE INDEX "services_organization_status_name_id_idx" ON "services" USING btree ("organization_id","status","name","id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_units_pair_unique" ON "service_units" USING btree ("organization_id","service_id","unit_id");--> statement-breakpoint
CREATE INDEX "service_units_unit_idx" ON "service_units" USING btree ("organization_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "units_organization_normalized_code_unique" ON "units" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "units_organization_status_name_id_idx" ON "units" USING btree ("organization_id","status","name","id");
