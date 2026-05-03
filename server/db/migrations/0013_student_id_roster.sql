CREATE TABLE "student_id_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"full_name" text NOT NULL,
	"linked_user_id" uuid,
	"linked_email" text,
	"linked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_id_roster_student_id_key" UNIQUE("student_id"),
	CONSTRAINT "student_id_roster_linked_user_id_key" UNIQUE("linked_user_id")
);
--> statement-breakpoint
ALTER TABLE "student_id_roster" ADD CONSTRAINT "student_id_roster_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;