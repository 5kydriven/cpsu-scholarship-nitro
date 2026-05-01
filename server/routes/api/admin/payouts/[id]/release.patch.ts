import { payoutService } from '#server/services/payout.service.ts';
import { BadRequestError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { releasePayoutSchema } from '#server/validators/payout.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;
		if (!id) throw new BadRequestError('Payout ID is required');

		const body = await requestBody(event);
		const { data, error, success } = releasePayoutSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const payout = await payoutService.release(id, event.context.user.id, data);

		return successResponse(payout);
	} catch (err) {
		return handleError(event, err);
	}
});
