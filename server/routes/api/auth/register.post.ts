import { defineHandler } from 'nitro';
import { BadRequestError, ValidationError } from '../../../utils/errors';
import { handleError, successResponse } from '#server/utils/response.ts';
import { supabaseAdmin } from '#server/lib/supabase.ts';
import { studentService } from '#server/service/student.service.ts';
import { registerStudentSchema } from '#server/validators/student.validation.ts';
import z from 'zod';
import { requestBody } from '#server/utils/request-body.ts';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const parsed = registerStudentSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const { data, error } = await supabaseAdmin.auth.admin.createUser({
			email: parsed.data.email,
			password: parsed.data.password,
			email_confirm: true,
			phone: parsed.data.contactNumber,
			user_metadata: {
				role: 'student',
				firstName: parsed.data.firstName,
				lastName: parsed.data.lastName,
				middleName: parsed.data.middleName,
				extName: parsed.data.extName,
			},
		});

		console.log(error);

		if (error) {
			throw new BadRequestError(error.message);
		}

		const student = await studentService.create({
			id: data.user.id,
			lastName: parsed.data.lastName,
			firstName: parsed.data.firstName,
			middleName: parsed.data.middleName,
			yearLevel: parsed.data.yearLevel,
			sex: parsed.data.sex,
			contactNumber: parsed.data.contactNumber,
			extName: parsed.data.extName,
			email: parsed.data.email,
		});

		return successResponse(student);
	} catch (err) {
		return handleError(event, err);
	}
});
