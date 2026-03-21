import * as p from 'drizzle-orm/pg-core';
import { authUsers } from './auth';

export const students = p.pgTable(
	'students',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		userId: p.uuid('user_id').notNull(),
		firstName: p.text('first_name').notNull(),
		lastName: p.text('last_name').notNull(),
		middleName: p.text('middle_name'),
		extName: p.text('ext_name'),
		sex: p.text(),
		birthdate: p.date(),
		contactNumber: p.text('contact_number'),
		email: p.text(),
		yearLevel: p.integer('year_level').notNull(),
		isActive: p.boolean('is_active').default(true),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p
			.foreignKey({
				columns: [table.userId],
				foreignColumns: [authUsers.id],
				name: 'students_user_id_fkey',
			})
			.onDelete('cascade'),
		p.unique('students_user_id_key').on(table.userId),
	],
);

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
