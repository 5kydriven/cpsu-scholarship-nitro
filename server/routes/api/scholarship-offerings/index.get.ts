import { scholarshipOfferingService } from '#server/services/scholarship-offering.service.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const offerings = await scholarshipOfferingService.listOpen();

		return successResponse(offerings);
	} catch (err) {
		return handleError(event, err);
	}
});
