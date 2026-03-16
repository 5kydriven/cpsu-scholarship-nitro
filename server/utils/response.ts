import type { H3Event } from 'nitro';
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

export function handleError(event: H3Event, error: any): Response {
	if (error instanceof AppError) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: error.code ?? 'ERROR',
					message: error.message,
					...(error.details ? { details: error.details } : {}),
				},
			}),
			{
				status: error.statusCode,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	console.error(error);
	return new Response(
		JSON.stringify({
			success: false,
			error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
		}),
		{ status: 500, headers: { 'Content-Type': 'application/json' } },
	);
}
