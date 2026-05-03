import { InternalError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		if (!event.context.user) {
			throw new InternalError();
		}
		return successResponse({
			id: event.context.user.id,
			email: event.context.user.email,
			role: event.context.role,
		});
	} catch (err) {
		return handleError(event, err);
	}
});
