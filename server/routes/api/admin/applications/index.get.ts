import { defineHandler } from 'nitro';
import { applicationQuerySchema } from '../../../../validators/application.validator';
import { successResponse, handleError } from '../../../../utils/response';
import { ValidationError } from '../../../../utils/errors';
import { applicationService } from '#server/service/application.service.ts';
import z from 'zod';

// ─────────────────────────────────────────────
// GET /api/admin/applications
//
// Admin: paginated list of all applications.
// Protected by admin-guard.ts (via nitro.config.ts handlers).
// No additional requireAdmin() call needed here —
// admin-guard already runs before this handler.
//
// Query params:
//   status   — 'pending' | 'approved' | 'rejected'
//   q        — search by student name or program
//   page     — default 1
//   limit    — default 20, max 100
//   sortBy   — createdAt | lastName | programName | yearLevel
//   sortOrder — asc | desc
// ─────────────────────────────────────────────

export default defineHandler(async (event) => {
	try {
		const url = new URL(event.req.url);
		const params = Object.fromEntries(url.searchParams);

		const parsed = applicationQuerySchema.safeParse(params);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const result = await applicationService.listAll(parsed.data);

		return successResponse(result.data, result.meta);
	} catch (err) {
		return handleError(event, err);
	}
});
