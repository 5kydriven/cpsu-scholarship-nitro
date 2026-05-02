import { nominationService } from '#server/services/nomination.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createNominationSchema } from '#server/validators/nomination.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const { data, error, success } = createNominationSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const nomination = await nominationService.create(data, event.context.user.id);

		return successResponse(nomination);
	} catch (err) {
		return handleError(event, err);
	}
});
