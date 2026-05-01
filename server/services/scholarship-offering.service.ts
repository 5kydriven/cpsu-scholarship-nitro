import { and, asc, eq } from 'drizzle-orm';
import {
	db,
	scholarshipOfferings,
	scholarshipPrograms,
	type NewScholarshipOffering,
} from '../db';
import { BadRequestError, ConflictError, NotFoundError } from '#server/utils/errors.ts';
import { paramsSchema } from '#server/validators/shared.validator.ts';
import type { UpdateScholarshipOfferingSchema } from '#server/validators/scholarship-offering.validator.ts';

function assertValidId(id: string) {
	const parsed = paramsSchema.safeParse({ id });

	if (!parsed.success) throw new NotFoundError('Scholarship offering');
}

async function getProgram(programId: string) {
	const program = await db.query.scholarshipPrograms.findFirst({
		where: eq(scholarshipPrograms.id, programId),
	});

	if (!program) throw new NotFoundError('Scholarship program');

	return program;
}

async function assertCanOpenOffering(programId: string) {
	const program = await getProgram(programId);

	if (!program.isActive) {
		throw new BadRequestError('Cannot open an offering for an inactive program');
	}
}

async function assertOfferingIsUnique(
	programId: string,
	academicYear: string,
	semester: '1' | '2',
	currentId?: string,
) {
	const existing = await db.query.scholarshipOfferings.findFirst({
		where: and(
			eq(scholarshipOfferings.programId, programId),
			eq(scholarshipOfferings.academicYear, academicYear),
			eq(scholarshipOfferings.semester, semester),
		),
	});

	if (existing && existing.id !== currentId) {
		throw new ConflictError(
			'Scholarship offering already exists for this program, academic year, and semester',
		);
	}
}

export const scholarshipOfferingService = {
	async create(offering: NewScholarshipOffering) {
		await getProgram(offering.programId);

		if (offering.status === 'open') {
			await assertCanOpenOffering(offering.programId);
		}

		await assertOfferingIsUnique(
			offering.programId,
			offering.academicYear,
			offering.semester,
		);

		const [result] = await db
			.insert(scholarshipOfferings)
			.values(offering)
			.returning();

		return await this.getById(result.id);
	},

	async listOpen() {
		const offerings = await db.query.scholarshipOfferings.findMany({
			where: eq(scholarshipOfferings.status, 'open'),
			with: {
				program: true,
			},
			orderBy: asc(scholarshipOfferings.createdAt),
		});

		return offerings.filter((offering) => offering.program?.isActive);
	},

	async getById(id: string) {
		assertValidId(id);

		const offering = await db.query.scholarshipOfferings.findFirst({
			where: eq(scholarshipOfferings.id, id),
			with: {
				program: true,
			},
		});

		if (!offering) throw new NotFoundError('Scholarship offering');

		return offering;
	},

	async update(id: string, offering: UpdateScholarshipOfferingSchema) {
		assertValidId(id);

		const current = await db.query.scholarshipOfferings.findFirst({
			where: eq(scholarshipOfferings.id, id),
		});

		if (!current) throw new NotFoundError('Scholarship offering');

		const next = {
			...current,
			...offering,
		};

		if (offering.programId) {
			await getProgram(offering.programId);
		}

		if (next.status === 'open') {
			await assertCanOpenOffering(next.programId);
		}

		await assertOfferingIsUnique(
			next.programId,
			next.academicYear,
			next.semester,
			id,
		);

		const [result] = await db
			.update(scholarshipOfferings)
			.set({
				...offering,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(scholarshipOfferings.id, id))
			.returning();

		if (!result) throw new NotFoundError('Scholarship offering');

		return await this.getById(result.id);
	},
};
