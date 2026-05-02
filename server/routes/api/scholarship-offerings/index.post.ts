import { scholarshipOfferingService } from '#server/services/scholarship-offering.service.ts';
import { ForbiddenError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createScholarshipOfferingSchema } from '#server/validators/scholarship-offering.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		if (event.context.role !== 'staff' && event.context.role !== 'admin') {
			throw new ForbiddenError('Staff or admin access required');
		}

		const body = await requestBody(event);
		const { data, success, error } =
			createScholarshipOfferingSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const offering = await scholarshipOfferingService.create(data);

		return successResponse(offering);
	} catch (err) {
		return handleError(event, err);
	}
});
