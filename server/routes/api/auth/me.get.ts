import { InternalError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		if (!event.context.user) {
			throw new InternalError();
		}
		return successResponse(event.context.user);
	} catch (err) {
		return handleError(event, err);
	}
});
