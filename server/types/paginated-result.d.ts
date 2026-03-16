export interface PaginatedResult<T> {
	data: T[];
	meta: {
		total: number;
		limit: number;
		page: number;
		pageCount: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}
