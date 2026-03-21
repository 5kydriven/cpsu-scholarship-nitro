import * as p from 'drizzle-orm/pg-core';
import { authUsers } from './auth';

export const personnels = p.pgTable(
	'personnels',
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
		department: p.text(),
		position: p.text(),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p
			.foreignKey({
				columns: [table.userId],
				foreignColumns: [authUsers.id],
				name: 'personnel_user_id_fkey',
			})
			.onDelete('cascade'),
		// one auth user = one personnel row
		p.unique('personnel_user_id_key').on(table.userId),
	],
);

export type Personnel = typeof personnels.$inferSelect;
export type NewPersonnel = typeof personnels.$inferInsert;
