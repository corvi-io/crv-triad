CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"global_user_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_version_positive_check" CHECK ("professionals"."version" > 0)
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
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_version_positive_check" CHECK ("units"."version" > 0),
	CONSTRAINT "units_opening_time_check" CHECK ("units"."opening_start" < "units"."opening_end")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "professionals_organization_id_unique" ON "professionals" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_organization_id_unique" ON "services" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "units_organization_id_unique" ON "units" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_global_user_id_idp_users_id_fk" FOREIGN KEY ("global_user_id") REFERENCES "public"."idp_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_units" ADD CONSTRAINT "professional_units_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_units" ADD CONSTRAINT "professional_units_tenant_unit_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_units" ADD CONSTRAINT "service_units_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_units" ADD CONSTRAINT "service_units_tenant_unit_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "professionals_organization_status_name_id_idx" ON "professionals" USING btree ("organization_id","status","name","id");--> statement-breakpoint
CREATE INDEX "professionals_global_user_id_idx" ON "professionals" USING btree ("global_user_id");--> statement-breakpoint
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
