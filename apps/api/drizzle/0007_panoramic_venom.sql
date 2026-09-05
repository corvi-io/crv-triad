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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_operators_status_check" CHECK ("platform_operators"."status" in ('active', 'disabled'))
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
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_requester_membership_id_idp_members_id_fk" FOREIGN KEY ("requester_membership_id") REFERENCES "public"."idp_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_user_id_idp_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "platform_support_contexts_organization_expiry_idx" ON "platform_support_contexts" USING btree ("organization_id","expires_at");