-- Preserve the legacy preference projection expected by upgraded installations.
-- Canonical service relationships continue to live in client_service_preferences.
ALTER TABLE "clients"
ADD COLUMN IF NOT EXISTS "service_preferences" text[] DEFAULT '{}'::text[] NOT NULL;
