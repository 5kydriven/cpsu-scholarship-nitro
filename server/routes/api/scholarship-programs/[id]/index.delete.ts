import { scholarshipProgramService } from '#server/services/scholarship-program.service.ts';
import { BadRequestError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new BadRequestError('Scholarship program ID is required');

		const program = await scholarshipProgramService.delete(id);

		return successResponse(program);
	} catch (err) {
		return handleError(event, err);
	}
});
