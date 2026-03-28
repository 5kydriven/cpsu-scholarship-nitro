import { courseService } from '#server/service/course.service.ts';
import { BadRequestError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { updateCourseSchema } from '#server/validators/course.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;
		const body = await requestBody(event);

		if (!id) throw new BadRequestError('Course ID is required');

		const { data, success, error } = updateCourseSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const course = await courseService.update(id, data);

		return successResponse(course);
	} catch (err) {
		return handleError(event, err);
	}
});
