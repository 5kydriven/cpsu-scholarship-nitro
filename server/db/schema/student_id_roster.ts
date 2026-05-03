import * as p from 'drizzle-orm/pg-core';
import { authUsers } from './auth';

export const studentIdRoster = p.pgTable(
	'student_id_roster',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		studentId: p.text('student_id').notNull(),
		fullName: p.text('full_name').notNull(),
		linkedUserId: p
			.uuid('linked_user_id')
			.references(() => authUsers.id, { onDelete: 'set null' }),
		linkedEmail: p.text('linked_email'),
		linkedAt: p.timestamp('linked_at', { mode: 'string' }),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: p.timestamp('updated_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p.unique('student_id_roster_student_id_key').on(table.studentId),
		p.unique('student_id_roster_linked_user_id_key').on(table.linkedUserId),
	],
);

export type StudentIdRoster = typeof studentIdRoster.$inferSelect;
export type NewStudentIdRoster = typeof studentIdRoster.$inferInsert;
