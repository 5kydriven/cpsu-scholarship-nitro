import { personnelService } from '#server/service/personnel.service.ts';
import { NotFoundError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new NotFoundError('Personnel');

		const personnel = await personnelService.findById(id);

		return successResponse(personnel);
	} catch (err) {
		return handleError(event, err);
	}
});
