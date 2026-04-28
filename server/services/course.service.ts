import { eq } from 'drizzle-orm';
import { courses, db, type NewCourse } from '../db';
import { NotFoundError } from '#server/utils/errors.ts';
import { paramsSchema } from '#server/validators/shared.validator.ts';

export const courseService = {
	async create(course: NewCourse) {
		const [result] = await db.insert(courses).values(course).returning();
		return result;
	},

	async getAll() {
		const courses = await db.query.courses.findMany();
		return courses;
	},

	async update(id: string, course: NewCourse) {
		const parsed = paramsSchema.safeParse({ id });

		if (!parsed.success) throw new NotFoundError('Course');

		const [result] = await db
			.update(courses)
			.set(course)
			.where(eq(courses.id, id))
			.returning();

		if (!result) throw new NotFoundError('Course');

		return result;
	},

	async delete(id: string) {
		const parsed = paramsSchema.safeParse({ id });

		if (!parsed.success) throw new NotFoundError('Course');

		const [course] = await db
			.delete(courses)
			.where(eq(courses.id, id))
			.returning();

		if (!course) throw new NotFoundError('Course');

		return course;
	},

	async deleteAll() {
		return await db.delete(courses).returning();
	},
};
