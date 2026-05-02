import { payoutService } from '#server/services/payout.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { payoutQuerySchema } from '#server/validators/payout.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const url = new URL(event.req.url);
		const { data, error, success } = payoutQuerySchema.safeParse(
			Object.fromEntries(url.searchParams.entries()),
		);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const result = await payoutService.list(data);

		return successResponse(result.data, result.meta);
	} catch (err) {
		return handleError(event, err);
	}
});
