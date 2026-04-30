import * as p from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { applicationStatusEnum } from './scholarship_enums';
import { personnels } from './personnels';
import { scholarshipOfferings } from './scholarship_offerings';
import { students } from './students';

export const applications = p.pgTable(
	'applications',
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
		status: applicationStatusEnum().default('pending').notNull(),
		formType: p.text('form_type').notNull(),
		extraAnswers: p
			.jsonb('extra_answers')
			.$type<Record<string, unknown>>()
			.default(sql`'{}'::jsonb`)
			.notNull(),
		submittedAt: p.timestamp('submitted_at', { mode: 'string' }),
		reviewedBy: p.uuid('reviewed_by').references(() => personnels.id, {
			onDelete: 'set null',
		}),
		reviewedAt: p.timestamp('reviewed_at', { mode: 'string' }),
		approvedBy: p.uuid('approved_by').references(() => personnels.id, {
			onDelete: 'set null',
		}),
		approvedAt: p.timestamp('approved_at', { mode: 'string' }),
		rejectionReason: p.text('rejection_reason'),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p
			.unique('applications_student_offering_key')
			.on(table.studentId, table.offeringId),
	],
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
