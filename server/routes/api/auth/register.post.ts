import { defineHandler } from 'nitro';
import { BadRequestError, ValidationError } from '../../../utils/errors';
import { handleError, successResponse } from '#server/utils/response.ts';
import { supabaseAdmin } from '#server/lib/supabase.ts';
import z from 'zod';
import { requestBody } from '#server/utils/request-body.ts';
import { registerUserSchema } from '#server/validators/auth.validator.ts';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const parsed = registerUserSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const { data, error } = await supabaseAdmin.auth.signUp({
			email: parsed.data.email,
			password: parsed.data.password,
			options: {
				data: {
					role: 'student',
				},
			},
		});

		if (error) {
			throw new BadRequestError(error.message);
		}

		// const student = await studentService.create({
		// 	id: data.user.id,
		// 	email: parsed.data.email,
		// });

		return successResponse({
			user: data.user,
			access_token: data.session?.access_token,
		});
	} catch (err) {
		return handleError(event, err);
	}
});
