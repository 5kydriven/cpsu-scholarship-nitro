import { handleError, successResponse } from '#server/utils/response.ts';
import { getQuery } from 'h3';
import { defineHandler } from 'nitro';

export default defineHandler((event) => {
	try {
		const raw = getQuery(event);
		return successResponse({
			data: [],
			meta: {},
		});
	} catch (err) {
		return handleError({ event, error: err });
	}
});
