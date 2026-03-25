import { studentService } from '#server/service/student.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { studentQuerySchema } from '#server/validators/student.validation.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const url = new URL(event.req.url);
		const raw = Object.fromEntries(url.searchParams.entries());
		const { data, success, error } = studentQuerySchema.safeParse(raw);

		if (!success) throw new ValidationError(z.treeifyError(error));

		const result = await studentService.getAll(data);

		return successResponse(result.data, result.meta);
	} catch (err) {
		return handleError(event, err);
	}
});
