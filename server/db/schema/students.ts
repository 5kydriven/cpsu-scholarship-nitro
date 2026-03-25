import * as p from 'drizzle-orm/pg-core';
import { authUsers } from './auth';

export const students = p.pgTable('students', {
	id: p
		.uuid('user_id')
		.primaryKey()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	firstName: p.text('first_name'),
	lastName: p.text('last_name'),
	middleName: p.text('middle_name'),
	extName: p.text('ext_name'),
	sex: p.text(),
	birthdate: p.text(),
	contactNumber: p.text('contact_number'),
	email: p.text(),
	yearLevel: p.integer('year_level'),
	isActive: p.boolean('is_active').default(true),
	createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
