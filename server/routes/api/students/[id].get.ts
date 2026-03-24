import { studentService } from '#server/service/student.service.ts';
import { NotFoundError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new NotFoundError('Student');

		const student = await studentService.getById(id);

		return successResponse(student);
	} catch (err) {
		return handleError(event, err);
	}
});
