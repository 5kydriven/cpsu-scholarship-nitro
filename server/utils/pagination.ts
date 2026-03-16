export interface PaginatedMeta {
	total: number;
	limit: number;
	page: number;
	pageCount: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface PaginatedResult<T> {
	data: T[];
	meta: PaginatedMeta;
}

export function toOffset(page: number, limit: number): number {
	return (page - 1) * limit;
}

export function buildMeta(
	total: number,
	page: number,
	limit: number,
): PaginatedMeta {
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
