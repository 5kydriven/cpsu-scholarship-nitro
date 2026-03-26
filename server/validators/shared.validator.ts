import { z } from 'zod';

export const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const searchSchema = paginationSchema.extend({
	q: z.string().min(1).optional(),
});

export const paramsSchema = z.object({ id: z.uuid('not found') });

export type PaginationInput = z.infer<typeof paginationSchema>;
