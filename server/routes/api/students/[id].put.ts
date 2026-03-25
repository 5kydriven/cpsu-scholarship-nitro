import { requestBody } from '#server/utils/request-body.ts';
import { handleError } from '#server/utils/response.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;
		const body = await requestBody(event);
		console.log(body);
		return { id, body };
	} catch (err) {
		return handleError(event, err);
	}
});
