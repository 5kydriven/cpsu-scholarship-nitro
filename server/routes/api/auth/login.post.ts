import { supabase } from '#server/lib/supabase.ts';
import { studentIdRosterService } from '#server/services/student-id-roster.service.ts';
import { BadRequestError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { loginSchema } from '#server/validators/auth.validator.ts';
import { defineHandler } from 'nitro';
import { setCookie } from 'h3';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const parsed = loginSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const email =
			'studentId' in parsed.data
				? await studentIdRosterService.requireLinkedEmail(parsed.data.studentId)
				: parsed.data.email;

		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password: parsed.data.password,
		});

		if (error) {
			throw new BadRequestError(error.message);
		}

		const access = data.session.access_token;
		const refresh = data.session.refresh_token;

		setCookie(event, 'sb-access-token', access, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'none',
			path: '/',
			maxAge: 60 * 60,
		});

		setCookie(event, 'sb-refresh-token', refresh, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'none',
			path: '/',
			maxAge: 60 * 60 * 24 * 30,
		});

		return successResponse({
			id: data.user.id,
			email: data.user.email,
			contactNumber: data.user.phone,
			...data.user.user_metadata,
			accessToken: data.session.access_token,
			refreshToken: data.session.refresh_token,
		});
	} catch (err) {
		return handleError(event, err);
	}
});
