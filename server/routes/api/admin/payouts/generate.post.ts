import { payoutService } from '#server/services/payout.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { generatePayoutsSchema } from '#server/validators/payout.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const { data, error, success } = generatePayoutsSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const payouts = await payoutService.generateForOffering(data.offeringId);

		return successResponse(payouts);
	} catch (err) {
		return handleError(event, err);
	}
});
