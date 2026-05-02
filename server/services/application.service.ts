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
	applicationStatusHistory,
	applications,
	db,
	scholars,
	students,
	type Application,
	type NewApplication,
} from '../db';
import { ConflictError, NotFoundError } from '#server/utils/errors.ts';
import type {
	ApplicationQuery,
	UpdateApplicationStatusInput,
} from '#server/validators/application.validator.ts';
import { buildMeta, toOffset } from '#server/utils/pagination.ts';

function toScholarNo(
	code: string | null,
	academicYear: string,
	semester: string,
) {
	const prefix = code?.trim() || 'SCH';
	const year = academicYear.replace(/[^0-9]/g, '');
	return `${prefix}-${year}-${semester}-${crypto.randomUUID().slice(0, 8)}`;
}

async function assertAvailableScholarSlot(
	offeringId: string,
	limit: number | null,
) {
	if (limit === null) return;

	const [result] = await db
		.select({ total: count() })
		.from(scholars)
		.where(eq(scholars.offeringId, offeringId));

	if ((result?.total ?? 0) >= limit) {
		throw new ConflictError(
			'No scholarship slots are available for this offering',
		);
	}
}

async function createScholarForApplication(
	tx: any,
	application: Application,
	offering: {
		academicYear: string;
		semester: string;
		program?: { code: string | null } | null;
	},
) {
	const existingScholar = await tx.query.scholars.findFirst({
		where: eq(scholars.applicationId, application.id),
	});

	if (existingScholar) return existingScholar;

	const [scholar] = await tx
		.insert(scholars)
		.values({
			studentId: application.studentId,
			applicationId: application.id,
			offeringId: application.offeringId,
			scholarNo: toScholarNo(
				offering.program?.code ?? null,
				offering.academicYear,
				offering.semester,
			),
			status: 'active',
		})
		.returning();

	return scholar;
}

export const applicationService = {
	async assertNotSubmitted(
		studentId: string,
		offeringId: string,
		executor: typeof db | any = db,
	) {
		const existingApplication = await executor.query.applications.findFirst({
			where: and(
				eq(applications.studentId, studentId),
				eq(applications.offeringId, offeringId),
			),
		});

		if (existingApplication) {
			throw new ConflictError(
				'You already submitted an application for this scholarship offering.',
			);
		}
	},

	async create(input: NewApplication, executor: typeof db | any = db) {
		const [application] = await executor
			.insert(applications)
			.values(input)
			.returning();

		return application;
	},

	async getByStudent(studentId: string) {
		return await db.query.applications.findMany({
			where: eq(applications.studentId, studentId),
			with: {
				offering: {
					with: {
						program: true,
					},
				},
				documents: true,
				statusHistory: true,
			},
			orderBy: desc(applications.createdAt),
		});
	},

	async list(query: ApplicationQuery) {
		const { page, limit, sortOrder, q, status, offeringId } = query;
		const conditions: SQL[] = [];

		if (status) conditions.push(eq(applications.status, status));
		if (offeringId) conditions.push(eq(applications.offeringId, offeringId));
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
							applications.studentId,
							matches.map((student) => student.id),
						)
					: eq(applications.studentId, crypto.randomUUID()),
			);
		}

		const where = conditions.length ? and(...conditions) : undefined;
		const orderColumn = applications.createdAt;
		const order = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn);

		const [countResult] = await db
			.select({ total: count() })
			.from(applications)
			.where(where);

		const data = await db.query.applications.findMany({
			where,
			with: {
				student: {
					with: {
						address: true,
						parents: true,
					},
				},
				offering: {
					with: {
						program: true,
					},
				},
				documents: true,
				scholar: true,
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

	async getById(id: string) {
		const application = await db.query.applications.findFirst({
			where: eq(applications.id, id),
			with: {
				student: {
					with: {
						address: true,
						parents: true,
					},
				},
				offering: {
					with: {
						program: true,
					},
				},
				documents: true,
				statusHistory: true,
				scholar: true,
			},
		});

		if (!application) throw new NotFoundError('Application');

		return application;
	},

	async updateStatus(
		id: string,
		input: UpdateApplicationStatusInput,
		personnelId: string,
	) {
		const current = await db.query.applications.findFirst({
			where: eq(applications.id, id),
			with: {
				offering: {
					with: {
						program: true,
					},
				},
				scholar: true,
			},
		});

		if (!current) throw new NotFoundError('Application');

		if (current.status === 'approved' || current.status === 'rejected') {
			throw new ConflictError('Application has already been finalized');
		}

		if (input.status === 'approved') {
			await assertAvailableScholarSlot(
				current.offeringId,
				current.offering.availableSlots,
			);
		}

		return await db.transaction(async (tx) => {
			const now = new Date().toISOString();
			const [application] = await tx
				.update(applications)
				.set({
					status: input.status,
					reviewedBy: personnelId,
					reviewedAt: now,
					approvedBy: input.status === 'approved' ? personnelId : null,
					approvedAt: input.status === 'approved' ? now : null,
					rejectionReason: input.status === 'rejected' ? input.reason : null,
					updatedAt: now,
				})
				.where(eq(applications.id, id))
				.returning();

			const [statusHistory] = await tx
				.insert(applicationStatusHistory)
				.values({
					applicationId: id,
					fromStatus: current.status,
					toStatus: input.status,
					changedBy: personnelId,
					reason:
						input.reason ??
						(input.status === 'approved'
							? 'Application approved'
							: 'Application rejected'),
				})
				.returning();

			const scholar =
				input.status === 'approved'
					? await createScholarForApplication(
							tx,
							application as Application,
							current.offering,
						)
					: null;

			return {
				application,
				statusHistory,
				scholar,
			};
		});
	},
};
