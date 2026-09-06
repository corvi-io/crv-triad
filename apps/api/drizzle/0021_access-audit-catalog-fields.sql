ALTER TABLE "access_audit" ADD COLUMN IF NOT EXISTS "entity_type" text;
--> statement-breakpoint
ALTER TABLE "access_audit" ADD COLUMN IF NOT EXISTS "changed_fields" text[] DEFAULT '{}'::text[] NOT NULL;
