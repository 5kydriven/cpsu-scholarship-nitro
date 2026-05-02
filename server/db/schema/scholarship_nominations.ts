import * as p from 'drizzle-orm/pg-core';
import { applications } from './applications';
import { nominationStatusEnum } from './scholarship_enums';
import { scholarshipOfferings } from './scholarship_offerings';
import { personnels } from './personnels';
import { students } from './students';

export const scholarshipNominations = p.pgTable(
	'scholarship_nominations',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		studentId: p
			.uuid('student_id')
			.notNull()
			.references(() => students.id, { onDelete: 'cascade' }),
		offeringId: p
			.uuid('offering_id')
			.notNull()
			.references(() => scholarshipOfferings.id, { onDelete: 'cascade' }),
		nominatedBy: p.uuid('nominated_by').references(() => personnels.id, {
			onDelete: 'set null',
		}),
		applicationId: p.uuid('application_id').references(() => applications.id, {
			onDelete: 'set null',
		}),
		status: nominationStatusEnum().default('pending').notNull(),
		remarks: p.text(),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p
			.unique('scholarship_nominations_student_offering_key')
			.on(table.studentId, table.offeringId),
	],
);

export type ScholarshipNomination =
	typeof scholarshipNominations.$inferSelect;
export type NewScholarshipNomination =
	typeof scholarshipNominations.$inferInsert;
