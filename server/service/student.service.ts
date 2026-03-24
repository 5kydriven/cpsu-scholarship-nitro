import { eq } from 'drizzle-orm';
import { db, students, type NewStudent } from '../db';
import { ConflictError, NotFoundError } from '#server/utils/errors.ts';

export const studentService = {
	async create(student: NewStudent) {
		const existingStudent = await db.query.students.findFirst({
			where: eq(students.id, student.id),
		});

		if (existingStudent) {
			throw new ConflictError(
				'Student already exists. Please update your profile instead.',
			);
		}

		const newStudent: NewStudent[] = await db
			.insert(students)
			.values(student)
			.returning();
		return newStudent;
	},

	// ── Get by ID ────────────────────────────
	async getById(id: string) {
		const student = await db.query.students.findFirst({
			with: {
				parents: true,
				address: true,
			},
		});

		if (!student) throw new NotFoundError('Student');
		return student;
	},

	async update(id: string, student: NewStudent) {},
};
