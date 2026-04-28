import { beforeEach, describe, expect, it, mock } from 'bun:test';

const createMock = mock(async (course) => ({
	id: 'course-2',
	createdAt: '2026-02-01T00:00:00.000Z',
	updatedAt: '2026-02-01T00:00:00.000Z',
	...course,
}));

const requestBodyMock = mock(async () => ({
	name: '  BS Information Technology  ',
	abbreviation: '  BSIT  ',
	major: '  Network Administration  ',
}));

mock.module('#server/services/course.service.ts', () => ({
	courseService: {
		create: createMock,
	},
}));

mock.module('#server/utils/request-body.ts', () => ({
	requestBody: requestBodyMock,
}));

const { default: handler } = await import(
	'../../../server/routes/api/courses/index.post.ts'
);

describe('POST /api/courses', () => {
	beforeEach(() => {
		createMock.mockClear();
		requestBodyMock.mockClear();
	});

	it('creates a course and returns the success envelope', async () => {
		const result = await handler({} as any);

		expect(requestBodyMock).toHaveBeenCalledTimes(1);
		expect(createMock).toHaveBeenCalledWith({
			name: 'bs information technology',
			abbreviation: 'bsit',
			major: 'network administration',
		});
		expect(result).toEqual({
			success: true,
			data: {
				id: 'course-2',
				name: 'bs information technology',
				abbreviation: 'bsit',
				major: 'network administration',
				created_at: '2026-02-01T00:00:00.000Z',
				updated_at: '2026-02-01T00:00:00.000Z',
			},
			meta: undefined,
		});
	});

	it('returns 422 when the request body fails validation', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			name: '',
			abbreviation: '',
		}));

		const response = (await handler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(createMock).not.toHaveBeenCalled();
		expect(json.success).toBe(false);
		expect(json.error.code).toBe('VALIDATION_ERROR');
		expect(json.error.message).toBe('Validation failed');
	});
});
