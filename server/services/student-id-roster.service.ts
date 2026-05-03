import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { db, studentIdRoster, type NewStudentIdRoster } from '../db';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from '#server/utils/errors.ts';

export interface StudentRosterImportRow {
	studentId: string;
	fullName: string;
}

export interface UpdateStudentIdRosterInput {
	studentId?: string;
	fullName?: string;
}

function now() {
	return new Date().toISOString();
}

export const studentIdRosterService = {
	async findByStudentId(studentId: string, executor: typeof db | any = db) {
		return await executor.query.studentIdRoster.findFirst({
			where: eq(studentIdRoster.studentId, studentId),
		});
	},

	async findById(id: string, executor: typeof db | any = db) {
		return await executor.query.studentIdRoster.findFirst({
			where: eq(studentIdRoster.id, id),
		});
	},

	async checkStatus(studentId: string) {
		const row = await this.findByStudentId(studentId);

		if (!row) {
			throw new NotFoundError('Student ID');
		}

		return {
			status: row.linkedUserId ? 'linked' : 'unlinked',
			studentId: row.studentId,
		};
	},

	async requireUnlinked(studentId: string, executor: typeof db | any = db) {
		const row = await this.findByStudentId(studentId, executor);

		if (!row) {
			throw new NotFoundError('Student ID');
		}

		if (row.linkedUserId) {
			throw new ConflictError('Student ID is already registered');
		}

		return row;
	},

	async requireLinkedEmail(studentId: string) {
		const row = await this.findByStudentId(studentId);

		if (!row) {
			throw new NotFoundError('Student ID');
		}

		if (!row.linkedUserId || !row.linkedEmail) {
			throw new BadRequestError('Student ID is not registered yet');
		}

		return row.linkedEmail;
	},

	async linkStudentId(
		studentId: string,
		userId: string,
		email: string,
		executor: typeof db | any = db,
	) {
		const timestamp = now();
		const [row] = await executor
			.update(studentIdRoster)
			.set({
				linkedUserId: userId,
				linkedEmail: email,
				linkedAt: timestamp,
				updatedAt: timestamp,
			})
			.where(
				and(
					eq(studentIdRoster.studentId, studentId),
					isNull(studentIdRoster.linkedUserId),
				),
			)
			.returning();

		if (!row) {
			await this.requireUnlinked(studentId, executor);
			throw new ConflictError('Student ID is already registered');
		}

		return row;
	},

	async assertUserCanUseStudentId(
		userId: string,
		studentId: string,
		executor: typeof db | any = db,
	) {
		const row = await executor.query.studentIdRoster.findFirst({
			where: eq(studentIdRoster.linkedUserId, userId),
		});

		if (row && row.studentId !== studentId) {
			throw new ConflictError('Student profile must use the linked student ID');
		}
	},

	async importRows(
		rows: StudentRosterImportRow[],
		executor: typeof db | any = db,
	) {
		let created = 0;
		let updated = 0;
		let linkedExisting = 0;

		for (const row of rows) {
			const existing = await this.findByStudentId(row.studentId, executor);
			const values = {
				studentId: row.studentId,
				fullName: row.fullName,
				updatedAt: now(),
			} satisfies NewStudentIdRoster;

			if (!existing) {
				await executor.insert(studentIdRoster).values(values).returning();
				created += 1;
				continue;
			}

			await executor
				.update(studentIdRoster)
				.set(values)
				.where(eq(studentIdRoster.studentId, row.studentId))
				.returning();

			updated += 1;
			if (existing.linkedUserId) linkedExisting += 1;
		}

		return {
			totalRows: rows.length,
			created,
			updated,
			linkedExisting,
		};
	},

	async updateById(
		id: string,
		input: UpdateStudentIdRosterInput,
		executor: typeof db | any = db,
	) {
		const existing = await this.findById(id, executor);

		if (!existing) {
			throw new NotFoundError('Student ID roster row');
		}

		if (input.studentId && input.studentId !== existing.studentId) {
			const duplicate = await this.findByStudentId(input.studentId, executor);

			if (duplicate && duplicate.id !== id) {
				throw new ConflictError('Student ID already exists');
			}
		}

		const [row] = await executor
			.update(studentIdRoster)
			.set({
				...input,
				updatedAt: now(),
			})
			.where(eq(studentIdRoster.id, id))
			.returning();

		return row;
	},

	async deleteById(id: string, executor: typeof db | any = db) {
		const [row] = await executor
			.delete(studentIdRoster)
			.where(eq(studentIdRoster.id, id))
			.returning();

		if (!row) {
			throw new NotFoundError('Student ID roster row');
		}

		return row;
	},

	async deleteBatch(input: { ids?: string[]; studentIds?: string[] }) {
		const conditions = [];

		if (input.ids?.length) {
			conditions.push(inArray(studentIdRoster.id, input.ids));
		}

		if (input.studentIds?.length) {
			conditions.push(inArray(studentIdRoster.studentId, input.studentIds));
		}

		const rows = await db
			.delete(studentIdRoster)
			.where(conditions.length === 1 ? conditions[0] : or(...conditions))
			.returning();

		return {
			deleted: rows.length,
			rows,
		};
	},
};
