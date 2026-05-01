ALTER TABLE "payouts" ALTER COLUMN "semester" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "scholarship_offerings" ALTER COLUMN "semester" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."semester";--> statement-breakpoint
CREATE TYPE "public"."semester" AS ENUM('1', '2');--> statement-breakpoint
ALTER TABLE "payouts" ALTER COLUMN "semester" SET DATA TYPE "public"."semester" USING "semester"::"public"."semester";--> statement-breakpoint
ALTER TABLE "scholarship_offerings" ALTER COLUMN "semester" SET DATA TYPE "public"."semester" USING "semester"::"public"."semester";