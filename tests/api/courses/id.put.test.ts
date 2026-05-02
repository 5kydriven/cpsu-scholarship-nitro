import { beforeEach, describe, expect, it, mock } from 'bun:test';

const updateMock = mock(async (id, course) => ({
	id,
	name: 'bs information technology',
	abbreviation: 'bsit',
	major: course.major ?? 'web development',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-03-01T00:00:00.000Z',
}));

const requestBodyMock = mock(async () => ({
	major: '  Software Engineering  ',
}));

mock.module('#server/services/course.service.ts', () => ({
	courseService: {
		update: updateMock,
	},
}));

mock.module('#server/utils/request-body.ts', () => ({
	requestBody: requestBodyMock,
}));

const { default: handler } = await import(
	'../../../server/routes/api/courses/[id].put.ts'
);

describe('PUT /api/courses/:id', () => {
	beforeEach(() => {
		updateMock.mockClear();
		requestBodyMock.mockClear();
	});

	it('updates a course and returns the success envelope', async () => {
		const event = {
			context: {
				params: {
					id: 'course-1',
				},
			},
		} as any;

		const result = await handler(event);

		expect(requestBodyMock).toHaveBeenCalledTimes(1);
		expect(updateMock).toHaveBeenCalledWith('course-1', {
			major: 'software engineering',
		});
		expect(result).toEqual({
			success: true,
			data: {
				id: 'course-1',
				name: 'bs information technology',
				abbreviation: 'bsit',
				major: 'software engineering',
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-03-01T00:00:00.000Z',
			},
			meta: undefined,
		});
	});

	it('returns 400 when the course id is missing', async () => {
		const response = (await handler({
			context: {
				params: {},
			},
		} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(400);
		expect(updateMock).not.toHaveBeenCalled();
		expect(json.success).toBe(false);
		expect(json.error.code).toBe('BAD_REQUEST');
		expect(json.error.message).toBe('Course ID is required');
	});

	it('returns 422 when the update payload fails validation', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			major: 'x'.repeat(51),
		}));

		const response = (await handler({
			context: {
				params: {
					id: 'course-1',
				},
			},
		} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(updateMock).not.toHaveBeenCalled();
		expect(json.success).toBe(false);
		expect(json.error.code).toBe('VALIDATION_ERROR');
	});
});
