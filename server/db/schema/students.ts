import * as p from 'drizzle-orm/pg-core';
import { authUsers } from './auth';
import { courses } from './courses';

export const students = p.pgTable(
	'students',
	{
		id: p
			.uuid('user_id')
			.primaryKey()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		studentId: p.text('student_id'),
		firstName: p.text('first_name'),
		lastName: p.text('last_name'),
		middleName: p.text('middle_name'),
		extName: p.text('ext_name'),
		sex: p.text(),
		birthdate: p.text(),
		birthplace: p.text(),
		contactNumber: p.text('contact_number'),
		email: p.text(),
		courseId: p.uuid('course_id').references(() => courses.id),
		yearLevel: p.integer('year_level'),
		isActive: p.boolean('is_active').default(true),
		createdAt: p.timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [p.unique('students_student_id_key').on(table.studentId)],
);

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
