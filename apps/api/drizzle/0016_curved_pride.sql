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
ALTER TABLE "professionals" DROP CONSTRAINT "professionals_global_user_id_idp_users_id_fk";
--> statement-breakpoint
DROP INDEX "professionals_organization_status_name_id_idx";--> statement-breakpoint
DELETE FROM "professionals" WHERE "global_user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "professionals" ALTER COLUMN "global_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "commission_basis_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_invitations" ADD CONSTRAINT "professional_invitations_organization_id_idp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."idp_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_invitations" ADD CONSTRAINT "professional_invitations_identity_invitation_id_idp_invitations_id_fk" FOREIGN KEY ("identity_invitation_id") REFERENCES "public"."idp_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professional_invitations_identity_unique" ON "professional_invitations" USING btree ("identity_invitation_id");--> statement-breakpoint
CREATE INDEX "professional_invitations_org_status_idx" ON "professional_invitations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "professional_invitations_email_status_idx" ON "professional_invitations" USING btree ("email","status");--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_global_user_id_idp_users_id_fk" FOREIGN KEY ("global_user_id") REFERENCES "public"."idp_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professionals_organization_user_unique" ON "professionals" USING btree ("organization_id","global_user_id");--> statement-breakpoint
CREATE INDEX "professionals_organization_status_id_idx" ON "professionals" USING btree ("organization_id","status","id");--> statement-breakpoint
ALTER TABLE "professionals" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "professionals" DROP COLUMN "contact_email";--> statement-breakpoint
ALTER TABLE "professionals" DROP COLUMN "contact_phone";--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_commission_basis_points_check" CHECK ("professionals"."commission_basis_points" between 0 and 10000);
