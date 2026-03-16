-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "programs_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"program_id" integer,
	"academic_year" text,
	"semester" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scholars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholar_identifier" text,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"ext_name" text,
	"sex" text,
	"contact" text,
	"email" text,
	"street" text,
	"city" text,
	"province" text,
	"zipcode" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scholars_sex_check" CHECK (sex = ANY (ARRAY['male'::text, 'female'::text]))
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholar_id" uuid,
	"program_id" integer,
	"course" text NOT NULL,
	"year_level" integer,
	"batch" text,
	"award_no" text,
	"app_no" text,
	"upload_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"last_name" text NOT NULL,
	"given_name" text NOT NULL,
	"middle_name" text,
	"ext_name" text,
	"sex" text,
	"birthdate" date,
	"contact_number" text,
	"email" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "students_student_id_key" UNIQUE("student_id"),
	CONSTRAINT "students_email_key" UNIQUE("email"),
	CONSTRAINT "students_sex_check" CHECK (sex = ANY (ARRAY['male'::text, 'female'::text]))
);
--> statement-breakpoint
CREATE TABLE "application_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"street" text,
	"barangay" text,
	"zipcode" text
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"type" text,
	"file_url" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "application_documents_type_check" CHECK (type = ANY (ARRAY['disability'::text, 'ip_group'::text]))
);
--> statement-breakpoint
CREATE TABLE "application_statuses" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"type" text,
	"last_name" text,
	"given_name" text,
	"middle_name" text,
	CONSTRAINT "application_parents_type_check" CHECK (type = ANY (ARRAY['father'::text, 'mother'::text]))
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"seq" integer,
	"program_name" text NOT NULL,
	"year_level" integer NOT NULL,
	"has_disability" boolean DEFAULT false,
	"has_ip_group" boolean DEFAULT false,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"batch" text,
	"award_no" text,
	"app_no" text,
	CONSTRAINT "applications_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_scholar_id_fkey" FOREIGN KEY ("scholar_id") REFERENCES "public"."scholars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_auth_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_addresses" ADD CONSTRAINT "application_addresses_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_parents" ADD CONSTRAINT "application_parents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scholars_city" ON "scholars" USING btree ("city" text_ops);--> statement-breakpoint
CREATE INDEX "idx_scholars_province" ON "scholars" USING btree ("province" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "scholars_unique_identity" ON "scholars" USING btree ("scholar_identifier" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_unique" ON "enrollments" USING btree ("scholar_id" int4_ops,"program_id" int4_ops,"batch" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollments_batch" ON "enrollments" USING btree ("batch" text_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollments_course" ON "enrollments" USING btree ("course" text_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollments_program" ON "enrollments" USING btree ("program_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollments_year_level" ON "enrollments" USING btree ("year_level" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_filter_combo" ON "enrollments" USING btree ("program_id" int4_ops,"batch" int4_ops,"course" int4_ops,"year_level" int4_ops);--> statement-breakpoint
CREATE INDEX "students_sex_idx" ON "students" USING btree ("sex" text_ops);--> statement-breakpoint
CREATE INDEX "idx_docs_app" ON "application_documents" USING btree ("application_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_parent_app" ON "application_parents" USING btree ("application_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_app_created_at" ON "applications" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_app_program" ON "applications" USING btree ("program_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_app_program_year" ON "applications" USING btree ("program_name" int4_ops,"year_level" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_app_status" ON "applications" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_app_student" ON "applications" USING btree ("student_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_app_student_status" ON "applications" USING btree ("student_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_app_year" ON "applications" USING btree ("year_level" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_application_filter" ON "applications" USING btree ("status" int4_ops,"program_name" int4_ops,"year_level" int4_ops);--> statement-breakpoint
CREATE INDEX "pending_queue_fast" ON "applications" USING btree ("status" text_ops,"created_at" timestamp_ops) WHERE (status = 'pending'::text);--> statement-breakpoint
CREATE UNIQUE INDEX "unique_approved_application" ON "applications" USING btree ("id" uuid_ops) WHERE (status = 'approved'::text);--> statement-breakpoint
CREATE UNIQUE INDEX "unique_pending_application" ON "applications" USING btree ("student_id" uuid_ops) WHERE (status = 'pending'::text);
*/