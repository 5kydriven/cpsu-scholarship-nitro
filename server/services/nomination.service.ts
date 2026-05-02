import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	or,
	SQL,
} from 'drizzle-orm';
import {
	db,
	scholarshipNominations,
	scholarshipOfferings,
	students,
	type NewScholarshipNomination,
} from '../db';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from '#server/utils/errors.ts';
import { buildMeta, toOffset } from '#server/utils/pagination.ts';
import type {
	CreateNominationInput,
	NominationQuery,
} from '#server/validators/nomination.validator.ts';

export const nominationService = {
	async findPendingByStudentAndOffering(
		studentId: string,
		offeringId: string,
		executor: typeof db | any = db,
	) {
		return await executor.query.scholarshipNominations.findFirst({
			where: and(
				eq(scholarshipNominations.studentId, studentId),
				eq(scholarshipNominations.offeringId, offeringId),
				eq(scholarshipNominations.status, 'pending'),
			),
		});
	},

	async complete(
		id: string,
		applicationId: string,
		executor: typeof db | any = db,
	) {
		const [nomination] = await executor
			.update(scholarshipNominations)
			.set({
				applicationId,
				status: 'completed',
				updatedAt: new Date().toISOString(),
			})
			.where(eq(scholarshipNominations.id, id))
			.returning();

		return nomination;
	},

	async create(input: CreateNominationInput, personnelId: string) {
		const student = await db.query.students.findFirst({
			where: eq(students.studentId, input.studentId),
		});

		if (!student) throw new NotFoundError('Student');

		const offering = await db.query.scholarshipOfferings.findFirst({
			where: eq(scholarshipOfferings.id, input.offeringId),
			with: {
				program: true,
			},
		});

		if (!offering) throw new NotFoundError('Scholarship offering');
		if (offering.status !== 'open' || !offering.program?.isActive) {
			throw new BadRequestError('Scholarship offering is not open');
		}
		if (offering.program.intakeType !== 'staff_nomination') {
			throw new BadRequestError(
				'Only staff-nomination scholarship offerings accept nominations',
			);
		}

		const existing = await db.query.scholarshipNominations.findFirst({
			where: and(
				eq(scholarshipNominations.studentId, student.id),
				eq(scholarshipNominations.offeringId, input.offeringId),
			),
		});

		if (existing) {
			throw new ConflictError('Student is already nominated for this offering');
		}

		const [nomination] = await db
			.insert(scholarshipNominations)
			.values({
				studentId: student.id,
				offeringId: input.offeringId,
				nominatedBy: personnelId,
				remarks: input.remarks,
			} satisfies NewScholarshipNomination)
			.returning();

		return await this.getById(nomination?.id ?? '');
	},

	async getById(id: string) {
		const nomination = await db.query.scholarshipNominations.findFirst({
			where: eq(scholarshipNominations.id, id),
			with: {
				student: true,
				offering: {
					with: {
						program: true,
					},
				},
				nominator: true,
				application: true,
			},
		});

		if (!nomination) throw new NotFoundError('Nomination');

		return nomination;
	},

	async list(query: NominationQuery) {
		const { page, limit, sortOrder, q, offeringId, status } = query;
		const conditions: SQL[] = [];

		if (offeringId)
			conditions.push(eq(scholarshipNominations.offeringId, offeringId));
		if (status) conditions.push(eq(scholarshipNominations.status, status));
		if (q) {
			const matches = await db
				.select({ id: students.id })
				.from(students)
				.where(
					or(
						ilike(students.firstName, `%${q}%`),
						ilike(students.lastName, `%${q}%`),
					),
				);

			conditions.push(
				matches.length
					? inArray(
							scholarshipNominations.studentId,
							matches.map((student) => student.id),
						)
					: eq(scholarshipNominations.studentId, crypto.randomUUID()),
			);
		}

		const where = conditions.length ? and(...conditions) : undefined;
		const order =
			sortOrder === 'desc'
				? desc(scholarshipNominations.createdAt)
				: asc(scholarshipNominations.createdAt);

		const [countResult] = await db
			.select({ total: count() })
			.from(scholarshipNominations)
			.where(where);

		const data = await db.query.scholarshipNominations.findMany({
			where,
			with: {
				student: true,
				offering: {
					with: {
						program: true,
					},
				},
				nominator: true,
				application: true,
			},
			limit,
			offset: toOffset(page, limit),
			orderBy: order,
		});

		return {
			data,
			meta: buildMeta(countResult?.total ?? 0, page, limit),
		};
	},
};
