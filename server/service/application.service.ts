import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import {
	db,
	applicationAddresses,
	applicationParents,
	applications,
	students,
} from '../db';
import { ConflictError, InternalError, NotFoundError } from '../utils/errors';
import { buildMeta, toOffset } from '../utils/pagination';
import type {
	ApplicationQuery,
	SubmitApplicationInput,
	UpdateApplicationStatusInput,
} from '../validators/application.validator';
import { mailService } from './mail.service';

// ─────────────────────────────────────────────
// application.service.ts
//
// All address inserts use the REAL column names:
//   street (nullable), barangay, zipcode (nullable).
//   No municipality or region — those columns do not
//   exist in the current migration.
// ─────────────────────────────────────────────

export const applicationService = {
	// ── Submit (student) ─────────────────────
	async submit(studentId: string, input: SubmitApplicationInput) {
		const { address, parents, ...appFields } = input;

		try {
			const result = await db.transaction(async (tx) => {
				const [application] = await tx
					.insert(applications)
					.values({
						studentId,
						programName: appFields.programName,
						yearLevel: appFields.yearLevel,
						hasDisability: appFields.hasDisability,
						hasIpGroup: appFields.hasIpGroup,
						status: 'pending',
					})
					.returning();

				// Insert address — only columns that exist in the schema
				await tx.insert(applicationAddresses).values({
					applicationId: application.id,
					street: address.street ?? null,
					barangay: address.barangay,
					zipcode: address.zipcode ?? null,
				});

				if (parents.length > 0) {
					await tx.insert(applicationParents).values(
						parents.map((p) => ({
							applicationId: application.id,
							type: p.type,
							lastName: p.lastName ?? null,
							givenName: p.givenName ?? null,
							middleName: p.middleName ?? null,
						})),
					);
				}

				return application;
			});

			return result;
		} catch (err: unknown) {
			// Postgres unique_violation (23505) from unique_pending_application index
			const pgErr = err as { code?: string; constraint?: string };
			if (
				pgErr?.code === '23505' &&
				pgErr?.constraint === 'unique_pending_application'
			) {
				throw new ConflictError(
					'You already have a pending application. Please wait for it to be reviewed.',
				);
			}
			throw err;
		}
	},

	// ── Get own application (student) ────────
	async getByStudent(studentId: string) {
		const application = await db.query.applications.findFirst({
			where: eq(applications.studentId, studentId),
			with: {
				applicationAddresses: true,
				applicationParents: true,
				applicationDocuments: true,
			},
			orderBy: [desc(applications.createdAt)],
		});

		return application ?? null;
	},

	// ── List all (admin, paginated) ───────────
	async listAll(query: ApplicationQuery) {
		const { page, limit, sortBy, sortOrder, q, status } = query;
		const offset = toOffset(page, limit);

		const conditions: SQL[] = [];

		if (status) {
			conditions.push(eq(applications.status, status));
		}

		if (q) {
			conditions.push(
				or(
					ilike(students.lastName, `%${q}%`),
					ilike(students.givenName, `%${q}%`),
					ilike(applications.programName, `%${q}%`),
				)!,
			);
		}

		const where = conditions.length ? and(...conditions) : undefined;

		const sortColumn =
			{
				createdAt: applications.createdAt,
				programName: applications.programName,
				yearLevel: applications.yearLevel,
				lastName: students.lastName,
			}[sortBy] ?? applications.createdAt;

		const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

		const [data, [{ value: total }]] = await Promise.all([
			db
				.select({
					id: applications.id,
					status: applications.status,
					programName: applications.programName,
					yearLevel: applications.yearLevel,
					hasDisability: applications.hasDisability,
					hasIpGroup: applications.hasIpGroup,
					batch: applications.batch,
					awardNo: applications.awardNo,
					appNo: applications.appNo,
					createdAt: applications.createdAt,
					student: {
						id: students.id,
						studentId: students.studentId,
						lastName: students.lastName,
						givenName: students.givenName,
						middleName: students.middleName,
						email: students.email,
					},
				})
				.from(applications)
				.innerJoin(students, eq(applications.studentId, students.id))
				.where(where)
				.orderBy(orderBy)
				.limit(limit)
				.offset(offset),
			db
				.select({ value: count() })
				.from(applications)
				.innerJoin(students, eq(applications.studentId, students.id))
				.where(where),
		]);

		return { data, meta: buildMeta(total, page, limit) };
	},

	// ── Get single (admin) ───────────────────
	async getById(applicationId: string) {
		const application = await db.query.applications.findFirst({
			where: eq(applications.id, applicationId),
			with: {
				applicationAddresses: true,
				applicationParents: true,
				applicationDocuments: true,
				student: true,
			},
		});

		if (!application) throw new NotFoundError('Application');
		return application;
	},

	// ── Approve / Reject (admin) ─────────────
	async updateStatus(
		applicationId: string,
		input: UpdateApplicationStatusInput,
		adminId: string,
	) {
		const existing = await db.query.applications.findFirst({
			where: eq(applications.id, applicationId),
			with: { student: true },
		});

		if (!existing) throw new NotFoundError('Application');

		if (existing.status !== 'pending') {
			throw new ConflictError(
				`Application is already "${existing.status}" and cannot be updated`,
			);
		}

		const [updated] = await db
			.update(applications)
			.set({
				status: input.status,
				...(input.status === 'approved'
					? {
							awardNo: input.awardNo,
							appNo: input.appNo,
							batch: input.batch,
					  }
					: {}),
			})
			.where(eq(applications.id, applicationId))
			.returning();

		if (!updated)
			throw new InternalError('Failed to update application status');

		// ── Fire-and-forget mail ──────────────
		const studentEmail = existing.student?.email;
		const studentName = existing.student?.givenName ?? 'Student';

		if (studentEmail) {
			if (input.status === 'approved') {
				mailService
					.sendApplicationApproved(studentEmail, studentName, {
						awardNo: input.awardNo!,
						appNo: input.appNo!,
						batch: input.batch!,
						programName: existing.programName,
					})
					.catch(console.error);
			} else {
				mailService
					.sendApplicationRejected(studentEmail, studentName, {
						programName: existing.programName,
						reason: input.reason,
					})
					.catch(console.error);
			}
		}

		return updated;
	},
};
