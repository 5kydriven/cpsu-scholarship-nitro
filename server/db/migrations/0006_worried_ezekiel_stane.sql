CREATE TYPE "public"."application_status" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'released', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."scholar_status" AS ENUM('active', 'inactive', 'completed', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."scholarship_offering_status" AS ENUM('draft', 'open', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."semester" AS ENUM('1', '2', 'summer');--> statement-breakpoint
CREATE TABLE "application_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status" NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"form_type" text NOT NULL,
	"extra_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "applications_student_offering_key" UNIQUE("student_id","offering_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholar_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"semester" "semester" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"released_at" timestamp,
	"processed_by" uuid,
	"reference_no" text,
	"remarks" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payouts_scholar_year_semester_key" UNIQUE("scholar_id","academic_year","semester")
);
--> statement-breakpoint
CREATE TABLE "scholars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"scholar_no" text NOT NULL,
	"status" "scholar_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scholars_scholar_no_unique" UNIQUE("scholar_no"),
	CONSTRAINT "scholars_application_id_key" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "scholarship_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"semester" "semester" NOT NULL,
	"allocated_budget" numeric(14, 2) NOT NULL,
	"available_slots" integer NOT NULL,
	"application_start_at" timestamp,
	"application_end_at" timestamp,
	"status" "scholarship_offering_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scholarship_offerings_program_year_semester_key" UNIQUE("program_id","academic_year","semester")
);
--> statement-breakpoint
CREATE TABLE "scholarship_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_amount_per_semester" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scholarship_programs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_changed_by_personnels_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."personnels"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_offering_id_scholarship_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."scholarship_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_personnels_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."personnels"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_approved_by_personnels_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."personnels"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_scholar_id_scholars_id_fk" FOREIGN KEY ("scholar_id") REFERENCES "public"."scholars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_processed_by_personnels_user_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."personnels"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholars" ADD CONSTRAINT "scholars_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholars" ADD CONSTRAINT "scholars_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholars" ADD CONSTRAINT "scholars_offering_id_scholarship_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."scholarship_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_offerings" ADD CONSTRAINT "scholarship_offerings_program_id_scholarship_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."scholarship_programs"("id") ON DELETE cascade ON UPDATE no action;