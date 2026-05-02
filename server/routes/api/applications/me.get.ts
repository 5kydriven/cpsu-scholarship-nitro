import { applicationService } from '#server/services/application.service.ts';
import { UnauthorizedError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const student = event.context.student;

		if (event.context.role !== 'student' || !student) {
			throw new UnauthorizedError('Student access required');
		}

		const applications = await applicationService.getByStudent(student.id);

		return successResponse(applications);
	} catch (err) {
		return handleError(event, err);
	}
});
