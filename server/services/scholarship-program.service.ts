import { asc, eq } from 'drizzle-orm';
import { db, scholarshipPrograms, type NewScholarshipProgram } from '../db';
import { ConflictError, NotFoundError } from '#server/utils/errors.ts';
import { paramsSchema } from '#server/validators/shared.validator.ts';
import type { UpdateScholarshipProgramSchema } from '#server/validators/scholarship-program.validator.ts';

function assertValidId(id: string) {
	const parsed = paramsSchema.safeParse({ id });

	if (!parsed.success) throw new NotFoundError('Scholarship program');
}

async function assertCodeAvailable(code: string, currentId?: string) {
	const existing = await db.query.scholarshipPrograms.findFirst({
		where: eq(scholarshipPrograms.code, code),
	});

	if (existing && existing.id !== currentId) {
		throw new ConflictError('Scholarship program code already exists');
	}
}

export const scholarshipProgramService = {
	async create(program: NewScholarshipProgram) {
		const [result] = await db
			.insert(scholarshipPrograms)
			.values(program)
			.returning();

		return result;
	},

	async getAll() {
		return await db.query.scholarshipPrograms.findMany({
			orderBy: asc(scholarshipPrograms.name),
		});
	},

	async getById(id: string) {
		assertValidId(id);

		const program = await db.query.scholarshipPrograms.findFirst({
			where: eq(scholarshipPrograms.id, id),
		});

		if (!program) throw new NotFoundError('Scholarship program');

		return program;
	},

	async update(id: string, program: UpdateScholarshipProgramSchema) {
		assertValidId(id);

		if (program.code) {
			await assertCodeAvailable(program.code, id);
		}

		const [result] = await db
			.update(scholarshipPrograms)
			.set({
				...program,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(scholarshipPrograms.id, id))
			.returning();

		if (!result) throw new NotFoundError('Scholarship program');

		return result;
	},

	async delete(id: string) {
		assertValidId(id);

		const [program] = await db
			.delete(scholarshipPrograms)
			.where(eq(scholarshipPrograms.id, id))
			.returning();

		if (!program) throw new NotFoundError('Scholarship program');

		return program;
	},
};
