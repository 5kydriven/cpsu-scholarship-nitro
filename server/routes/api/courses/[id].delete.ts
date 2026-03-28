import { courseService } from '#server/service/course.service.ts';
import { successResponse, handleError } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new Error('Course ID is required');

		const result = await courseService.delete(id);

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
