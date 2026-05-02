import { scholarshipProgramService } from '#server/services/scholarship-program.service.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const programs = await scholarshipProgramService.getAll();

		return successResponse(programs);
	} catch (err) {
		return handleError(event, err);
	}
});
