import { payoutService } from '#server/services/payout.service.ts';
import { BadRequestError, UnauthorizedError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { confirmPayoutReceiptSchema } from '#server/validators/payout.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		if (event.context.role !== 'student') {
			throw new UnauthorizedError('Student access required');
		}

		const id = event.context.params?.id;
		if (!id) throw new BadRequestError('Payout ID is required');

		const body = await requestBody(event);
		const { data, error, success } =
			confirmPayoutReceiptSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const payout = await payoutService.confirmReceipt(
			id,
			event.context.user.id,
			data,
		);

		return successResponse(payout);
	} catch (err) {
		return handleError(event, err);
	}
});
