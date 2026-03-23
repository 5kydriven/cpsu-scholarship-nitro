CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"personnel_id" uuid,
	"street" text,
	"barangay" text NOT NULL,
	"city" text,
	"province" text,
	"zipcode" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "addresses_student_id_key" UNIQUE("student_id"),
	CONSTRAINT "addresses_personnel_id_key" UNIQUE("personnel_id"),
	CONSTRAINT "addresses_owner_check" CHECK ((
        (student_id is not null and personnel_id is null) or
        (student_id is null and personnel_id is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "personnels" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"middle_name" text,
	"ext_name" text,
	"sex" text,
	"birthdate" date,
	"contact_number" text,
	"department" text,
	"position" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"type" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"middle_name" text,
	"ext_name" text,
	"occupation" text,
	"monthly_income" text,
	"contact_number" text,
	"email" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "student_parents_student_type_key" UNIQUE("student_id","type"),
	CONSTRAINT "student_parents_type_check" CHECK (type = ANY (ARRAY['father'::text, 'mother'::text, 'guardian'::text]))
);
--> statement-breakpoint
CREATE TABLE "students" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"middle_name" text,
	"ext_name" text,
	"sex" text,
	"birthdate" date,
	"contact_number" text,
	"email" text,
	"year_level" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnels"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnels" ADD CONSTRAINT "personnels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;