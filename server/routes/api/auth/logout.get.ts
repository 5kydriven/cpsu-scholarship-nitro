// server/routes/api/auth/logout.post.ts
import { supabase } from '#server/lib/supabase.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';
import { deleteCookie } from 'h3';

export default defineHandler(async (event) => {
	try {
		deleteCookie(event, 'sb-access-token');
		deleteCookie(event, 'sb-refresh-token');

		const { error } = await supabase.auth.signOut();

		if (error) {
			throw new Error(error.message);
		}

		return successResponse({
			message: 'Signed out successfully',
		});
	} catch (err) {
		return handleError(event, err);
	}
});
