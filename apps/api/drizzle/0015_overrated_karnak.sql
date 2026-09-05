ALTER TABLE "units" ADD COLUMN "opening_periods" jsonb;
--> statement-breakpoint
UPDATE "units"
SET "opening_periods" = jsonb_build_array(
  jsonb_build_object(
    'days', to_jsonb("opening_days"),
    'start', "opening_start",
    'end', "opening_end"
  )
);
--> statement-breakpoint
ALTER TABLE "units" ALTER COLUMN "opening_periods" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "units" ALTER COLUMN "opening_periods" SET NOT NULL;
