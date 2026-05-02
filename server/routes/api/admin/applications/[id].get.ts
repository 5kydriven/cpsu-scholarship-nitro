import { applicationService } from '#server/services/application.service.ts';
import { NotFoundError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new NotFoundError('Application');

		const application = await applicationService.getById(id);

		return successResponse(application);
	} catch (err) {
		return handleError(event, err);
	}
});
