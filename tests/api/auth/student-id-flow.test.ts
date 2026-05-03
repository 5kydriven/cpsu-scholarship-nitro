import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from '../../../server/utils/errors.ts';

const requestBodyMock = mock(async () => ({}));
const setCookieMock = mock(() => undefined);
const checkStatusMock = mock(async () => ({
	status: 'unlinked',
	studentId: '2024-0001',
}));
const requireUnlinkedMock = mock(async () => ({
	studentId: '2024-0001',
}));
const linkStudentIdMock = mock(async () => ({
	studentId: '2024-0001',
	linkedUserId: userId,
	linkedEmail: 'ada@example.com',
}));
const requireLinkedEmailMock = mock(async () => 'ada@example.com');
const signUpMock = mock(async () => ({
	data: {
		user: {
			id: userId,
			email: 'ada@example.com',
		},
		session: null,
	},
	error: null,
}));
const signInWithPasswordMock = mock(async () => ({
	data: {
		user: {
			id: userId,
			email: 'ada@example.com',
			phone: null,
			user_metadata: {
				role: 'student',
			},
		},
		session: {
			access_token: 'access-token',
			refresh_token: 'refresh-token',
		},
	},
	error: null,
}));
const deleteUserMock = mock(async () => ({ error: null }));

mock.module('#server/utils/request-body.ts', () => ({
	requestBody: requestBodyMock,
}));

mock.module('h3', () => ({
	setCookie: setCookieMock,
}));

mock.module('#server/services/student-id-roster.service.ts', () => ({
	studentIdRosterService: {
		checkStatus: checkStatusMock,
		requireUnlinked: requireUnlinkedMock,
		linkStudentId: linkStudentIdMock,
		requireLinkedEmail: requireLinkedEmailMock,
	},
}));

mock.module('#server/lib/supabase.ts', () => ({
	supabase: {
		auth: {
			signInWithPassword: signInWithPasswordMock,
		},
	},
	supabaseAdmin: {
		auth: {
			signUp: signUpMock,
			admin: {
				deleteUser: deleteUserMock,
			},
		},
	},
}));

const { default: checkHandler } = await import(
	'../../../server/routes/api/auth/student-id/check.post.ts'
);
const { default: registerHandler } = await import(
	'../../../server/routes/api/auth/register.post.ts'
);
const { default: loginHandler } = await import(
	'../../../server/routes/api/auth/login.post.ts'
);

const userId = '11111111-1111-4111-8111-111111111111';

function resetMocks() {
	for (const mocked of [
		requestBodyMock,
		setCookieMock,
		checkStatusMock,
		requireUnlinkedMock,
		linkStudentIdMock,
		requireLinkedEmailMock,
		signUpMock,
		signInWithPasswordMock,
		deleteUserMock,
	]) {
		mocked.mockClear();
	}

	requestBodyMock.mockImplementation(async () => ({}));
	checkStatusMock.mockImplementation(async () => ({
		status: 'unlinked',
		studentId: '2024-0001',
	}));
	requireUnlinkedMock.mockImplementation(async () => ({
		studentId: '2024-0001',
	}));
	linkStudentIdMock.mockImplementation(async () => ({
		studentId: '2024-0001',
		linkedUserId: userId,
		linkedEmail: 'ada@example.com',
	}));
	signUpMock.mockImplementation(async () => ({
		data: {
			user: {
				id: userId,
				email: 'ada@example.com',
			},
			session: null,
		},
		error: null,
	}));
	signInWithPasswordMock.mockImplementation(async () => ({
		data: {
			user: {
				id: userId,
				email: 'ada@example.com',
				phone: null,
				user_metadata: {
					role: 'student',
				},
			},
			session: {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
			},
		},
		error: null,
	}));
	requireLinkedEmailMock.mockImplementation(async () => 'ada@example.com');
	deleteUserMock.mockImplementation(async () => ({ error: null }));
}

describe('student ID auth flow', () => {
	beforeEach(() => {
		resetMocks();
	});

	it('checks an unlinked imported student ID', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2024-0001',
		}));

		const result = await checkHandler({} as any);

		expect(checkStatusMock).toHaveBeenCalledWith('2024-0001');
		expect(result).toEqual({
			success: true,
			data: {
				status: 'unlinked',
				student_id: '2024-0001',
			},
			meta: undefined,
		});
	});

	it('checks a linked imported student ID', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2024-0001',
		}));
		checkStatusMock.mockImplementationOnce(async () => ({
			status: 'linked',
			studentId: '2024-0001',
		}));

		const result = await checkHandler({} as any);

		expect(result).toEqual({
			success: true,
			data: {
				status: 'linked',
				student_id: '2024-0001',
			},
			meta: undefined,
		});
	});

	it('returns 404 when the student ID is not imported', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2024-9999',
		}));
		checkStatusMock.mockImplementationOnce(async () => {
			throw new NotFoundError('Student ID');
		});

		const response = (await checkHandler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(404);
		expect(json.error.code).toBe('NOT_FOUND');
	});

	it('registers and links an imported unlinked student ID', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2024-0001',
			email: 'ada@example.com',
			password: 'password123',
		}));

		const result = await registerHandler({} as any);

		expect(requireUnlinkedMock).toHaveBeenCalledWith('2024-0001');
		expect(signUpMock).toHaveBeenCalledWith({
			email: 'ada@example.com',
			password: 'password123',
			options: {
				data: {
					role: 'student',
					studentId: '2024-0001',
				},
			},
		});
		expect(linkStudentIdMock).toHaveBeenCalledWith(
			'2024-0001',
			userId,
			'ada@example.com',
		);
		expect(setCookieMock).toHaveBeenCalledTimes(2);
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
			}),
		);
	});

	it('rejects registration for an already linked student ID', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2024-0001',
			email: 'ada@example.com',
			password: 'password123',
		}));
		requireUnlinkedMock.mockImplementationOnce(async () => {
			throw new ConflictError('Student ID is already registered');
		});

		const response = (await registerHandler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(409);
		expect(signUpMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('CONFLICT');
	});

	it('rejects registration for an unknown student ID', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2024-9999',
			email: 'ada@example.com',
			password: 'password123',
		}));
		requireUnlinkedMock.mockImplementationOnce(async () => {
			throw new NotFoundError('Student ID');
		});

		const response = (await registerHandler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(404);
		expect(signUpMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('NOT_FOUND');
	});

	it('logs in with student ID and password', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2024-0001',
			password: 'password123',
		}));

		const result = await loginHandler({} as any);

		expect(requireLinkedEmailMock).toHaveBeenCalledWith('2024-0001');
		expect(signInWithPasswordMock).toHaveBeenCalledWith({
			email: 'ada@example.com',
			password: 'password123',
		});
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
			}),
		);
	});

	it('rejects student ID login when the account is not registered yet', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2024-0001',
			password: 'password123',
		}));
		requireLinkedEmailMock.mockImplementationOnce(async () => {
			throw new BadRequestError('Student ID is not registered yet');
		});

		const response = (await loginHandler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(400);
		expect(signInWithPasswordMock).not.toHaveBeenCalled();
		expect(json.error.message).toBe('Student ID is not registered yet');
	});

	it('keeps email login working', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			email: 'ada@example.com',
			password: 'password123',
		}));

		await loginHandler({} as any);

		expect(requireLinkedEmailMock).not.toHaveBeenCalled();
		expect(signInWithPasswordMock).toHaveBeenCalledWith({
			email: 'ada@example.com',
			password: 'password123',
		});
	});
});
