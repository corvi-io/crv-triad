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
ALTER TABLE "client_professional_preferences" ADD CONSTRAINT "client_professional_preferences_tenant_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_professional_preferences" ADD CONSTRAINT "client_professional_preferences_tenant_professional_fk" FOREIGN KEY ("organization_id","professional_id") REFERENCES "public"."professionals"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_preferences" ADD CONSTRAINT "client_service_preferences_tenant_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_preferences" ADD CONSTRAINT "client_service_preferences_tenant_service_fk" FOREIGN KEY ("organization_id","service_id") REFERENCES "public"."services"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_unit_preferences" ADD CONSTRAINT "client_unit_preferences_tenant_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_unit_preferences" ADD CONSTRAINT "client_unit_preferences_tenant_unit_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_professional_preferences_pair_unique" ON "client_professional_preferences" USING btree ("organization_id","client_id","professional_id");--> statement-breakpoint
CREATE INDEX "client_professional_preferences_professional_idx" ON "client_professional_preferences" USING btree ("organization_id","professional_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_service_preferences_pair_unique" ON "client_service_preferences" USING btree ("organization_id","client_id","service_id");--> statement-breakpoint
CREATE INDEX "client_service_preferences_service_idx" ON "client_service_preferences" USING btree ("organization_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_unit_preferences_pair_unique" ON "client_unit_preferences" USING btree ("organization_id","client_id","unit_id");--> statement-breakpoint
CREATE INDEX "client_unit_preferences_unit_idx" ON "client_unit_preferences" USING btree ("organization_id","unit_id");