import type { H3Event } from 'h3';
import { AppError } from './errors';

export function successResponse<T>({
	data,
	meta,
}: {
	data: T;
	meta?: Record<string, unknown>;
}) {
	return { success: true, data, ...(meta ? { meta } : {}) };
}

export function handleError({
	event,
	error,
}: {
	event: H3Event;
	error: unknown;
}) {
	if (error instanceof AppError) {
		event.res.status = error.statusCode;
		return {
			success: false,
			error: {
				code: error.code ?? 'ERROR',
				message: error.message,
				...(error.details ? { details: error.details } : {}),
			},
		};
	}

	console.error(error);
	event.res.status = (error as AppError).statusCode;
	return {
		success: false,
		error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
	};
}
