import * as p from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { students } from './students';

export const studentParents = p.pgTable(
	'student_parents',
	{
		id: p.uuid().defaultRandom().primaryKey().notNull(),
		studentId: p.uuid('student_id').notNull(),
		// father, mother, or guardian
		type: p.text().notNull(),
		firstName: p.text('first_name').notNull(),
		lastName: p.text('last_name').notNull(),
		middleName: p.text('middle_name'),
		extName: p.text('ext_name'),
		occupation: p.text(),
		// store as numeric string to avoid float precision issues
		monthlyIncome: p.text('monthly_income'),
		contactNumber: p.text('contact_number'),
		email: p.text(),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		p
			.foreignKey({
				columns: [table.studentId],
				foreignColumns: [students.id],
				name: 'student_parents_student_id_fkey',
			})
			.onDelete('cascade'),
		// enforce valid type values
		p.check(
			'student_parents_type_check',
			sql`type = ANY (ARRAY['father'::text, 'mother'::text, 'guardian'::text])`,
		),
		// enforce max one row per type per student
		// e.g. can't have two mothers
		p
			.unique('student_parents_student_type_key')
			.on(table.studentId, table.type),
	],
);

export type StudentParent = typeof studentParents.$inferSelect;
export type NewStudentParent = typeof studentParents.$inferInsert;
