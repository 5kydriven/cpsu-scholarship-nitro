import { scholarshipOfferingService } from '#server/services/scholarship-offering.service.ts';
import { NotFoundError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new NotFoundError('Scholarship offering');

		const offering = await scholarshipOfferingService.getById(id);

		return successResponse(offering);
	} catch (err) {
		return handleError(event, err);
	}
});
