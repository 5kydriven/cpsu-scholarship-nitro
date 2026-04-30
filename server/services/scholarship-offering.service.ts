import { asc, eq } from 'drizzle-orm';
import { db, scholarshipOfferings } from '../db';

export const scholarshipOfferingService = {
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
};
