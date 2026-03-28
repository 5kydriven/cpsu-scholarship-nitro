import * as p from 'drizzle-orm/pg-core';

export const courses = p.pgTable('courses', {
	id: p.uuid().defaultRandom().primaryKey().notNull(),
	name: p.text(),
	abbreviation: p.text(),
	major: p.text(),
	createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
