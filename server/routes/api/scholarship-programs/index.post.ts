import { scholarshipProgramService } from '#server/services/scholarship-program.service.ts';
import { ForbiddenError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createScholarshipProgramSchema } from '#server/validators/scholarship-program.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		if (event.context.role !== 'staff' && event.context.role !== 'admin') {
			throw new ForbiddenError('Staff or admin access required');
		}

		const body = await requestBody(event);
		const { data, success, error } =
			createScholarshipProgramSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const program = await scholarshipProgramService.create(data);

		return successResponse(program);
	} catch (err) {
		return handleError(event, err);
	}
});
