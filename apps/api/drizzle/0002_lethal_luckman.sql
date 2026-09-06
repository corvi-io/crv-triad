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
ALTER TABLE "availability_commands" ADD CONSTRAINT "availability_commands_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_commands" ADD CONSTRAINT "availability_commands_actor_user_id_idp_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."idp_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_commands_actor_key_unique" ON "availability_commands" USING btree ("organization_id","actor_user_id","key");--> statement-breakpoint
CREATE INDEX "availability_commands_resource_idx" ON "availability_commands" USING btree ("organization_id","resource_id","created_at");