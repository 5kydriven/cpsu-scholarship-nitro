import * as p from 'drizzle-orm/pg-core';
import { scholarshipPrograms } from './scholarship_programs';
import {
	scholarshipOfferingStatusEnum,
	semesterEnum,
} from './scholarship_enums';

export const scholarshipOfferings = p.pgTable(
	'scholarship_offerings',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		programId: p
			.uuid('program_id')
			.notNull()
			.references(() => scholarshipPrograms.id, { onDelete: 'cascade' }),
		academicYear: p.text('academic_year').notNull(),
		semester: semesterEnum().notNull(),
		allocatedBudget: p
			.numeric('allocated_budget', { precision: 14, scale: 2 })
			.notNull(),
		availableSlots: p.integer('available_slots'),
		applicationStartAt: p.timestamp('application_start_at', {
			mode: 'string',
		}),
		applicationEndAt: p.timestamp('application_end_at', { mode: 'string' }),
		status: scholarshipOfferingStatusEnum().default('draft').notNull(),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p
			.unique('scholarship_offerings_program_year_semester_key')
			.on(table.programId, table.academicYear, table.semester),
	],
);

export type ScholarshipOffering = typeof scholarshipOfferings.$inferSelect;
export type NewScholarshipOffering = typeof scholarshipOfferings.$inferInsert;
