ALTER TABLE "idp_organizations" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "idp_organizations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_operators" ADD COLUMN "role" text DEFAULT 'support' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_operators" ADD CONSTRAINT "platform_operators_role_check" CHECK ("platform_operators"."role" in ('system_owner', 'operations', 'support', 'billing'));