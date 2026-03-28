import { courseService } from '#server/service/course.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createCourseSchema } from '#server/validators/course.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const { data, success, error } = createCourseSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const result = await courseService.create(data);

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
