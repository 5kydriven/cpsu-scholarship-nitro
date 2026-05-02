import { db } from '#server/db/index.ts';
import { addressService } from '#server/services/address.service.ts';
import { studentParentService } from '#server/services/student-parent.service.ts';
import { studentService } from '#server/services/student.service.ts';
import { UnauthorizedError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createStudentSchema } from '#server/validators/student.validation.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		if (event.context.role !== 'student') {
			throw new UnauthorizedError('Student access required');
		}

		const body = await requestBody(event);
		const { data, error, success } = createStudentSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const result = await db.transaction(async (tx) => {
			const student = await studentService.upsertProfile(
				event.context.user.id,
				event.context.user.email,
				data,
				tx,
			);
			const address = await addressService.upsertForStudent(
				event.context.user.id,
				data.address,
				tx,
			);
			const parents = await studentParentService.replaceForStudent(
				event.context.user.id,
				data.parents,
				tx,
			);

			return {
				student,
				address,
				parents,
			};
		});

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
