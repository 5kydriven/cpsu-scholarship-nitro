import * as p from 'drizzle-orm/pg-core';
import { students } from './students';
import { personnels } from './personnels';
import { sql } from 'drizzle-orm';

export const addresses = p.pgTable(
	'addresses',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		// only one of these will be filled at a time
		studentId: p.uuid('student_id'),
		personnelId: p.uuid('personnel_id'),
		// address fields
		street: p.text(),
		barangay: p.text().notNull(),
		city: p.text(),
		province: p.text(),
		zipcode: p.text(),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		// FKs
		p
			.foreignKey({
				columns: [table.studentId],
				foreignColumns: [students.id],
				name: 'addresses_student_id_fkey',
			})
			.onDelete('cascade'),
		p
			.foreignKey({
				columns: [table.personnelId],
				foreignColumns: [personnels.id],
				name: 'addresses_personnel_id_fkey',
			})
			.onDelete('cascade'),
		// enforce one address per person
		p.unique('addresses_student_id_key').on(table.studentId),
		p.unique('addresses_personnel_id_key').on(table.personnelId),
		// enforce only one FK is filled at a time
		p.check(
			'addresses_owner_check',
			sql`(
        (student_id is not null and personnel_id is null) or
        (student_id is null and personnel_id is not null)
      )`,
		),
	],
);

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
