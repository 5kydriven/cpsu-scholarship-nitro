// ─────────────────────────────────────────────
// Base error class
// ─────────────────────────────────────────────

export class AppError extends Error {
	constructor(
		public statusCode: number,
		public override message: string,
		public code: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'AppError';

		// Maintains proper prototype chain in transpiled JS
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

// ─────────────────────────────────────────────
// HTTP 400 — Bad Request
// Use when the request is structurally malformed
// (missing required fields, wrong types, etc.)
// For Zod failures, use ValidationError instead.
// ─────────────────────────────────────────────
export class BadRequestError extends AppError {
	constructor(message = 'Bad request') {
		super(400, message, 'BAD_REQUEST');
	}
}

// ─────────────────────────────────────────────
// HTTP 401 — Unauthorized
// Use when no valid auth token is present.
// middleware/02.auth.ts throws this.
// ─────────────────────────────────────────────
export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized') {
		super(401, message, 'UNAUTHORIZED');
	}
}

// ─────────────────────────────────────────────
// HTTP 403 — Forbidden
// Use when the token is valid but the user
// does not have permission for the action.
// middleware/admin-guard.ts throws this.
// ─────────────────────────────────────────────
export class ForbiddenError extends AppError {
	constructor(message = 'Forbidden') {
		super(403, message, 'FORBIDDEN');
	}
}

// ─────────────────────────────────────────────
// HTTP 404 — Not Found
// Pass the resource name for a clear message.
//
// @example throw new NotFoundError('Application')
//          → "Application not found"
// ─────────────────────────────────────────────
export class NotFoundError extends AppError {
	constructor(resource: string) {
		super(404, `${resource} not found`, 'NOT_FOUND');
	}
}

// ─────────────────────────────────────────────
// HTTP 409 — Conflict
// Use for uniqueness violations:
//   • Student submits a second pending application
//     (unique_pending_application index)
//   • Duplicate scholar_identifier on CSV import
//   • Duplicate student email on registration
//
// @example throw new ConflictError('A pending application already exists')
// ─────────────────────────────────────────────
export class ConflictError extends AppError {
	constructor(message: string) {
		super(409, message, 'CONFLICT');
	}
}

// ─────────────────────────────────────────────
// HTTP 422 — Validation Error
// Use when Zod .safeParse() fails.
// Pass the full flatten() result as details so
// the frontend can map errors to specific fields.
//
// @example
//   const parsed = schema.safeParse(body);
//   if (!parsed.success) throw new ValidationError(parsed.error.flatten());
// ─────────────────────────────────────────────
export class ValidationError extends AppError {
	constructor(details: unknown) {
		super(422, 'Validation failed', 'VALIDATION_ERROR', details);
	}
}

// ─────────────────────────────────────────────
// HTTP 413 — Payload Too Large
// Use when an uploaded file exceeds the allowed
// size (Supabase Storage: 50 MiB per file).
// ─────────────────────────────────────────────
export class FileTooLargeError extends AppError {
	constructor(maxMb = 50) {
		super(413, `File exceeds the ${maxMb} MB limit`, 'FILE_TOO_LARGE');
	}
}

// ─────────────────────────────────────────────
// HTTP 415 — Unsupported Media Type
// Use when an uploaded file type is not allowed.
// Phase 3: application documents (PDF, JPG only)
// Phase 4: CSV/Excel scholar imports
//
// @example throw new UnsupportedFileTypeError(['application/pdf', 'image/jpeg'])
// ─────────────────────────────────────────────
export class UnsupportedFileTypeError extends AppError {
	constructor(allowed: string[]) {
		super(
			415,
			`Unsupported file type. Allowed: ${allowed.join(', ')}`,
			'UNSUPPORTED_FILE_TYPE',
		);
	}
}

// ─────────────────────────────────────────────
// HTTP 422 — Import Parse Error
// Use specifically for CSV/Excel import failures
// in upload.service.ts (Phase 4).
// details holds row-level parse errors so the
// admin can identify which rows failed.
//
// @example
//   throw new ImportError('Row 14 is missing last_name', [
//     { row: 14, field: 'last_name', reason: 'required' },
//   ])
// ─────────────────────────────────────────────
export class ImportError extends AppError {
	constructor(message: string, details?: unknown) {
		super(422, message, 'IMPORT_ERROR', details);
	}
}

// ─────────────────────────────────────────────
// HTTP 500 — Internal Server Error
// Last resort — prefer narrower error types.
// The message is safe to expose; use generic
// wording to avoid leaking implementation details.
// ─────────────────────────────────────────────
export class InternalError extends AppError {
	constructor(message = 'An unexpected error occurred') {
		super(500, message, 'INTERNAL_ERROR');
	}
}

// ─────────────────────────────────────────────
// Type guard
// Use inside catch blocks when you need to check
// whether an unknown error is a known AppError.
//
// @example
//   } catch (err) {
//     if (isAppError(err)) { ... }
//     return handleError(event, err);
//   }
// ─────────────────────────────────────────────
export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}
