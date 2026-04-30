import * as p from 'drizzle-orm/pg-core';
import { payoutStatusEnum, semesterEnum } from './scholarship_enums';
import { personnels } from './personnels';
import { scholars } from './scholars';

export const payouts = p.pgTable(
	'payouts',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		scholarId: p
			.uuid('scholar_id')
			.notNull()
			.references(() => scholars.id, { onDelete: 'cascade' }),
		academicYear: p.text('academic_year').notNull(),
		semester: semesterEnum().notNull(),
		amount: p.numeric({ precision: 12, scale: 2 }).notNull(),
		status: payoutStatusEnum().default('pending').notNull(),
		releasedAt: p.timestamp('released_at', { mode: 'string' }),
		processedBy: p.uuid('processed_by').references(() => personnels.id, {
			onDelete: 'set null',
		}),
		referenceNo: p.text('reference_no'),
		remarks: p.text(),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p
			.unique('payouts_scholar_year_semester_key')
			.on(table.scholarId, table.academicYear, table.semester),
	],
);

export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
