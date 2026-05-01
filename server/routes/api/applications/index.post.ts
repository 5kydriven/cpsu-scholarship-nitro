import {
	applicationService,
	type MultipartDocumentFile,
} from '#server/services/application.service.ts';
import { BadRequestError, UnauthorizedError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { submitApplicationSchema } from '#server/validators/application.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

function parsePayload(body: Record<string, unknown>): unknown {
	if (typeof body.payload !== 'string') return body;

	try {
		return JSON.parse(body.payload);
	} catch {
		throw new BadRequestError('Payload must be valid JSON');
	}
}

function isMultipartDocumentFile(value: unknown): value is MultipartDocumentFile {
	if (!value || typeof value !== 'object') return false;

	const candidate = value as Partial<MultipartDocumentFile>;
	return (
		typeof candidate.filename === 'string' &&
		typeof candidate.type === 'string' &&
		typeof candidate.size === 'number' &&
		candidate.file instanceof File
	);
}

function collectFiles(body: Record<string, unknown>) {
	const files: Record<string, MultipartDocumentFile> = {};

	for (const [field, value] of Object.entries(body)) {
		if (field === 'payload') continue;
		if (isMultipartDocumentFile(value)) files[field] = value;
	}

	return files;
}

export default defineHandler(async (event) => {
	try {
		if (event.context.role !== 'student') {
			throw new UnauthorizedError('Student access required');
		}

		const body = await requestBody(event);
		const payload = parsePayload(body);
		const { data, error, success } = submitApplicationSchema.safeParse(payload);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const result = await applicationService.submit({
			studentId: event.context.user.id,
			input: data,
			files: collectFiles(body),
		});

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
