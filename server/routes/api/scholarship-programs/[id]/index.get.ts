import { scholarshipProgramService } from '#server/services/scholarship-program.service.ts';
import { NotFoundError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new NotFoundError('Scholarship program');

		const program = await scholarshipProgramService.getById(id);

		return successResponse(program);
	} catch (err) {
		return handleError(event, err);
	}
});
