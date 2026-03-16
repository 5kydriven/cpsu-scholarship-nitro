export class AppError extends Error {
	constructor(
		public statusCode: number,
		public override message: string,
		public code?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string) {
		super(404, `${resource} not found`, 'NOT_FOUND');
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized') {
		super(401, message, 'UNAUTHORIZED');
	}
}

export class ValidationError extends AppError {
	constructor(details: unknown) {
		super(422, 'Validation failed', 'VALIDATION_ERROR', details);
	}
}
