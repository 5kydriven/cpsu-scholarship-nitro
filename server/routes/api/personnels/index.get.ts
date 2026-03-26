import { personnelService } from '#server/service/personnel.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { personnelQuerySchema } from '#server/validators/personnel.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const url = new URL(event.req.url);
		const raw = Object.fromEntries(url.searchParams.entries());
		const { data, success, error } = personnelQuerySchema.safeParse(raw);

		if (!success) throw new ValidationError(z.treeifyError(error));

		const personnel = await personnelService.getAll(data);

		return successResponse(personnel.data, personnel.meta);
	} catch (err) {
		return handleError(event, err);
	}
});
