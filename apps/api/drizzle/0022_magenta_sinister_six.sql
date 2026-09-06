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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	CONSTRAINT "service_desk_visits_version_check" CHECK ("service_desk_visits"."version" > 0),
	CONSTRAINT "service_desk_visits_notes_check" CHECK (char_length("service_desk_visits"."notes") <= 500),
	CONSTRAINT "service_desk_visits_customer_check" CHECK (char_length(btrim("service_desk_visits"."customer_display_name")) between 2 and 100)
);
--> statement-breakpoint
ALTER TABLE "service_desk_visits" ADD CONSTRAINT "service_desk_visits_tenant_id_key" UNIQUE ("organization_id", "id");--> statement-breakpoint
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
CREATE UNIQUE INDEX "scheduling_occupancies_source_unique" ON "scheduling_occupancies" USING btree ("organization_id","source","source_id");--> statement-breakpoint
CREATE INDEX "scheduling_occupancies_professional_time_idx" ON "scheduling_occupancies" USING btree ("organization_id","professional_id","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_commands_actor_key_unique" ON "service_desk_commands" USING btree ("organization_id","actor_user_id","key");--> statement-breakpoint
CREATE INDEX "service_desk_events_visit_idx" ON "service_desk_events" USING btree ("organization_id","visit_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_handoffs_visit_unique" ON "service_desk_completed_handoffs" USING btree ("organization_id","visit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_items_tenant_id_unique" ON "service_desk_items" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_items_visit_sequence_unique" ON "service_desk_items" USING btree ("organization_id","visit_id","sequence");--> statement-breakpoint
CREATE INDEX "service_desk_items_visit_idx" ON "service_desk_items" USING btree ("organization_id","visit_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_visits_tenant_id_unique" ON "service_desk_visits" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_desk_visits_tenant_appointment_unique" ON "service_desk_visits" USING btree ("organization_id","appointment_id");--> statement-breakpoint
CREATE INDEX "service_desk_visits_active_queue_idx" ON "service_desk_visits" USING btree ("organization_id","unit_id","status","arrived_at","id");--> statement-breakpoint
CREATE INDEX "service_desk_visits_client_history_idx" ON "service_desk_visits" USING btree ("organization_id","client_id","finished_at","id");
--> statement-breakpoint
INSERT INTO "scheduling_occupancies" ("id", "organization_id", "professional_id", "unit_id", "source", "source_id", "starts_at", "ends_at", "live")
SELECT md5("organization_id" || ':appointment:' || "id"), "organization_id", "professional_id", "unit_id", 'appointment', "id", "starts_at", "ends_at", 0
FROM "scheduling_appointments"
WHERE "status" NOT IN ('canceled', 'no-show', 'completed')
ON CONFLICT ("organization_id", "source", "source_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "scheduling_occupancies" ADD CONSTRAINT "scheduling_occupancies_no_overlap"
EXCLUDE USING gist (
  "organization_id" WITH =,
  "professional_id" WITH =,
  tstzrange("starts_at", "ends_at", '[)') WITH &&
);
--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_occupancies_one_live_service"
ON "scheduling_occupancies" ("organization_id", "professional_id")
WHERE "source" = 'service' AND "live" = 1;
--> statement-breakpoint
INSERT INTO access_plan_entitlements (id, plan_version_id, capability_key, enabled)
SELECT md5(source.plan_version_id || ':' || target.capability_key), source.plan_version_id, target.capability_key, true
FROM access_plan_entitlements source
CROSS JOIN (VALUES
  ('scheduling.read', 'service_desk.read'),
  ('scheduling.manage', 'service_desk.manage'),
  ('scheduling.manage', 'service_desk.correct')
) AS target(source_key, capability_key)
WHERE source.capability_key = target.source_key AND source.enabled = true
ON CONFLICT (plan_version_id, capability_key) DO NOTHING;
