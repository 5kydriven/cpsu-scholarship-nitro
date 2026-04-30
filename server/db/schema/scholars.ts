import * as p from 'drizzle-orm/pg-core';
import { applications } from './applications';
import { scholarStatusEnum } from './scholarship_enums';
import { scholarshipOfferings } from './scholarship_offerings';
import { students } from './students';

export const scholars = p.pgTable(
	'scholars',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		studentId: p
			.uuid('student_id')
			.notNull()
			.references(() => students.id, { onDelete: 'cascade' }),
		applicationId: p
			.uuid('application_id')
			.notNull()
			.references(() => applications.id, { onDelete: 'cascade' }),
		offeringId: p
			.uuid('offering_id')
			.notNull()
			.references(() => scholarshipOfferings.id, { onDelete: 'cascade' }),
		scholarNo: p.text('scholar_no').notNull().unique(),
		status: scholarStatusEnum().default('active').notNull(),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p.unique('scholars_application_id_key').on(table.applicationId),
	],
);

export type Scholar = typeof scholars.$inferSelect;
export type NewScholar = typeof scholars.$inferInsert;
