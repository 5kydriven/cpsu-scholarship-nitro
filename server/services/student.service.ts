import { and, asc, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { db, students, type NewStudent } from '../db';
import { ConflictError, NotFoundError } from '#server/utils/errors.ts';
import {
	paramsSchema,
	type PaginationInput,
} from '#server/validators/shared.validator.ts';
import { buildMeta, toOffset } from '#server/utils/pagination.ts';

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

	async getById(id: string) {
		const parsed = paramsSchema.safeParse({ id });

		if (!parsed.success) {
			throw new NotFoundError('Student');
		}

		const student = await db.query.students.findFirst({
			where: eq(students.id, id),
			with: {
				parents: true,
				address: true,
			},
		});

		if (!student) throw new NotFoundError('Student');

		return student;
	},

	async update(id: string, student: NewStudent) {},

	async getAll(
		query: PaginationInput & {
			q?: string;
			sortBy?: 'yearLevel';
			yearLevel?: number;
		},
	) {
		const { page, limit, sortOrder, q, sortBy, yearLevel } = query;

		const conditions: SQL[] = [];

		if (q) {
			conditions.push(
				or(
					ilike(students.firstName, `%${q}%`),
					ilike(students.lastName, `%${q}%`),
				)!,
			);
		}

		if (yearLevel) {
			conditions.push(eq(students.yearLevel, yearLevel));
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const orderCol =
			sortBy === 'yearLevel' ? students.yearLevel : students.createdAt;
		const order = sortOrder === 'desc' ? desc(orderCol) : asc(orderCol);

		const countResult = await db
			.select({ total: count() })
			.from(students)
			.where(where);

		const total = countResult[0]?.total ?? 0;

		const data = await db.query.students.findMany({
			where,
			with: {
				address: true,
				parents: true,
			},
			limit,
			offset: toOffset(page, limit),
			orderBy: order,
		});

		return {
			data,
			meta: buildMeta(total, page, limit),
		};
	},
};
