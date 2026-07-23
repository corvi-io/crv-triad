ALTER TABLE "idp_invitations" ADD COLUMN "token_digest" text;--> statement-breakpoint
ALTER TABLE "idp_invitations" ADD COLUMN "token_issued_at" timestamp with time zone;--> statement-breakpoint
UPDATE "idp_invitations"
SET "status" = 'expired', "updated_at" = now()
WHERE "status" = 'pending' AND "token_digest" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idp_invitations_token_digest_unique" ON "idp_invitations" USING btree ("token_digest");
