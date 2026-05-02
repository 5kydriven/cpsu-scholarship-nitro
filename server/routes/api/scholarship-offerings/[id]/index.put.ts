import { scholarshipOfferingService } from '#server/services/scholarship-offering.service.ts';
import {
	BadRequestError,
	ForbiddenError,
	ValidationError,
} from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { updateScholarshipOfferingSchema } from '#server/validators/scholarship-offering.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		if (event.context.role !== 'staff' && event.context.role !== 'admin') {
			throw new ForbiddenError('Staff or admin access required');
		}

		const id = event.context.params?.id;
		const body = await requestBody(event);

		if (!id) throw new BadRequestError('Scholarship offering ID is required');

		const { data, success, error } =
			updateScholarshipOfferingSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const offering = await scholarshipOfferingService.update(id, data);

		return successResponse(offering);
	} catch (err) {
		return handleError(event, err);
	}
});
