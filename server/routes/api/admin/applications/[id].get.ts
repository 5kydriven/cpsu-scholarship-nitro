import { defineHandler } from 'nitro';
import { successResponse, handleError } from '../../../../utils/response';
import { BadRequestError } from '../../../../utils/errors';
import { applicationService } from '#server/service/application.service.ts';

// ─────────────────────────────────────────────
// GET /api/admin/applications/[id]
//
// Returns a single application with all related
// data: student, address, parents, documents.
// Protected by admin-guard.ts.
// ─────────────────────────────────────────────

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new BadRequestError('Application ID is required');

		const application = await applicationService.getById(id);

		return successResponse(application);
	} catch (err) {
		return handleError(event, err);
	}
});
