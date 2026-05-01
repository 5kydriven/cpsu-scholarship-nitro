import { and, asc, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import {
	addresses,
	db,
	studentParents,
	students,
	type NewAddress,
	type NewStudent,
	type NewStudentParent,
} from '../db';
import { ConflictError, NotFoundError } from '#server/utils/errors.ts';
import {
	paramsSchema,
	type PaginationInput,
} from '#server/validators/shared.validator.ts';
import { buildMeta, toOffset } from '#server/utils/pagination.ts';
import type { CreateStudentSchema } from '#server/validators/student.validation.ts';

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

	async upsertProfile(
		userId: string,
		email: string | undefined,
		input: CreateStudentSchema,
	) {
		return await db.transaction(async (tx) => {
			const studentValues = {
				id: userId,
				studentId: input.studentId,
				firstName: input.firstName,
				lastName: input.lastName,
				middleName: input.middleName,
				extName: input.extName,
				birthdate: input.birthdate,
				birthplace: input.birthplace,
				contactNumber: input.contactNumber,
				email: input.email ?? email,
				sex: input.sex,
				courseId: input.courseId,
				yearLevel: input.yearLevel,
			} satisfies NewStudent;

			const existingStudent = await tx.query.students.findFirst({
				where: eq(students.id, userId),
			});

			const [student] = existingStudent
				? await tx
						.update(students)
						.set(studentValues)
						.where(eq(students.id, userId))
						.returning()
				: await tx.insert(students).values(studentValues).returning();

			const addressValues = {
				studentId: userId,
				street: input.address.street,
				barangay: input.address.barangay,
				city: input.address.city,
				province: input.address.province,
				zipcode: input.address.zipcode,
			} satisfies NewAddress;

			const existingAddress = await tx.query.addresses.findFirst({
				where: eq(addresses.studentId, userId),
			});

			const [address] = existingAddress
				? await tx
						.update(addresses)
						.set(addressValues)
						.where(eq(addresses.studentId, userId))
						.returning()
				: await tx.insert(addresses).values(addressValues).returning();

			await tx.delete(studentParents).where(eq(studentParents.studentId, userId));

			const parentRows = input.parents.map(
				(parent) =>
					({
						studentId: userId,
						type: parent.type,
						firstName: parent.firstName,
						lastName: parent.lastName,
						middleName: parent.middleName,
						extName: parent.extName,
						occupation: parent.occupation,
						monthlyIncome: parent.monthlyIncome,
						status: parent.status,
						contactNumber: parent.contactNumber,
						email: parent.email,
					}) satisfies NewStudentParent,
			);

			const parents = await tx.insert(studentParents).values(parentRows).returning();

			return {
				student,
				address,
				parents,
			};
		});
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
