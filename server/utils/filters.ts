import { z } from 'zod';

export const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const searchSchema = paginationSchema.extend({
	q: z.string().min(1).optional(),
});

export function paginate(page: number, limit: number) {
	return {
		offset: (page - 1) * limit,
		limit,
	};
}

export function buildMeta(total: number, page: number, limit: number) {
	const pageCount = Math.ceil(total / limit);
	return {
		total,
		limit,
		page,
		pageCount,
		hasNext: page < pageCount,
		hasPrev: page > 1,
	};
}
