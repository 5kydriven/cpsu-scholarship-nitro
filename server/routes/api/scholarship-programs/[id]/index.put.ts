import { scholarshipProgramService } from '#server/services/scholarship-program.service.ts';
import { BadRequestError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { updateScholarshipProgramSchema } from '#server/validators/scholarship-program.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;
		const body = await requestBody(event);

		if (!id) throw new BadRequestError('Scholarship program ID is required');

		const { data, success, error } =
			updateScholarshipProgramSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const program = await scholarshipProgramService.update(id, data);

		return successResponse(program);
	} catch (err) {
		return handleError(event, err);
	}
});
