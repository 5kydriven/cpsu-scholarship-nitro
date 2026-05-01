import { and, asc, count, desc, eq, ilike, inArray, or, SQL } from 'drizzle-orm';
import {
	db,
	scholars,
	scholarshipOfferings,
	students,
	type ScholarshipOffering,
} from '../db';
import { buildMeta, toOffset } from '#server/utils/pagination.ts';
import type { ScholarQuery } from '#server/validators/application.validator.ts';

export const scholarService = {
	async list(query: ScholarQuery) {
		const {
			page,
			limit,
			sortOrder,
			q,
			status,
			offeringId,
			programId,
			academicYear,
			semester,
		} = query;
		const conditions: SQL[] = [];

		if (status) conditions.push(eq(scholars.status, status));
		if (offeringId) conditions.push(eq(scholars.offeringId, offeringId));

		const offeringFilters: SQL[] = [];
		if (programId) offeringFilters.push(eq(scholarshipOfferings.programId, programId));
		if (academicYear) {
			offeringFilters.push(eq(scholarshipOfferings.academicYear, academicYear));
		}
		if (semester) offeringFilters.push(eq(scholarshipOfferings.semester, semester));

		if (offeringFilters.length) {
			const matchedOfferings = await db
				.select({ id: scholarshipOfferings.id })
				.from(scholarshipOfferings)
				.where(and(...offeringFilters));

			conditions.push(
				matchedOfferings.length
					? inArray(
							scholars.offeringId,
							matchedOfferings.map((offering: Pick<ScholarshipOffering, 'id'>) => offering.id),
						)
					: eq(scholars.offeringId, crypto.randomUUID()),
			);
		}

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
							scholars.studentId,
							matches.map((student) => student.id),
						)
					: eq(scholars.studentId, crypto.randomUUID()),
			);
		}

		const where = conditions.length ? and(...conditions) : undefined;
		const order = sortOrder === 'desc' ? desc(scholars.createdAt) : asc(scholars.createdAt);

		const [countResult] = await db
			.select({ total: count() })
			.from(scholars)
			.where(where);

		const data = await db.query.scholars.findMany({
			where,
			with: {
				student: {
					with: {
						address: true,
						parents: true,
					},
				},
				application: true,
				offering: {
					with: {
						program: true,
					},
				},
				payouts: true,
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
