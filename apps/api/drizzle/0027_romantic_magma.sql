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
	"filters" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"active_attempt" integer DEFAULT 1 NOT NULL,
	"provider_run_reference" text,
	"safe_failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_requests_tenant_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "report_requests_version_check" CHECK ("report_requests"."version" > 0 and "report_requests"."active_attempt" > 0)
);
--> statement-breakpoint
ALTER TABLE "business_logo_cleanups" ADD CONSTRAINT "business_logo_cleanups_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_updated_by_idp_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_tenant_primary_unit_fk" FOREIGN KEY ("organization_id","primary_unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_receipt_lines" ADD CONSTRAINT "revenue_receipt_lines_tenant_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "commission_facts" ADD CONSTRAINT "commission_facts_tenant_receipt_fk" FOREIGN KEY ("organization_id","receipt_id") REFERENCES "public"."revenue_receipts"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_facts" ADD CONSTRAINT "commission_facts_tenant_receipt_line_fk" FOREIGN KEY ("organization_id","receipt_line_id") REFERENCES "public"."revenue_receipt_lines"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_facts" ADD CONSTRAINT "commission_facts_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_facts" ADD CONSTRAINT "commission_facts_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_facts" ADD CONSTRAINT "commission_facts_tenant_original_fk" FOREIGN KEY ("organization_id","original_fact_id") REFERENCES "public"."commission_facts"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_policies" ADD CONSTRAINT "commission_policies_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_policies" ADD CONSTRAINT "commission_policies_updated_by_idp_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_policies" ADD CONSTRAINT "commission_policies_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_policies" ADD CONSTRAINT "commission_policies_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_tenant_request_fk" FOREIGN KEY ("organization_id","report_request_id") REFERENCES "public"."report_requests"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_attempts" ADD CONSTRAINT "report_attempts_tenant_request_fk" FOREIGN KEY ("organization_id","report_request_id") REFERENCES "public"."report_requests"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_requests" ADD CONSTRAINT "report_requests_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_requests" ADD CONSTRAINT "report_requests_requester_user_id_idp_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_logo_cleanups_tenant_object_unique" ON "business_logo_cleanups" USING btree ("organization_id","object_key");--> statement-breakpoint
CREATE INDEX "business_logo_cleanups_pending_idx" ON "business_logo_cleanups" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_organization_unique" ON "business_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_facts_receipt_line_kind_unique" ON "commission_facts" USING btree ("organization_id","receipt_line_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_facts_original_reversal_unique" ON "commission_facts" USING btree ("organization_id","original_fact_id") WHERE "commission_facts"."original_fact_id" is not null;--> statement-breakpoint
CREATE INDEX "commission_facts_tenant_date_idx" ON "commission_facts" USING btree ("organization_id","local_date","occurred_at","id");--> statement-breakpoint
CREATE INDEX "commission_facts_professional_date_idx" ON "commission_facts" USING btree ("organization_id","professional_id","local_date","id");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_policies_default_unique" ON "commission_policies" USING btree ("organization_id","professional_id") WHERE "commission_policies"."service_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "commission_policies_override_unique" ON "commission_policies" USING btree ("organization_id","professional_id","service_id") WHERE "commission_policies"."service_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "report_artifacts_request_attempt_unique" ON "report_artifacts" USING btree ("organization_id","report_request_id","attempt");--> statement-breakpoint
CREATE UNIQUE INDEX "report_artifacts_object_key_unique" ON "report_artifacts" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "report_artifacts_expiry_idx" ON "report_artifacts" USING btree ("expires_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_attempts_number_unique" ON "report_attempts" USING btree ("organization_id","report_request_id","attempt");--> statement-breakpoint
CREATE INDEX "report_attempts_status_idx" ON "report_attempts" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_requests_tenant_key_unique" ON "report_requests" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "report_requests_history_idx" ON "report_requests" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "report_requests_status_idx" ON "report_requests" USING btree ("status","updated_at","id");--> statement-breakpoint
INSERT INTO access_plan_entitlements (id, plan_version_id, capability_key, enabled)
SELECT md5(source.plan_version_id || ':initiative-25:' || target.capability_key), source.plan_version_id, target.capability_key, true
FROM access_plan_entitlements source
CROSS JOIN (VALUES ('business_profile.read'), ('business_profile.manage'), ('commissions.read'), ('commissions.manage'), ('reports.read'), ('reports.export')) AS target(capability_key)
WHERE source.capability_key = 'catalogs.read' AND source.enabled = true
ON CONFLICT (plan_version_id, capability_key) DO NOTHING;
