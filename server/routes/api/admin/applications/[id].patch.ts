import { applicationService } from '#server/services/application.service.ts';
import { BadRequestError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { updateApplicationStatusSchema } from '#server/validators/application.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;
		if (!id) throw new BadRequestError('Application ID is required');

		const body = await requestBody(event);
		const { data, error, success } =
			updateApplicationStatusSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const result = await applicationService.updateStatus(
			id,
			data,
			event.context.user.id,
		);

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
