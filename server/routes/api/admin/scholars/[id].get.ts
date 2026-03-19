import { defineHandler } from 'nitro';
import { successResponse, handleError } from '../../../../utils/response';
import { BadRequestError } from '../../../../utils/errors';
import { scholarService } from '#server/service/scholar.service.ts';

// GET /api/admin/scholars/[id]
// Protected by admin-guard.ts.

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new BadRequestError('Scholar ID is required');

		const scholar = await scholarService.getById(id);

		return successResponse(scholar);
	} catch (err) {
		return handleError(event, err);
	}
});
