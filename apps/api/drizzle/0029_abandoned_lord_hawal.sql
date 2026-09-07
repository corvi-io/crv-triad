ALTER TABLE "report_requests" DROP CONSTRAINT "report_requests_version_check";--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "report_type" text DEFAULT 'sales_revenue' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "config_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "config_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "requester_email" text;--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "requester_email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "email_delivery_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "email_delivery_failure_code" text;--> statement-breakpoint
ALTER TABLE "report_requests" ADD COLUMN "email_delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_requests" ADD CONSTRAINT "report_requests_version_check" CHECK ("report_requests"."version" > 0 and "report_requests"."active_attempt" > 0 and "report_requests"."config_version" > 0);