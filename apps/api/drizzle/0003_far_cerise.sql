CREATE TABLE "lead_rate_limit_buckets" (
	"subject_digest" text NOT NULL,
	"window" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lead_rate_limit_buckets_subject_digest_window_window_started_at_pk" PRIMARY KEY("subject_digest","window","window_started_at")
);
