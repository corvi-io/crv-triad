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
ALTER TABLE "units" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "availability_series" ADD CONSTRAINT "availability_series_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_series" ADD CONSTRAINT "availability_series_organization_id_professional_id_professionals_organization_id_id_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointments" ADD CONSTRAINT "scheduling_appointments_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointments" ADD CONSTRAINT "scheduling_appointments_organization_id_professional_id_professionals_organization_id_id_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointments" ADD CONSTRAINT "scheduling_appointments_organization_id_service_id_services_organization_id_id_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointments" ADD CONSTRAINT "scheduling_appointments_organization_id_client_id_clients_organization_id_id_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_appointments_tenant_id_unique" ON "scheduling_appointments" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "scheduling_appointment_events" ADD CONSTRAINT "scheduling_appointment_events_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_appointment_events" ADD CONSTRAINT "scheduling_appointment_events_organization_id_appointment_id_scheduling_appointments_organization_id_id_fk" FOREIGN KEY ("organization_id","appointment_id") REFERENCES "public"."scheduling_appointments"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_commands" ADD CONSTRAINT "scheduling_commands_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_commands" ADD CONSTRAINT "scheduling_commands_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_series_tenant_id_unique" ON "availability_series" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "availability_series_unit_range_idx" ON "availability_series" USING btree ("organization_id","unit_id","status","effective_from");--> statement-breakpoint
CREATE INDEX "availability_series_professional_idx" ON "availability_series" USING btree ("organization_id","professional_id");--> statement-breakpoint
CREATE INDEX "scheduling_appointments_unit_date_idx" ON "scheduling_appointments" USING btree ("organization_id","unit_id","date","start","id");--> statement-breakpoint
CREATE INDEX "scheduling_appointments_professional_time_idx" ON "scheduling_appointments" USING btree ("organization_id","professional_id","starts_at");--> statement-breakpoint
CREATE INDEX "scheduling_appointments_client_time_idx" ON "scheduling_appointments" USING btree ("organization_id","client_id","starts_at");--> statement-breakpoint
CREATE INDEX "scheduling_appointments_service_idx" ON "scheduling_appointments" USING btree ("organization_id","service_id");--> statement-breakpoint
CREATE INDEX "scheduling_events_appointment_idx" ON "scheduling_appointment_events" USING btree ("organization_id","appointment_id","version");--> statement-breakpoint
CREATE INDEX "scheduling_events_actor_idx" ON "scheduling_appointment_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_commands_actor_key_unique" ON "scheduling_commands" USING btree ("organization_id","actor_user_id","key");--> statement-breakpoint
CREATE INDEX "scheduling_commands_actor_idx" ON "scheduling_commands" USING btree ("actor_user_id");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE scheduling_appointments ADD CONSTRAINT scheduling_appointments_no_overlap
EXCLUDE USING gist (organization_id WITH =, professional_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
WHERE (status NOT IN ('canceled', 'no-show'));
