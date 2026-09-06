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
CREATE UNIQUE INDEX "revenue_receipt_tenders_method_unique" ON "revenue_receipt_tenders" USING btree ("organization_id","receipt_id","method");