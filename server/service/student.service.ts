import { eq } from 'drizzle-orm';
import { db, students, type NewStudent } from '../db';
import { NotFoundError } from '#server/utils/errors.ts';

export const studentService = {
	async create(student: NewStudent) {
		const newStudent: NewStudent[] = await db
			.insert(students)
			.values(student)
			.returning();
		return newStudent;
	},

	// ── Get by ID ────────────────────────────
	async getById(id: string) {
		const student = await db.query.students.findFirst({
			where: eq(students.id, id),
		});

		if (!student) throw new NotFoundError('Student');
		return student;
	},
};
