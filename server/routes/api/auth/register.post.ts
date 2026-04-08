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

		const { data, error } = await supabaseAdmin.auth.admin.createUser({
			email: parsed.data.email,
			password: parsed.data.password,
			email_confirm: true,
			role: 'student',
			user_metadata: {
				role: 'student',
			},
		});

		if (error) {
			throw new BadRequestError(error.message);
		}

		return successResponse({
			user: data.user,
		});
	} catch (err) {
		return handleError(event, err);
	}
});
