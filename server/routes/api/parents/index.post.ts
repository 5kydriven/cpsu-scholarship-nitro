import { studentParentService } from '#server/service/student-parent.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createParentSchema } from '#server/validators/parent.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const studentId = event.context.student?.id;
		const body = await requestBody(event);
		const { data, success, error } = createParentSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const rows = [];

		if (data.father) {
			rows.push({
				...(data.father as Required<typeof data.father>),
				type: 'father',
				studentId: studentId ?? '',
			});
		}

		if (data.mother) {
			rows.push({
				...(data.mother as Required<typeof data.mother>),
				type: 'mother',
				studentId: studentId ?? '',
			});
		}

		if (data.guardian) {
			rows.push({
				...(data.guardian as Required<typeof data.guardian>),
				type: 'guardian',
				studentId: studentId ?? '',
			});
		}

		const response = await studentParentService.createMany(rows);

		return successResponse(response);
	} catch (err) {
		return handleError(event, err);
	}
});
