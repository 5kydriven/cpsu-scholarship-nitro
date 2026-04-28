import { and, asc, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { db, personnels, type NewPersonnel } from '../db';
import { NotFoundError } from '#server/utils/errors.ts';
import { toOffset, buildMeta } from '#server/utils/pagination.ts';
import type { PaginationInput } from '#server/validators/shared.validator.ts';

export const personnelService = {
	async create(personnel: NewPersonnel) {
		return await db.insert(personnels).values(personnel).returning();
	},

	async findById(id: string) {
		const personnel = await db.query.personnels.findFirst({
			where: eq(personnels.id, id),
		});

		if (!personnel) throw new NotFoundError('Personnel');
		return personnel;
	},

	async getAll(query: PaginationInput & { q?: string; sortBy?: string }) {
		const { page, limit, sortOrder, q, sortBy } = query;

		const conditions: SQL[] = [];

		if (q) {
			conditions.push(
				or(
					ilike(personnels.firstName, `%${q}%`),
					ilike(personnels.lastName, `%${q}%`),
				)!,
			);
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const orderCol =
			sortBy === 'lastName' ? personnels.lastName : personnels.firstName;
		const order = sortOrder === 'desc' ? desc(orderCol) : asc(orderCol);

		const countResult = await db
			.select({ total: count() })
			.from(personnels)
			.where(where);

		const total = countResult[0]?.total ?? 0;

		const data = await db.query.personnels.findMany({
			where: where,
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
