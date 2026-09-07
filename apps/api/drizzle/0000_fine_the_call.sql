CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
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
CREATE TABLE "availability_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"action" text NOT NULL,
	"resource_id" text NOT NULL,
	"resource_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_series" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"professional_id" text NOT NULL,
	"kind" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"weekdays" text[] NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"excluded_dates" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_series_interval_check" CHECK ("availability_series"."start" < "availability_series"."end" and ("availability_series"."effective_until" is null or "availability_series"."effective_until" >= "availability_series"."effective_from") and "availability_series"."version" > 0),
	CONSTRAINT "availability_series_kind_check" CHECK ("availability_series"."kind" in ('available','break','blocked','absence'))
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
CREATE TABLE "business_logo_cleanups" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"object_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "business_logo_cleanups_attempts_check" CHECK ("business_logo_cleanups"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" text,
	"description" text,
	"website" text,
	"instagram" text,
	"primary_unit_id" text,
	"logo_object_key" text,
	"logo_content_type" text,
	"logo_byte_size" bigint,
	"logo_checksum" text,
	"logo_width" integer,
	"logo_height" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_profiles_display_name_check" CHECK (char_length(btrim("business_profiles"."display_name")) between 2 and 80),
	CONSTRAINT "business_profiles_description_check" CHECK ("business_profiles"."description" is null or char_length("business_profiles"."description") <= 500),
	CONSTRAINT "business_profiles_version_check" CHECK ("business_profiles"."version" > 0),
	CONSTRAINT "business_profiles_logo_shape_check" CHECK (("business_profiles"."logo_object_key" is null and "business_profiles"."logo_content_type" is null and "business_profiles"."logo_byte_size" is null and "business_profiles"."logo_checksum" is null and "business_profiles"."logo_width" is null and "business_profiles"."logo_height" is null) or ("business_profiles"."logo_object_key" is not null and "business_profiles"."logo_content_type" in ('image/jpeg','image/png','image/webp') and "business_profiles"."logo_byte_size" between 1 and 5242880 and "business_profiles"."logo_checksum" is not null and "business_profiles"."logo_width" between 1 and 4096 and "business_profiles"."logo_height" between 1 and 4096))
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
	"last_visit_at" timestamp with time zone,
	CONSTRAINT "clients_organization_id_unique" UNIQUE("organization_id","id"),
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
CREATE TABLE "commission_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receipt_id" text NOT NULL,
	"receipt_line_id" text NOT NULL,
	"original_fact_id" text,
	"kind" text NOT NULL,
	"professional_id" text NOT NULL,
	"professional_name" text NOT NULL,
	"service_id" text NOT NULL,
	"service_name" text NOT NULL,
	"rule" jsonb NOT NULL,
	"net_base_cents" bigint NOT NULL,
	"commission_cents" bigint NOT NULL,
	"barbershop_share_cents" bigint NOT NULL,
	"local_date" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_facts_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "commission_facts_amount_shape_check" CHECK (("commission_facts"."kind" = 'earned' and "commission_facts"."net_base_cents" >= 0 and "commission_facts"."commission_cents" >= 0 and "commission_facts"."barbershop_share_cents" >= 0 and "commission_facts"."net_base_cents" = "commission_facts"."commission_cents" + "commission_facts"."barbershop_share_cents" and "commission_facts"."original_fact_id" is null) or ("commission_facts"."kind" = 'reversal' and "commission_facts"."net_base_cents" <= 0 and "commission_facts"."commission_cents" <= 0 and "commission_facts"."barbershop_share_cents" <= 0 and "commission_facts"."net_base_cents" = "commission_facts"."commission_cents" + "commission_facts"."barbershop_share_cents" and "commission_facts"."original_fact_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "commission_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"professional_id" text NOT NULL,
	"service_id" text,
	"kind" text NOT NULL,
	"basis_points" integer,
	"fixed_cents" bigint,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_policies_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "commission_policies_rule_shape_check" CHECK (("commission_policies"."kind" = 'percentage' and "commission_policies"."basis_points" between 1 and 10000 and "commission_policies"."fixed_cents" is null) or ("commission_policies"."kind" = 'fixed' and "commission_policies"."fixed_cents" > 0 and "commission_policies"."basis_points" is null and "commission_policies"."service_id" is not null) or ("commission_policies"."kind" = 'none' and "commission_policies"."basis_points" is null and "commission_policies"."fixed_cents" is null)),
	CONSTRAINT "commission_policies_version_check" CHECK ("commission_policies"."version" > 0)
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idp_members_organization_id_unique" UNIQUE("organization_id","id")
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
	CONSTRAINT "professionals_organization_id_unique" UNIQUE("organization_id","id"),
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
CREATE TABLE "report_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"report_request_id" text NOT NULL,
	"attempt" integer NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"checksum" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "report_artifacts_size_check" CHECK ("report_artifacts"."byte_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "report_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"report_request_id" text NOT NULL,
	"attempt" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_run_reference" text,
	"safe_failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "report_attempts_number_check" CHECK ("report_attempts"."attempt" > 0)
);
--> statement-breakpoint
CREATE TABLE "report_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"format" text NOT NULL,
	"report_type" text DEFAULT 'sales_revenue' NOT NULL,
	"config_version" integer DEFAULT 1 NOT NULL,
	"config_snapshot" jsonb NOT NULL,
	"filters" jsonb NOT NULL,
	"requester_email" text NOT NULL,
	"requester_email_verified_at" timestamp with time zone NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"active_attempt" integer DEFAULT 1 NOT NULL,
	"provider_run_reference" text,
	"safe_failure_code" text,
	"email_delivery_status" text DEFAULT 'pending' NOT NULL,
	"email_delivery_failure_code" text,
	"email_delivery_attempt" integer DEFAULT 0 NOT NULL,
	"email_delivery_claimed_at" timestamp with time zone,
	"email_delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_requests_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "report_requests_version_check" CHECK ("report_requests"."version" > 0 and "report_requests"."active_attempt" > 0 and "report_requests"."config_version" > 0 and "report_requests"."email_delivery_attempt" >= 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_cash_days" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"local_date" text NOT NULL,
	"timezone" text NOT NULL,
	"opening_cash_cents" bigint NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"opened_by" text NOT NULL,
	"opened_by_name" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_cash_days_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "revenue_cash_days_opening_check" CHECK ("revenue_cash_days"."opening_cash_cents" >= 0),
	CONSTRAINT "revenue_cash_days_version_check" CHECK ("revenue_cash_days"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_cash_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cash_day_id" text NOT NULL,
	"kind" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"reason" text,
	"original_movement_id" text,
	"receipt_id" text,
	"actor_user_id" text NOT NULL,
	"actor_display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_cash_movements_amount_check" CHECK ("revenue_cash_movements"."amount_cents" <> 0),
	CONSTRAINT "revenue_cash_movements_shape_check" CHECK (("revenue_cash_movements"."kind" = 'supply' and "revenue_cash_movements"."amount_cents" > 0 and "revenue_cash_movements"."reason" is not null and "revenue_cash_movements"."original_movement_id" is null and "revenue_cash_movements"."receipt_id" is null) or ("revenue_cash_movements"."kind" = 'withdrawal' and "revenue_cash_movements"."amount_cents" < 0 and "revenue_cash_movements"."reason" is not null and "revenue_cash_movements"."original_movement_id" is null and "revenue_cash_movements"."receipt_id" is null) or ("revenue_cash_movements"."kind" = 'movement-reversal' and "revenue_cash_movements"."reason" is not null and "revenue_cash_movements"."original_movement_id" is not null and "revenue_cash_movements"."receipt_id" is null) or ("revenue_cash_movements"."kind" in ('receipt', 'receipt-reversal') and "revenue_cash_movements"."reason" is null and "revenue_cash_movements"."original_movement_id" is null and "revenue_cash_movements"."receipt_id" is not null)),
	CONSTRAINT "revenue_cash_movements_reason_check" CHECK ("revenue_cash_movements"."reason" is null or char_length(btrim("revenue_cash_movements"."reason")) between 3 and 160)
);
--> statement-breakpoint
CREATE TABLE "revenue_checkouts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"client_id" text,
	"appointment_id" text,
	"customer_display_name" text NOT NULL,
	"unit_name" text NOT NULL,
	"timezone" text NOT NULL,
	"handoff_version" integer NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"discount_cents" bigint DEFAULT 0 NOT NULL,
	"surcharge_cents" bigint DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_checkouts_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "revenue_checkouts_amounts_check" CHECK ("revenue_checkouts"."discount_cents" >= 0 and "revenue_checkouts"."surcharge_cents" >= 0),
	CONSTRAINT "revenue_checkouts_version_check" CHECK ("revenue_checkouts"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_checkout_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"checkout_id" text NOT NULL,
	"kind" text NOT NULL,
	"line_id" text,
	"previous_cents" bigint NOT NULL,
	"next_cents" bigint NOT NULL,
	"reason" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_checkout_adjustments_reason_check" CHECK (char_length(btrim("revenue_checkout_adjustments"."reason")) between 3 and 160)
);
--> statement-breakpoint
CREATE TABLE "revenue_checkout_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"checkout_id" text NOT NULL,
	"item_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"price_cents" bigint NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "revenue_checkout_lines_price_check" CHECK ("revenue_checkout_lines"."price_cents" >= 0),
	CONSTRAINT "revenue_checkout_lines_version_check" CHECK ("revenue_checkout_lines"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_checkout_tenders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"checkout_id" text NOT NULL,
	"method" text NOT NULL,
	"applied_cents" bigint NOT NULL,
	"received_cents" bigint,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "revenue_checkout_tenders_applied_check" CHECK ("revenue_checkout_tenders"."applied_cents" > 0),
	CONSTRAINT "revenue_checkout_tenders_received_check" CHECK ("revenue_checkout_tenders"."received_cents" is null or "revenue_checkout_tenders"."received_cents" >= "revenue_checkout_tenders"."applied_cents")
);
--> statement-breakpoint
CREATE TABLE "revenue_closing_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cash_day_id" text NOT NULL,
	"revision" integer NOT NULL,
	"kind" text NOT NULL,
	"snapshot" jsonb,
	"reason" text,
	"actor_user_id" text NOT NULL,
	"actor_display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_closing_revisions_reason_check" CHECK ("revenue_closing_revisions"."reason" is null or char_length(btrim("revenue_closing_revisions"."reason")) between 3 and 160),
	CONSTRAINT "revenue_closing_revisions_shape_check" CHECK (("revenue_closing_revisions"."kind" = 'close' and "revenue_closing_revisions"."snapshot" is not null) or ("revenue_closing_revisions"."kind" = 'reopen' and "revenue_closing_revisions"."snapshot" is null and "revenue_closing_revisions"."reason" is not null))
);
--> statement-breakpoint
CREATE TABLE "revenue_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"key" text NOT NULL,
	"action" text NOT NULL,
	"fingerprint" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"method" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_methods_version_check" CHECK ("revenue_payment_methods"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"checkout_id" text NOT NULL,
	"replaces_receipt_id" text,
	"cash_day_id" text NOT NULL,
	"local_date" text NOT NULL,
	"timezone" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"subtotal_cents" bigint NOT NULL,
	"discount_cents" bigint NOT NULL,
	"surcharge_cents" bigint NOT NULL,
	"total_cents" bigint NOT NULL,
	"change_cents" bigint DEFAULT 0 NOT NULL,
	"checkout_version" integer NOT NULL,
	"policy_version" integer NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_display_name" text NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_receipts_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "revenue_receipts_amounts_check" CHECK ("revenue_receipts"."subtotal_cents" >= 0 and "revenue_receipts"."discount_cents" >= 0 and "revenue_receipts"."surcharge_cents" >= 0 and "revenue_receipts"."total_cents" = "revenue_receipts"."subtotal_cents" - "revenue_receipts"."discount_cents" + "revenue_receipts"."surcharge_cents" and "revenue_receipts"."total_cents" >= 0 and "revenue_receipts"."change_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_receipt_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receipt_id" text NOT NULL,
	"checkout_line_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"gross_cents" bigint NOT NULL,
	"net_cents" bigint NOT NULL,
	CONSTRAINT "revenue_receipt_lines_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "revenue_receipt_lines_amounts_check" CHECK ("revenue_receipt_lines"."gross_cents" >= 0 and "revenue_receipt_lines"."net_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_receipt_reversals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receipt_id" text NOT NULL,
	"cash_day_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"reason" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_display_name" text NOT NULL,
	"reversed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_receipt_reversals_reason_check" CHECK (char_length(btrim("revenue_receipt_reversals"."reason")) between 3 and 160)
);
--> statement-breakpoint
CREATE TABLE "revenue_receipt_tenders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receipt_id" text NOT NULL,
	"method" text NOT NULL,
	"applied_cents" bigint NOT NULL,
	"received_cents" bigint,
	CONSTRAINT "revenue_receipt_tenders_applied_check" CHECK ("revenue_receipt_tenders"."applied_cents" > 0),
	CONSTRAINT "revenue_receipt_tenders_received_check" CHECK (("revenue_receipt_tenders"."method" = 'cash' and "revenue_receipt_tenders"."received_cents" >= "revenue_receipt_tenders"."applied_cents") or ("revenue_receipt_tenders"."method" <> 'cash' and "revenue_receipt_tenders"."received_cents" is null))
);
--> statement-breakpoint
CREATE TABLE "scheduling_appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"professional_id" text NOT NULL,
	"service_id" text NOT NULL,
	"client_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"professional_name" text NOT NULL,
	"service_name" text NOT NULL,
	"unit_name" text NOT NULL,
	"timezone" text NOT NULL,
	"date" date NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"origin" text DEFAULT 'reception' NOT NULL,
	"cancellation_reason" text,
	"cancellation_note" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduling_appointments_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "scheduling_appointments_values_check" CHECK ("scheduling_appointments"."starts_at" < "scheduling_appointments"."ends_at" and "scheduling_appointments"."duration_minutes" > 0 and "scheduling_appointments"."price_cents" >= 0 and "scheduling_appointments"."version" > 0),
	CONSTRAINT "scheduling_appointments_status_check" CHECK ("scheduling_appointments"."status" in ('scheduled','confirmed','arrived','waiting','in-progress','completed','canceled','no-show'))
);
--> statement-breakpoint
CREATE TABLE "scheduling_appointment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"appointment_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_fields" text[] NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduling_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"resource_id" text NOT NULL,
	"resource_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduling_occupancies" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"professional_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"live" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduling_occupancies_range_check" CHECK ("scheduling_occupancies"."starts_at" < "scheduling_occupancies"."ends_at" and "scheduling_occupancies"."live" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE "service_desk_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"action" text NOT NULL,
	"resource_id" text NOT NULL,
	"resource_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_desk_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"changed_fields" text[] NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_desk_completed_handoffs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_desk_handoffs_visit_unique" UNIQUE("organization_id","visit_id")
);
--> statement-breakpoint
CREATE TABLE "service_desk_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"service_id" text NOT NULL,
	"professional_id" text,
	"service_name" text NOT NULL,
	"professional_name" text,
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sequence" integer NOT NULL,
	"planned_end_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_desk_items_values_check" CHECK ("service_desk_items"."sequence" between 1 and 20 and "service_desk_items"."duration_minutes" > 0 and "service_desk_items"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "service_desk_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"appointment_id" text,
	"client_id" text,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"customer_display_name" text NOT NULL,
	"guest_phone" text,
	"unit_name" text NOT NULL,
	"timezone" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"requested_service_id" text NOT NULL,
	"requested_professional_id" text,
	"arrived_at" timestamp with time zone NOT NULL,
	"submitted_local_arrival" text,
	"notes" text DEFAULT '' NOT NULL,
	"closure_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"called_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_desk_visits_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "service_desk_visits_version_check" CHECK ("service_desk_visits"."version" > 0),
	CONSTRAINT "service_desk_visits_notes_check" CHECK (char_length("service_desk_visits"."notes") <= 500),
	CONSTRAINT "service_desk_visits_customer_check" CHECK (char_length(btrim("service_desk_visits"."customer_display_name")) between 2 and 100)
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
	CONSTRAINT "services_organization_id_unique" UNIQUE("organization_id","id"),
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
	"timezone" text,
	"opening_periods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_organization_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "units_version_positive_check" CHECK ("units"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_user_id_idp_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_tenant_membership_fk" FOREIGN KEY ("organization_id","requester_membership_id") REFERENCES "public"."idp_members"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_plan_entitlements" ADD CONSTRAINT "access_plan_entitlements_plan_version_id_access_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."access_plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_plan_versions" ADD CONSTRAINT "access_plan_versions_plan_id_access_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."access_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tenant_subscriptions" ADD CONSTRAINT "access_tenant_subscriptions_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tenant_subscriptions" ADD CONSTRAINT "access_tenant_subscriptions_plan_version_id_access_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."access_plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_commands" ADD CONSTRAINT "availability_commands_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_commands" ADD CONSTRAINT "availability_commands_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_series" ADD CONSTRAINT "availability_series_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_series" ADD CONSTRAINT "availability_series_organization_id_professional_id_professionals_organization_id_id_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_operators" ADD CONSTRAINT "platform_operators_user_id_idp_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_audit" ADD CONSTRAINT "platform_support_audit_operator_id_platform_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."platform_operators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_audit" ADD CONSTRAINT "platform_support_audit_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_audit" ADD CONSTRAINT "platform_support_audit_support_context_id_platform_support_contexts_id_fk" FOREIGN KEY ("support_context_id") REFERENCES "public"."platform_support_contexts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_contexts" ADD CONSTRAINT "platform_support_contexts_operator_id_platform_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."platform_operators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_support_contexts" ADD CONSTRAINT "platform_support_contexts_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_logo_cleanups" ADD CONSTRAINT "business_logo_cleanups_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_updated_by_idp_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_tenant_primary_unit_fk" FOREIGN KEY ("organization_id","primary_unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "commission_facts" ADD CONSTRAINT "commission_facts_tenant_receipt_fk" FOREIGN KEY ("organization_id","receipt_id") REFERENCES "public"."revenue_receipts"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_facts" ADD CONSTRAINT "commission_facts_tenant_receipt_line_fk" FOREIGN KEY ("organization_id","receipt_line_id") REFERENCES "public"."revenue_receipt_lines"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_facts" ADD CONSTRAINT "commission_facts_tenant_original_fk" FOREIGN KEY ("organization_id","original_fact_id") REFERENCES "public"."commission_facts"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_policies" ADD CONSTRAINT "commission_policies_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_policies" ADD CONSTRAINT "commission_policies_updated_by_idp_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_policies" ADD CONSTRAINT "commission_policies_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_policies" ADD CONSTRAINT "commission_policies_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_tenant_request_fk" FOREIGN KEY ("organization_id","report_request_id") REFERENCES "public"."report_requests"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_attempts" ADD CONSTRAINT "report_attempts_tenant_request_fk" FOREIGN KEY ("organization_id","report_request_id") REFERENCES "public"."report_requests"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_requests" ADD CONSTRAINT "report_requests_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_requests" ADD CONSTRAINT "report_requests_requester_user_id_idp_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cash_days" ADD CONSTRAINT "revenue_cash_days_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cash_days" ADD CONSTRAINT "revenue_cash_days_opened_by_idp_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cash_days" ADD CONSTRAINT "revenue_cash_days_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cash_movements" ADD CONSTRAINT "revenue_cash_movements_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cash_movements" ADD CONSTRAINT "revenue_cash_movements_organization_id_cash_day_id_revenue_cash_days_organization_id_id_fk" FOREIGN KEY ("organization_id","cash_day_id") REFERENCES "public"."revenue_cash_days"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_checkouts" ADD CONSTRAINT "revenue_checkouts_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_checkouts" ADD CONSTRAINT "revenue_checkouts_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_checkouts" ADD CONSTRAINT "revenue_checkouts_organization_id_visit_id_service_desk_completed_handoffs_organization_id_visit_id_fk" FOREIGN KEY ("organization_id","visit_id") REFERENCES "public"."service_desk_completed_handoffs"("organization_id","visit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_checkout_adjustments" ADD CONSTRAINT "revenue_checkout_adjustments_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_checkout_adjustments" ADD CONSTRAINT "revenue_checkout_adjustments_organization_id_checkout_id_revenue_checkouts_organization_id_id_fk" FOREIGN KEY ("organization_id","checkout_id") REFERENCES "public"."revenue_checkouts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_checkout_lines" ADD CONSTRAINT "revenue_checkout_lines_organization_id_checkout_id_revenue_checkouts_organization_id_id_fk" FOREIGN KEY ("organization_id","checkout_id") REFERENCES "public"."revenue_checkouts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_checkout_tenders" ADD CONSTRAINT "revenue_checkout_tenders_organization_id_checkout_id_revenue_checkouts_organization_id_id_fk" FOREIGN KEY ("organization_id","checkout_id") REFERENCES "public"."revenue_checkouts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_closing_revisions" ADD CONSTRAINT "revenue_closing_revisions_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_closing_revisions" ADD CONSTRAINT "revenue_closing_revisions_organization_id_cash_day_id_revenue_cash_days_organization_id_id_fk" FOREIGN KEY ("organization_id","cash_day_id") REFERENCES "public"."revenue_cash_days"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_commands" ADD CONSTRAINT "revenue_commands_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_commands" ADD CONSTRAINT "revenue_commands_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_payment_methods" ADD CONSTRAINT "revenue_payment_methods_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_payment_methods" ADD CONSTRAINT "revenue_payment_methods_updated_by_idp_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipts" ADD CONSTRAINT "revenue_receipts_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipts" ADD CONSTRAINT "revenue_receipts_organization_id_checkout_id_revenue_checkouts_organization_id_id_fk" FOREIGN KEY ("organization_id","checkout_id") REFERENCES "public"."revenue_checkouts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipts" ADD CONSTRAINT "revenue_receipts_organization_id_cash_day_id_revenue_cash_days_organization_id_id_fk" FOREIGN KEY ("organization_id","cash_day_id") REFERENCES "public"."revenue_cash_days"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipts" ADD CONSTRAINT "revenue_receipts_organization_id_replaces_receipt_id_revenue_receipts_organization_id_id_fk" FOREIGN KEY ("organization_id","replaces_receipt_id") REFERENCES "public"."revenue_receipts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipt_lines" ADD CONSTRAINT "revenue_receipt_lines_organization_id_receipt_id_revenue_receipts_organization_id_id_fk" FOREIGN KEY ("organization_id","receipt_id") REFERENCES "public"."revenue_receipts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipt_reversals" ADD CONSTRAINT "revenue_receipt_reversals_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipt_reversals" ADD CONSTRAINT "revenue_receipt_reversals_organization_id_receipt_id_revenue_receipts_organization_id_id_fk" FOREIGN KEY ("organization_id","receipt_id") REFERENCES "public"."revenue_receipts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipt_reversals" ADD CONSTRAINT "revenue_receipt_reversals_organization_id_cash_day_id_revenue_cash_days_organization_id_id_fk" FOREIGN KEY ("organization_id","cash_day_id") REFERENCES "public"."revenue_cash_days"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipt_tenders" ADD CONSTRAINT "revenue_receipt_tenders_organization_id_receipt_id_revenue_receipts_organization_id_id_fk" FOREIGN KEY ("organization_id","receipt_id") REFERENCES "public"."revenue_receipts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointments" ADD CONSTRAINT "scheduling_appointments_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointments" ADD CONSTRAINT "scheduling_appointments_organization_id_professional_id_professionals_organization_id_id_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointments" ADD CONSTRAINT "scheduling_appointments_organization_id_service_id_services_organization_id_id_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointments" ADD CONSTRAINT "scheduling_appointments_organization_id_client_id_clients_organization_id_id_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointment_events" ADD CONSTRAINT "scheduling_appointment_events_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointment_events" ADD CONSTRAINT "scheduling_appointment_events_organization_id_appointment_id_scheduling_appointments_organization_id_id_fk" FOREIGN KEY ("organization_id","appointment_id") REFERENCES "public"."scheduling_appointments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_commands" ADD CONSTRAINT "scheduling_commands_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_commands" ADD CONSTRAINT "scheduling_commands_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_occupancies" ADD CONSTRAINT "scheduling_occupancies_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_occupancies" ADD CONSTRAINT "scheduling_occupancies_organization_id_professional_id_professionals_organization_id_id_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_occupancies" ADD CONSTRAINT "scheduling_occupancies_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_commands" ADD CONSTRAINT "service_desk_commands_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_commands" ADD CONSTRAINT "service_desk_commands_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_events" ADD CONSTRAINT "service_desk_events_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_events" ADD CONSTRAINT "service_desk_events_organization_id_visit_id_service_desk_visits_organization_id_id_fk" FOREIGN KEY ("organization_id","visit_id") REFERENCES "public"."service_desk_visits"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_completed_handoffs" ADD CONSTRAINT "service_desk_completed_handoffs_organization_id_visit_id_service_desk_visits_organization_id_id_fk" FOREIGN KEY ("organization_id","visit_id") REFERENCES "public"."service_desk_visits"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_items" ADD CONSTRAINT "service_desk_items_organization_id_visit_id_service_desk_visits_organization_id_id_fk" FOREIGN KEY ("organization_id","visit_id") REFERENCES "public"."service_desk_visits"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_items" ADD CONSTRAINT "service_desk_items_organization_id_service_id_services_organization_id_id_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_items" ADD CONSTRAINT "service_desk_items_organization_id_professional_id_professionals_organization_id_id_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_visits" ADD CONSTRAINT "service_desk_visits_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_visits" ADD CONSTRAINT "service_desk_visits_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_visits" ADD CONSTRAINT "service_desk_visits_organization_id_appointment_id_scheduling_appointments_organization_id_id_fk" FOREIGN KEY ("organization_id","appointment_id") REFERENCES "public"."scheduling_appointments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_visits" ADD CONSTRAINT "service_desk_visits_organization_id_client_id_clients_organization_id_id_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_visits" ADD CONSTRAINT "service_desk_visits_organization_id_requested_service_id_services_organization_id_id_fk" FOREIGN KEY ("organization_id","requested_service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_desk_visits" ADD CONSTRAINT "service_desk_visits_organization_id_requested_professional_id_professionals_organization_id_id_fk" FOREIGN KEY ("organization_id","requested_professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE UNIQUE INDEX "availability_commands_actor_key_unique" ON "availability_commands" USING btree ("organization_id","actor_user_id","key");--> statement-breakpoint
CREATE INDEX "availability_commands_resource_idx" ON "availability_commands" USING btree ("organization_id","resource_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "availability_series_tenant_id_unique" ON "availability_series" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "availability_series_unit_range_idx" ON "availability_series" USING btree ("organization_id","unit_id","status","effective_from");--> statement-breakpoint
CREATE INDEX "availability_series_professional_idx" ON "availability_series" USING btree ("organization_id","professional_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_operators_user_id_unique" ON "platform_operators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_operators_status_idx" ON "platform_operators" USING btree ("status");--> statement-breakpoint
CREATE INDEX "platform_support_audit_organization_created_at_idx" ON "platform_support_audit" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_support_audit_operator_created_at_idx" ON "platform_support_audit" USING btree ("operator_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_support_audit_expiry_id_idx" ON "platform_support_audit" USING btree ("expires_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_support_contexts_credential_digest_unique" ON "platform_support_contexts" USING btree ("credential_digest");--> statement-breakpoint
CREATE INDEX "platform_support_contexts_operator_expiry_idx" ON "platform_support_contexts" USING btree ("operator_id","expires_at");--> statement-breakpoint
CREATE INDEX "platform_support_contexts_organization_expiry_idx" ON "platform_support_contexts" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_logo_cleanups_tenant_object_unique" ON "business_logo_cleanups" USING btree ("organization_id","object_key");--> statement-breakpoint
CREATE INDEX "business_logo_cleanups_pending_idx" ON "business_logo_cleanups" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_organization_unique" ON "business_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clients_organization_status_name_id_idx" ON "clients" USING btree ("organization_id","status","name","id");--> statement-breakpoint
CREATE INDEX "clients_organization_created_at_id_idx" ON "clients" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "clients_organization_normalized_phone_idx" ON "clients" USING btree ("organization_id","normalized_phone");--> statement-breakpoint
CREATE INDEX "clients_organization_normalized_email_idx" ON "clients" USING btree ("organization_id","normalized_email");--> statement-breakpoint
CREATE INDEX "clients_global_user_id_idx" ON "clients" USING btree ("global_user_id");--> statement-breakpoint
CREATE INDEX "clients_organization_last_visit_idx" ON "clients" USING btree ("organization_id","last_visit_at");--> statement-breakpoint
CREATE INDEX "client_notes_organization_client_created_at_idx" ON "client_notes" USING btree ("organization_id","client_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "client_notes_organization_client_id_unique" ON "client_notes" USING btree ("organization_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_professional_preferences_pair_unique" ON "client_professional_preferences" USING btree ("organization_id","client_id","professional_id");--> statement-breakpoint
CREATE INDEX "client_professional_preferences_professional_idx" ON "client_professional_preferences" USING btree ("organization_id","professional_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_service_preferences_pair_unique" ON "client_service_preferences" USING btree ("organization_id","client_id","service_id");--> statement-breakpoint
CREATE INDEX "client_service_preferences_service_idx" ON "client_service_preferences" USING btree ("organization_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_unit_preferences_pair_unique" ON "client_unit_preferences" USING btree ("organization_id","client_id","unit_id");--> statement-breakpoint
CREATE INDEX "client_unit_preferences_unit_idx" ON "client_unit_preferences" USING btree ("organization_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_facts_receipt_line_kind_unique" ON "commission_facts" USING btree ("organization_id","receipt_line_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_facts_original_reversal_unique" ON "commission_facts" USING btree ("organization_id","original_fact_id") WHERE "commission_facts"."original_fact_id" is not null;--> statement-breakpoint
CREATE INDEX "commission_facts_tenant_date_idx" ON "commission_facts" USING btree ("organization_id","local_date","occurred_at","id");--> statement-breakpoint
CREATE INDEX "commission_facts_professional_date_idx" ON "commission_facts" USING btree ("organization_id","professional_id","local_date","id");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_policies_default_unique" ON "commission_policies" USING btree ("organization_id","professional_id") WHERE "commission_policies"."service_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "commission_policies_override_unique" ON "commission_policies" USING btree ("organization_id","professional_id","service_id") WHERE "commission_policies"."service_id" is not null;--> statement-breakpoint
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
CREATE UNIQUE INDEX "report_artifacts_request_attempt_unique" ON "report_artifacts" USING btree ("organization_id","report_request_id","attempt");--> statement-breakpoint
CREATE UNIQUE INDEX "report_artifacts_object_key_unique" ON "report_artifacts" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "report_artifacts_expiry_idx" ON "report_artifacts" USING btree ("expires_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_attempts_number_unique" ON "report_attempts" USING btree ("organization_id","report_request_id","attempt");--> statement-breakpoint
CREATE INDEX "report_attempts_status_idx" ON "report_attempts" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_requests_tenant_key_unique" ON "report_requests" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "report_requests_history_idx" ON "report_requests" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "report_requests_status_idx" ON "report_requests" USING btree ("status","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_cash_days_unit_date_unique" ON "revenue_cash_days" USING btree ("organization_id","unit_id","local_date");--> statement-breakpoint
CREATE INDEX "revenue_cash_days_history_idx" ON "revenue_cash_days" USING btree ("organization_id","unit_id","local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_cash_movements_original_unique" ON "revenue_cash_movements" USING btree ("organization_id","original_movement_id");--> statement-breakpoint
CREATE INDEX "revenue_cash_movements_day_idx" ON "revenue_cash_movements" USING btree ("organization_id","cash_day_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_checkouts_tenant_visit_unique" ON "revenue_checkouts" USING btree ("organization_id","visit_id");--> statement-breakpoint
CREATE INDEX "revenue_checkouts_worklist_idx" ON "revenue_checkouts" USING btree ("organization_id","unit_id","status","finished_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_checkout_lines_item_unique" ON "revenue_checkout_lines" USING btree ("organization_id","checkout_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_checkout_lines_sequence_unique" ON "revenue_checkout_lines" USING btree ("organization_id","checkout_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_checkout_tenders_method_unique" ON "revenue_checkout_tenders" USING btree ("organization_id","checkout_id","method");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_closing_revisions_number_unique" ON "revenue_closing_revisions" USING btree ("organization_id","cash_day_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_commands_actor_key_unique" ON "revenue_commands" USING btree ("organization_id","actor_user_id","key");--> statement-breakpoint
CREATE INDEX "revenue_commands_resource_idx" ON "revenue_commands" USING btree ("organization_id","resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_methods_tenant_method_unique" ON "revenue_payment_methods" USING btree ("organization_id","method");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_receipts_active_checkout_unique" ON "revenue_receipts" USING btree ("organization_id","checkout_id") WHERE "revenue_receipts"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_receipts_replacement_unique" ON "revenue_receipts" USING btree ("organization_id","replaces_receipt_id");--> statement-breakpoint
CREATE INDEX "revenue_receipts_day_idx" ON "revenue_receipts" USING btree ("organization_id","cash_day_id","registered_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_receipt_lines_sequence_unique" ON "revenue_receipt_lines" USING btree ("organization_id","receipt_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_receipt_reversals_receipt_unique" ON "revenue_receipt_reversals" USING btree ("organization_id","receipt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_receipt_tenders_method_unique" ON "revenue_receipt_tenders" USING btree ("organization_id","receipt_id","method");--> statement-breakpoint
CREATE INDEX "scheduling_appointments_unit_date_idx" ON "scheduling_appointments" USING btree ("organization_id","unit_id","date","start","id");--> statement-breakpoint
CREATE INDEX "scheduling_appointments_professional_time_idx" ON "scheduling_appointments" USING btree ("organization_id","professional_id","starts_at");--> statement-breakpoint
CREATE INDEX "scheduling_appointments_client_time_idx" ON "scheduling_appointments" USING btree ("organization_id","client_id","starts_at");--> statement-breakpoint
CREATE INDEX "scheduling_appointments_service_idx" ON "scheduling_appointments" USING btree ("organization_id","service_id");--> statement-breakpoint
CREATE INDEX "scheduling_events_appointment_idx" ON "scheduling_appointment_events" USING btree ("organization_id","appointment_id","version");--> statement-breakpoint
CREATE INDEX "scheduling_events_actor_idx" ON "scheduling_appointment_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_commands_actor_key_unique" ON "scheduling_commands" USING btree ("organization_id","actor_user_id","key");--> statement-breakpoint
CREATE INDEX "scheduling_commands_actor_idx" ON "scheduling_commands" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_occupancies_source_unique" ON "scheduling_occupancies" USING btree ("organization_id","source","source_id");--> statement-breakpoint
CREATE INDEX "scheduling_occupancies_professional_time_idx" ON "scheduling_occupancies" USING btree ("organization_id","professional_id","starts_at","ends_at");--> statement-breakpoint
ALTER TABLE "scheduling_occupancies" ADD CONSTRAINT "scheduling_occupancies_no_overlap"
EXCLUDE USING gist (
	"organization_id" WITH =,
	"professional_id" WITH =,
	tstzrange("starts_at", "ends_at", '[)') WITH &&
);--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_occupancies_one_live_service"
ON "scheduling_occupancies" ("organization_id", "professional_id")
WHERE "source" = 'service' AND "live" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_commands_actor_key_unique" ON "service_desk_commands" USING btree ("organization_id","actor_user_id","key");--> statement-breakpoint
CREATE INDEX "service_desk_events_visit_idx" ON "service_desk_events" USING btree ("organization_id","visit_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_items_tenant_id_unique" ON "service_desk_items" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_items_visit_sequence_unique" ON "service_desk_items" USING btree ("organization_id","visit_id","sequence");--> statement-breakpoint
CREATE INDEX "service_desk_items_visit_idx" ON "service_desk_items" USING btree ("organization_id","visit_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_visits_tenant_appointment_unique" ON "service_desk_visits" USING btree ("organization_id","appointment_id");--> statement-breakpoint
CREATE INDEX "service_desk_visits_active_queue_idx" ON "service_desk_visits" USING btree ("organization_id","unit_id","status","arrived_at","id");--> statement-breakpoint
CREATE INDEX "service_desk_visits_client_history_idx" ON "service_desk_visits" USING btree ("organization_id","client_id","finished_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_services_pair_unique" ON "professional_services" USING btree ("organization_id","professional_id","service_id");--> statement-breakpoint
CREATE INDEX "professional_services_service_idx" ON "professional_services" USING btree ("organization_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_organization_normalized_name_unique" ON "services" USING btree ("organization_id","normalized_name");--> statement-breakpoint
CREATE INDEX "services_organization_status_name_id_idx" ON "services" USING btree ("organization_id","status","name","id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_units_pair_unique" ON "service_units" USING btree ("organization_id","service_id","unit_id");--> statement-breakpoint
CREATE INDEX "service_units_unit_idx" ON "service_units" USING btree ("organization_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "units_organization_normalized_code_unique" ON "units" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "units_organization_status_name_id_idx" ON "units" USING btree ("organization_id","status","name","id");
