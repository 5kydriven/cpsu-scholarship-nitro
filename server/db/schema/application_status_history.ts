import * as p from 'drizzle-orm/pg-core';
import { applications } from './applications';
import { applicationStatusEnum } from './scholarship_enums';
import { personnels } from './personnels';

export const applicationStatusHistory = p.pgTable(
	'application_status_history',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		applicationId: p
			.uuid('application_id')
			.notNull()
			.references(() => applications.id, { onDelete: 'cascade' }),
		fromStatus: applicationStatusEnum('from_status'),
		toStatus: applicationStatusEnum('to_status').notNull(),
		changedBy: p.uuid('changed_by').references(() => personnels.id, {
			onDelete: 'set null',
		}),
		reason: p.text(),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
);

export type ApplicationStatusHistory =
	typeof applicationStatusHistory.$inferSelect;
export type NewApplicationStatusHistory =
	typeof applicationStatusHistory.$inferInsert;
