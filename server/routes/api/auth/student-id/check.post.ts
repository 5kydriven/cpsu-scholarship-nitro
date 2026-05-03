import { studentIdRosterService } from '#server/services/student-id-roster.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { studentIdCheckSchema } from '#server/validators/auth.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const parsed = studentIdCheckSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const result = await studentIdRosterService.checkStatus(
			parsed.data.studentId,
		);

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
