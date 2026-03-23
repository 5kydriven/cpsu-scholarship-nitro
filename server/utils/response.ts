import type { H3Event } from 'nitro';
import { AppError } from './errors';
import { isDev } from './env';
import type { PaginatedMeta } from './pagination';
import { convertKeysToSnakeCase } from './case-converters';

// ─────────────────────────────────────────────
// Response shape contract
//
// Every API response — success or error — follows
// one of these two shapes. The frontend can always
// branch on response.success.
//
// Success:
//   { success: true, data: T, meta?: PaginatedMeta }
//
// Error:
//   { success: false, error: { code, message, details? } }
// ─────────────────────────────────────────────

// ── Success ───────────────────────────────────

/**
 * Wraps data in the standard success envelope.
 * Returns a plain object — Nitro serialises it to JSON automatically.
 *
 * @example
 * // Simple response
 * return successResponse(student);
 *
 * // With pagination meta
 * return successResponse(students, buildMeta(total, page, limit));
 */
export function successResponse<T>(
	data: T,
	meta?: PaginatedMeta,
): SuccessResponse<T> {
	const converted = convertKeysToSnakeCase(data);
	return {
		success: true,
		data: converted,
		meta: meta,
	};
}

/**
 * Wraps data in a 201 Created HTTP Response.
 * Use for POST handlers that create a new resource.
 *
 * @example
 * // POST /api/applications
 * return createdResponse(newApplication);
 */
export function createdResponse<T>(data: T): Response {
	return new Response(
		JSON.stringify({ success: true, data } satisfies SuccessResponse<T>),
		{
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		},
	);
}

/**
 * Returns a 204 No Content response.
 * Use for DELETE handlers that return nothing.
 *
 * @example
 * // DELETE /api/admin/scholars/:id
 * return noContentResponse();
 */
export function noContentResponse(): Response {
	return new Response(null, { status: 204 });
}

// ── Error ─────────────────────────────────────

/**
 * Converts any thrown value into a consistent JSON error response.
 * Always use this inside route handler catch blocks — never throw
 * raw Responses or plain Error objects.
 *
 * - Known AppError subclasses → maps to their statusCode + code
 * - Unknown errors            → 500 INTERNAL_ERROR
 * - In development            → includes a stack trace in `_debug`
 *
 * @example
 * export default defineHandler(async (event) => {
 *   try {
 *     ...
 *   } catch (err) {
 *     return handleError(event, err);
 *   }
 * });
 */
export function handleError(event: H3Event, error: unknown): Response {
	// Known application error
	if (error instanceof AppError) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: error.code,
					message: error.message,
					...(error.details !== undefined ? { details: error.details } : {}),
					context: event.context,
				},
			} satisfies ErrorResponse),
			{
				status: error.statusCode,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	// Unknown / unexpected error
	// Log the full error server-side; send a generic message to the client
	console.error('[handleError] Unhandled error:', error);

	const body: ErrorResponse & { _debug?: unknown } = {
		success: false,
		error: {
			code: 'INTERNAL_ERROR',
			message: 'An unexpected error occurred',
		},
	};

	// Only expose stack in development — never in production
	if (isDev && error instanceof Error) {
		body._debug = {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	return new Response(JSON.stringify(body), {
		status: 500,
		headers: { 'Content-Type': 'application/json' },
	});
}

// ─────────────────────────────────────────────
// TypeScript response types
// Import these in your service return types and
// test helpers for end-to-end type safety.
// ─────────────────────────────────────────────

export interface SuccessResponse<T> {
	success: true;
	data: T;
	meta?: PaginatedMeta;
}

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: unknown;
		context?: H3Event['context'];
	};
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
