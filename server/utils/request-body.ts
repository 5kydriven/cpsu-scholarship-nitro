import camelize from 'camelize';
import type { H3Event } from 'nitro';

export async function requestBody(
	event: H3Event,
): Promise<Record<string, any>> {
	const isContentType = event.req.headers
		.get('content-type')
		?.startsWith('multipart/form-data');

	console.log(isContentType);

	if (isContentType) {
		// Use the Fetch API FormData
		const form = await event.req.formData();
		const data: Record<string, any> = {};
		for (const [key, value] of form.entries()) {
			// value can be File or string
			if (value instanceof File) {
				data[key] = {
					filename: value.name,
					type: value.type,
					size: value.size,
					file: value,
				};
			} else {
				data[key] = value;
			}
		}
		return camelize(data);
	}

	// JSON
	const data = await event.req.json();
	return camelize(data);
}
