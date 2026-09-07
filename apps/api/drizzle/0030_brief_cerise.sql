ALTER TABLE "report_requests" DROP CONSTRAINT "report_requests_version_check";--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "email_delivery_attempt" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "email_delivery_claimed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "report_requests"
SET "email_delivery_status" = 'not_applicable',
    "email_delivery_failure_code" = NULL
WHERE "requester_email" IS NULL
  AND "email_delivery_status" IN ('pending', 'sending', 'failed');--> statement-breakpoint
ALTER TABLE "report_requests" ADD CONSTRAINT "report_requests_version_check" CHECK ("report_requests"."version" > 0 and "report_requests"."active_attempt" > 0 and "report_requests"."config_version" > 0 and "report_requests"."email_delivery_attempt" >= 0);
