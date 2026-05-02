CREATE TYPE "public"."scholarship_intake_type" AS ENUM('public_application', 'staff_nomination');--> statement-breakpoint
CREATE TYPE "public"."nomination_status" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."payout_status" ADD VALUE 'received';--> statement-breakpoint
ALTER TABLE "scholarship_programs" ADD COLUMN "intake_type" "scholarship_intake_type" DEFAULT 'public_application' NOT NULL;--> statement-breakpoint
ALTER TABLE "scholarship_offerings" ALTER COLUMN "available_slots" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payouts" RENAME COLUMN "reference_no" TO "check_number";--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "received_at" timestamp;--> statement-breakpoint
CREATE TABLE "scholarship_nominations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"nominated_by" uuid,
	"application_id" uuid,
	"status" "nomination_status" DEFAULT 'pending' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scholarship_nominations_student_offering_key" UNIQUE("student_id","offering_id")
);--> statement-breakpoint
ALTER TABLE "scholarship_nominations" ADD CONSTRAINT "scholarship_nominations_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_nominations" ADD CONSTRAINT "scholarship_nominations_offering_id_scholarship_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."scholarship_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_nominations" ADD CONSTRAINT "scholarship_nominations_nominated_by_personnels_user_id_fk" FOREIGN KEY ("nominated_by") REFERENCES "public"."personnels"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_nominations" ADD CONSTRAINT "scholarship_nominations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
