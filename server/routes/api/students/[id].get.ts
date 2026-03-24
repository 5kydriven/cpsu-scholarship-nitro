import { studentService } from '#server/service/student.service.ts';
import { NotFoundError } from '#server/utils/errors.ts';
import { handleError } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new NotFoundError('Student');

		const student = studentService.getById(id);

		return student;
	} catch (err) {
		return handleError(event, err);
	}
});
