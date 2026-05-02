ALTER TABLE "student_parents" ADD COLUMN "status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "student_id" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "birthplace" text;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_status_check" CHECK (status = ANY (ARRAY['living'::text, 'deceased'::text, 'unknown'::text]));