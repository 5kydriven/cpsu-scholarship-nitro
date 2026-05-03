import { studentIdRosterService } from '#server/services/student-id-roster.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { paramsSchema } from '#server/validators/shared.validator.ts';
import { updateStudentIdRosterSchema } from '#server/validators/student-id-roster.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const params = paramsSchema.safeParse({
			id: event.context.params?.id,
		});

		if (!params.success) {
			throw new ValidationError(z.treeifyError(params.error));
		}

		const body = await requestBody(event);
		const parsed = updateStudentIdRosterSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const result = await studentIdRosterService.updateById(
			params.data.id,
			parsed.data,
		);

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
