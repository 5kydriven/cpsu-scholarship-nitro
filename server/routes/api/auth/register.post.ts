import { defineHandler } from 'nitro';
import { BadRequestError, ValidationError } from '#server/utils/errors.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { supabase, supabaseAdmin } from '#server/lib/supabase.ts';
import { studentIdRosterService } from '#server/services/student-id-roster.service.ts';
import z from 'zod';
import { requestBody } from '#server/utils/request-body.ts';
import { registerStudentSchema } from '#server/validators/auth.validator.ts';
import { setCookie } from 'h3';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const parsed = registerStudentSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		await studentIdRosterService.requireUnlinked(parsed.data.studentId);

		const { data, error } = await supabaseAdmin.auth.signUp({
			email: parsed.data.email,
			password: parsed.data.password,
			options: {
				data: {
					role: 'student',
					studentId: parsed.data.studentId,
				},
			},
		});

		if (error) {
			throw new BadRequestError(error.message);
		}

		const userId = data.user?.id;
		if (!userId) {
			throw new BadRequestError('Unable to create student account');
		}

		try {
			await studentIdRosterService.linkStudentId(
				parsed.data.studentId,
				userId,
				parsed.data.email,
			);
		} catch (err) {
			try {
				await supabaseAdmin.auth.admin.deleteUser(userId);
			} catch (deleteErr) {
				console.error(
					'[auth/register] Failed to delete unlinked auth user:',
					deleteErr,
				);
			}
			throw err;
		}

		const { data: sessionData, error: sessionError } =
			await supabase.auth.signInWithPassword({
				email: parsed.data.email,
				password: parsed.data.password,
			});

		if (!sessionError && sessionData.session) {
			setCookie(event, 'sb-access-token', sessionData.session.access_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'none',
				path: '/',
				maxAge: 60 * 60,
			});

			setCookie(event, 'sb-refresh-token', sessionData.session.refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'none',
				path: '/',
				maxAge: 60 * 60 * 24 * 30,
			});
		}

		return successResponse({
			user: data.user,
			studentId: parsed.data.studentId,
			accessToken:
				sessionData.session?.access_token ?? data.session?.access_token,
			refreshToken: sessionData.session?.refresh_token,
		});
	} catch (err) {
		return handleError(event, err);
	}
});
