import { defineHandler } from 'nitro';
import { scholarQuerySchema } from '../../../../validators/application.validator';
import { successResponse, handleError } from '../../../../utils/response';
import { ValidationError } from '../../../../utils/errors';
import { scholarService } from '#server/service/scholar.service.ts';

// ─────────────────────────────────────────────
// GET /api/admin/scholars
//
// Paginated list of scholars with optional filters.
// Protected by admin-guard.ts.
//
// Query params:
//   q         — search by name or scholarIdentifier
//   programId — filter by program
//   batch     — filter by batch (e.g. "2024-1")
//   province  — filter by province
//   yearLevel — filter by year level in enrollment
//   page / limit / sortBy / sortOrder
// ─────────────────────────────────────────────

export default defineHandler(async (event) => {
	try {
		const url = new URL(event.req.url);
		const params = Object.fromEntries(url.searchParams);

		const parsed = scholarQuerySchema.safeParse(params);

		if (!parsed.success) {
			throw new ValidationError(parsed.error.flatten());
		}

		const result = await scholarService.listAll(parsed.data);

		return successResponse(result.data, result.meta);
	} catch (err) {
		return handleError(event, err);
	}
});
