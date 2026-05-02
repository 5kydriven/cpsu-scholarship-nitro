import { scholarshipOfferingService } from '#server/services/scholarship-offering.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { scholarshipOfferingsQuerySchema } from '#server/validators/scholarship-offering.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const url = new URL(event.req.url);
		const raw = Object.fromEntries(url.searchParams.entries());
		const { data, success, error } =
			scholarshipOfferingsQuerySchema.safeParse(raw);

		if (!success) throw new ValidationError(z.treeifyError(error));

		const offerings = await scholarshipOfferingService.getAll(data);

		return successResponse(offerings);
	} catch (err) {
		return handleError(event, err);
	}
});
