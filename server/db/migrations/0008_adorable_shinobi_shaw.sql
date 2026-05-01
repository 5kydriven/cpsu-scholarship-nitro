ALTER TABLE "scholarship_programs" DROP CONSTRAINT "scholarship_programs_code_unique";--> statement-breakpoint
ALTER TABLE "scholarship_programs" ALTER COLUMN "code" DROP NOT NULL;