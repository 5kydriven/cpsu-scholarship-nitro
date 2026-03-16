import { pgTable, unique, serial, text, foreignKey, uuid, integer, timestamp, index, uniqueIndex, check, date, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const programs = pgTable("programs", {
	id: serial().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
}, (table) => [
	unique("programs_code_key").on(table.code),
]);

export const uploads = pgTable("uploads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fileName: text("file_name").notNull(),
	programId: integer("program_id"),
	academicYear: text("academic_year"),
	semester: text(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "uploads_program_id_fkey"
		}),
]);

export const scholars = pgTable("scholars", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	scholarIdentifier: text("scholar_identifier"),
	lastName: text("last_name").notNull(),
	firstName: text("first_name").notNull(),
	middleName: text("middle_name"),
	extName: text("ext_name"),
	sex: text(),
	contact: text(),
	email: text(),
	street: text(),
	city: text(),
	province: text(),
	zipcode: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_scholars_city").using("btree", table.city.asc().nullsLast().op("text_ops")),
	index("idx_scholars_province").using("btree", table.province.asc().nullsLast().op("text_ops")),
	uniqueIndex("scholars_unique_identity").using("btree", table.scholarIdentifier.asc().nullsLast().op("text_ops")),
	check("scholars_sex_check", sql`sex = ANY (ARRAY['male'::text, 'female'::text])`),
]);

export const enrollments = pgTable("enrollments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	scholarId: uuid("scholar_id"),
	programId: integer("program_id"),
	course: text().notNull(),
	yearLevel: integer("year_level"),
	batch: text(),
	awardNo: text("award_no"),
	appNo: text("app_no"),
	uploadId: uuid("upload_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("enrollments_unique").using("btree", table.scholarId.asc().nullsLast().op("int4_ops"), table.programId.asc().nullsLast().op("int4_ops"), table.batch.asc().nullsLast().op("int4_ops")),
	index("idx_enrollments_batch").using("btree", table.batch.asc().nullsLast().op("text_ops")),
	index("idx_enrollments_course").using("btree", table.course.asc().nullsLast().op("text_ops")),
	index("idx_enrollments_program").using("btree", table.programId.asc().nullsLast().op("int4_ops")),
	index("idx_enrollments_year_level").using("btree", table.yearLevel.asc().nullsLast().op("int4_ops")),
	index("idx_filter_combo").using("btree", table.programId.asc().nullsLast().op("int4_ops"), table.batch.asc().nullsLast().op("int4_ops"), table.course.asc().nullsLast().op("int4_ops"), table.yearLevel.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.scholarId],
			foreignColumns: [scholars.id],
			name: "enrollments_scholar_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "enrollments_program_id_fkey"
		}),
	foreignKey({
			columns: [table.uploadId],
			foreignColumns: [uploads.id],
			name: "enrollments_upload_id_fkey"
		}),
]);

export const students = pgTable("students", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	studentId: text("student_id").notNull(),
	lastName: text("last_name").notNull(),
	givenName: text("given_name").notNull(),
	middleName: text("middle_name"),
	extName: text("ext_name"),
	sex: text(),
	birthdate: date(),
	contactNumber: text("contact_number"),
	email: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("students_sex_idx").using("btree", table.sex.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "students_auth_fk"
		}).onDelete("cascade"),
	unique("students_student_id_key").on(table.studentId),
	unique("students_email_key").on(table.email),
	check("students_sex_check", sql`sex = ANY (ARRAY['male'::text, 'female'::text])`),
]);

export const applicationAddresses = pgTable("application_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: uuid("application_id"),
	street: text(),
	barangay: text(),
	zipcode: text(),
}, (table) => [
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "application_addresses_application_id_fkey"
		}).onDelete("cascade"),
]);

export const applicationDocuments = pgTable("application_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: uuid("application_id"),
	type: text(),
	fileUrl: text("file_url").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_docs_app").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "application_documents_application_id_fkey"
		}).onDelete("cascade"),
	check("application_documents_type_check", sql`type = ANY (ARRAY['disability'::text, 'ip_group'::text])`),
]);

export const applicationStatuses = pgTable("application_statuses", {
	code: text().primaryKey().notNull(),
});

export const applicationParents = pgTable("application_parents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: uuid("application_id"),
	type: text(),
	lastName: text("last_name"),
	givenName: text("given_name"),
	middleName: text("middle_name"),
}, (table) => [
	index("idx_parent_app").using("btree", table.applicationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "application_parents_application_id_fkey"
		}).onDelete("cascade"),
	check("application_parents_type_check", sql`type = ANY (ARRAY['father'::text, 'mother'::text])`),
]);

export const applications = pgTable("applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	studentId: uuid("student_id").notNull(),
	seq: integer(),
	programName: text("program_name").notNull(),
	yearLevel: integer("year_level").notNull(),
	hasDisability: boolean("has_disability").default(false),
	hasIpGroup: boolean("has_ip_group").default(false),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	batch: text(),
	awardNo: text("award_no"),
	appNo: text("app_no"),
}, (table) => [
	index("idx_app_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_app_program").using("btree", table.programName.asc().nullsLast().op("text_ops")),
	index("idx_app_program_year").using("btree", table.programName.asc().nullsLast().op("int4_ops"), table.yearLevel.asc().nullsLast().op("int4_ops")),
	index("idx_app_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_app_student").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	index("idx_app_student_status").using("btree", table.studentId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_app_year").using("btree", table.yearLevel.asc().nullsLast().op("int4_ops")),
	index("idx_application_filter").using("btree", table.status.asc().nullsLast().op("int4_ops"), table.programName.asc().nullsLast().op("int4_ops"), table.yearLevel.asc().nullsLast().op("int4_ops")),
	index("pending_queue_fast").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")).where(sql`(status = 'pending'::text)`),
	uniqueIndex("unique_approved_application").using("btree", table.id.asc().nullsLast().op("uuid_ops")).where(sql`(status = 'approved'::text)`),
	uniqueIndex("unique_pending_application").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")).where(sql`(status = 'pending'::text)`),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "applications_student_id_fkey"
		}).onDelete("cascade"),
	check("applications_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`),
]);
