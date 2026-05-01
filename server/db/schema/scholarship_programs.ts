import * as p from 'drizzle-orm/pg-core';

export const scholarshipPrograms = p.pgTable('scholarship_programs', {
	id: p.uuid().defaultRandom().primaryKey().notNull(),
	code: p.text(),
	name: p.text().notNull(),
	description: p.text(),
	defaultAmountPerSemester: p
		.numeric('default_amount_per_semester', { precision: 12, scale: 2 })
		.notNull(),
	isActive: p.boolean('is_active').default(true).notNull(),
	createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
});

export type ScholarshipProgram = typeof scholarshipPrograms.$inferSelect;
export type NewScholarshipProgram = typeof scholarshipPrograms.$inferInsert;
