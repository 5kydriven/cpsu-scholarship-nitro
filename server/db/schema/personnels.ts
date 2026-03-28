import * as p from 'drizzle-orm/pg-core';
import { authUsers } from './auth';

export const personnels = p.pgTable('personnels', {
	id: p
		.uuid('user_id')
		.primaryKey()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	firstName: p.text('first_name').notNull(),
	lastName: p.text('last_name').notNull(),
	middleName: p.text('middle_name'),
	extName: p.text('ext_name'),
	email: p.text(),
	sex: p.text(),
	birthdate: p.date(),
	contactNumber: p.text('contact_number'),
	department: p.text(),
	position: p.text(),
	createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export type Personnel = typeof personnels.$inferSelect;
export type NewPersonnel = typeof personnels.$inferInsert;
