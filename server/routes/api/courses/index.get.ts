import { courseService } from '#server/service/course.service.ts';
import { successResponse, handleError } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const courses = await courseService.getAll();

		return successResponse(courses);
	} catch (err) {
		return handleError(event, err);
	}
});
