import { nominationService } from '#server/services/nomination.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { nominationQuerySchema } from '#server/validators/nomination.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const url = new URL(event.req.url);
		const { data, error, success } = nominationQuerySchema.safeParse(
			Object.fromEntries(url.searchParams.entries()),
		);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const result = await nominationService.list(data);

		return successResponse(result.data, result.meta);
	} catch (err) {
		return handleError(event, err);
	}
});
