import { payoutService } from '#server/services/payout.service.ts';
import { UnauthorizedError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		if (event.context.role !== 'student') {
			throw new UnauthorizedError('Student access required');
		}

		const result = await payoutService.listByStudent(event.context.user.id);

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
