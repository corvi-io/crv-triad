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
	"service_preferences" text[] DEFAULT '{}'::text[] NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "idp_sessions" ADD COLUMN "active_organization_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_global_user_id_idp_users_id_fk" FOREIGN KEY ("global_user_id") REFERENCES "public"."idp_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_members" ADD CONSTRAINT "idp_members_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_members" ADD CONSTRAINT "idp_members_user_id_idp_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."idp_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_organization_invitations" ADD CONSTRAINT "idp_organization_invitations_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idp_organization_invitations" ADD CONSTRAINT "idp_organization_invitations_inviter_id_idp_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."idp_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_organization_status_name_id_idx" ON "clients" USING btree ("organization_id","status","name","id");--> statement-breakpoint
CREATE INDEX "clients_organization_created_at_id_idx" ON "clients" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "clients_organization_normalized_phone_idx" ON "clients" USING btree ("organization_id","normalized_phone");--> statement-breakpoint
CREATE INDEX "clients_organization_normalized_email_idx" ON "clients" USING btree ("organization_id","normalized_email");--> statement-breakpoint
CREATE INDEX "clients_global_user_id_idx" ON "clients" USING btree ("global_user_id");--> statement-breakpoint
CREATE INDEX "client_notes_organization_client_created_at_idx" ON "client_notes" USING btree ("organization_id","client_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "client_notes_organization_client_id_unique" ON "client_notes" USING btree ("organization_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idp_members_organization_user_unique" ON "idp_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idp_members_user_status_idx" ON "idp_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idp_members_organization_status_idx" ON "idp_members" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idp_members_one_active_owner_per_organization" ON "idp_members" USING btree ("organization_id") WHERE "idp_members"."role" = 'owner' and "idp_members"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "idp_organizations_slug_unique" ON "idp_organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idp_organization_invitations_organization_id_idx" ON "idp_organization_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idp_organization_invitations_email_idx" ON "idp_organization_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idp_organization_invitations_inviter_id_idx" ON "idp_organization_invitations" USING btree ("inviter_id");--> statement-breakpoint
ALTER TABLE "idp_sessions" ADD CONSTRAINT "idp_sessions_active_organization_id_idp_organizations_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idp_sessions_active_organization_id_idx" ON "idp_sessions" USING btree ("active_organization_id");