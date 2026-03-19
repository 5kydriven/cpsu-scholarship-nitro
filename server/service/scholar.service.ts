import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db, scholars, enrollments, uploads } from '../db';
import { NotFoundError, ImportError } from '../utils/errors';
import { buildMeta, toOffset } from '../utils/pagination';
import type { ScholarQuery } from '../validators/application.validator';

// ─────────────────────────────────────────────
// scholar.service.ts
//
// ⚠️  scholars table uses "firstName" (not "givenName").
//     This matches the real migration schema:
//       first_name text NOT NULL
//     Students table uses given_name — they differ.
//
// ⚠️  uploads table uses academicYear + semester,
//     NOT a single "batch" column.
// ─────────────────────────────────────────────

export interface ScholarImportRow {
	scholarIdentifier: string;
	lastName: string;
	firstName: string; // matches scholars.first_name
	middleName?: string;
	sex?: 'male' | 'female';
	province?: string;
	city?: string;
	programId: number;
	course: string;
	yearLevel?: number;
	awardNo?: string;
	appNo?: string;
}

export const scholarService = {
	// ── List all (admin, paginated) ───────────
	async listAll(query: ScholarQuery) {
		const {
			page,
			limit,
			sortBy,
			sortOrder,
			q,
			programId,
			academicYear,
			semester,
			province,
			yearLevel,
		} = query;
		const offset = toOffset(page, limit);

		const scholarConditions: SQL[] = [];

		if (q) {
			scholarConditions.push(
				or(
					ilike(scholars.lastName, `%${q}%`),
					ilike(scholars.firstName, `%${q}%`),
					ilike(scholars.scholarIdentifier, `%${q}%`),
				)!,
			);
		}

		if (province) {
			scholarConditions.push(ilike(scholars.province, `%${province}%`));
		}

		const scholarWhere = scholarConditions.length
			? and(...scholarConditions)
			: undefined;

		const sortColumn =
			{
				createdAt: scholars.createdAt,
				lastName: scholars.lastName,
				scholarIdentifier: scholars.scholarIdentifier,
				province: scholars.province,
			}[sortBy] ?? scholars.createdAt;

		const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

		// When filtering by enrollment fields, join enrollments (and uploads if needed)
		const needsEnrollmentJoin = !!(
			programId ||
			academicYear ||
			semester ||
			yearLevel
		);

		if (needsEnrollmentJoin) {
			const enrollConditions: SQL[] = [];
			if (programId)
				enrollConditions.push(eq(enrollments.programId, programId));
			if (yearLevel)
				enrollConditions.push(eq(enrollments.yearLevel, yearLevel));

			// Filter by academicYear/semester via the uploads join
			const needsUploadsJoin = !!(academicYear || semester);
			const uploadConditions: SQL[] = [];
			if (academicYear)
				uploadConditions.push(eq(uploads.academicYear, academicYear));
			if (semester) uploadConditions.push(eq(uploads.semester, semester));

			const enrollWhere = enrollConditions.length
				? and(...enrollConditions)
				: undefined;
			const uploadWhere = uploadConditions.length
				? and(...uploadConditions)
				: undefined;

			const baseQuery = db
				.select({
					id: scholars.id,
					scholarIdentifier: scholars.scholarIdentifier,
					lastName: scholars.lastName,
					firstName: scholars.firstName,
					middleName: scholars.middleName,
					sex: scholars.sex,
					province: scholars.province,
					city: scholars.city,
					createdAt: scholars.createdAt,
					enrollment: {
						id: enrollments.id,
						course: enrollments.course,
						yearLevel: enrollments.yearLevel,
						awardNo: enrollments.awardNo,
						appNo: enrollments.appNo,
						programId: enrollments.programId,
						uploadId: enrollments.uploadId,
					},
				})
				.from(scholars)
				.innerJoin(enrollments, eq(enrollments.scholarId, scholars.id));

			const queryWithUploads = needsUploadsJoin
				? baseQuery.innerJoin(uploads, eq(uploads.id, enrollments.uploadId))
				: baseQuery;

			const fullWhere = and(scholarWhere, enrollWhere, uploadWhere);

			const [data, [{ value: total }]] = await Promise.all([
				queryWithUploads
					.where(fullWhere)
					.orderBy(orderBy)
					.limit(limit)
					.offset(offset),
				db
					.select({ value: count() })
					.from(scholars)
					.innerJoin(enrollments, eq(enrollments.scholarId, scholars.id))
					.where(fullWhere),
			]);

			return { data, meta: buildMeta(total, page, limit) };
		}

		// No enrollment filter — direct scholars query
		const [data, [{ value: total }]] = await Promise.all([
			db
				.select()
				.from(scholars)
				.where(scholarWhere)
				.orderBy(orderBy)
				.limit(limit)
				.offset(offset),
			db.select({ value: count() }).from(scholars).where(scholarWhere),
		]);

		return { data, meta: buildMeta(total, page, limit) };
	},

	// ── Get single ────────────────────────────
	async getById(id: string) {
		const scholar = await db.query.scholars.findFirst({
			where: eq(scholars.id, id),
			with: { enrollments: { with: { program: true } } },
		});

		if (!scholar) throw new NotFoundError('Scholar');
		return scholar;
	},

	// ── Bulk import ───────────────────────────
	// uploadId comes from the uploads row already inserted by the route.
	async importBatch(
		rows: ScholarImportRow[],
		uploadId: string,
	): Promise<{ inserted: number; skipped: number; errors: string[] }> {
		if (rows.length === 0)
			throw new ImportError('Import file contains no data rows');
		if (rows.length > 5000)
			throw new ImportError('Import file exceeds the 5,000 row limit');

		let inserted = 0;
		let skipped = 0;
		const errors: string[] = [];

		for (const [index, row] of rows.entries()) {
			const rowNum = index + 2; // 1-indexed + header

			try {
				if (!row.scholarIdentifier || !row.lastName || !row.firstName) {
					errors.push(
						`Row ${rowNum}: missing scholarIdentifier, lastName, or firstName`,
					);
					skipped++;
					continue;
				}

				if (!row.course) {
					errors.push(`Row ${rowNum}: missing course`);
					skipped++;
					continue;
				}

				// Upsert scholar by scholarIdentifier
				const existing = await db.query.scholars.findFirst({
					where: eq(scholars.scholarIdentifier, row.scholarIdentifier),
				});

				let scholarId: string;

				if (existing) {
					scholarId = existing.id;
				} else {
					const [newScholar] = await db
						.insert(scholars)
						.values({
							scholarIdentifier: row.scholarIdentifier,
							lastName: row.lastName,
							firstName: row.firstName, // ← correct column name
							middleName: row.middleName ?? null,
							sex: row.sex ?? null,
							province: row.province ?? null,
							city: row.city ?? null,
						})
						.returning({ id: scholars.id });

					scholarId = newScholar.id;
					inserted++;
				}

				// Insert enrollment — skip on unique violation (scholar+program+batch)
				try {
					await db.insert(enrollments).values({
						scholarId,
						programId: row.programId,
						course: row.course,
						yearLevel: row.yearLevel ?? null,
						awardNo: row.awardNo ?? null,
						appNo: row.appNo ?? null,
						uploadId,
					});
				} catch (enrollErr: unknown) {
					const pgErr = enrollErr as { code?: string };
					if (pgErr?.code === '23505') {
						skipped++;
					} else {
						throw enrollErr;
					}
				}
			} catch (rowErr) {
				errors.push(
					`Row ${rowNum}: ${
						rowErr instanceof Error ? rowErr.message : 'unknown error'
					}`,
				);
				skipped++;
			}
		}

		return { inserted, skipped, errors };
	},
};
