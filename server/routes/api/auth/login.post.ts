import { handleError, successResponse } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';
import { requestBody } from '#server/utils/request-body.ts';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);

		console.log(body);

		return successResponse({ data: body });
	} catch (err) {
		return handleError(event, err);
	}
});
