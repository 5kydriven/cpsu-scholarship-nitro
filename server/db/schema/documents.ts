import * as p from 'drizzle-orm/pg-core';
import { applications } from './applications';

export const documents = p.pgTable('documents', {
	id: p.uuid().defaultRandom().primaryKey().notNull(),
	applicationId: p
		.uuid('application_id')
		.notNull()
		.references(() => applications.id, { onDelete: 'cascade' }),
	type: p.text().notNull(),
	url: p.text().notNull(),
	verified: p.boolean().default(false).notNull(),
	createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
