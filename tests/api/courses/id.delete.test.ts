import { beforeEach, describe, expect, it, mock } from 'bun:test';

const deleteMock = mock(async (id) => ({
	id,
	name: 'bs information technology',
	abbreviation: 'bsit',
	major: 'network administration',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-03-01T00:00:00.000Z',
}));

mock.module('#server/services/course.service.ts', () => ({
	courseService: {
		delete: deleteMock,
	},
}));

const { default: handler } = await import(
	'../../../server/routes/api/courses/[id].delete.ts'
);

describe('DELETE /api/courses/:id', () => {
	beforeEach(() => {
		deleteMock.mockClear();
	});

	it('deletes a course and returns the success envelope', async () => {
		const result = await handler({
			context: {
				params: {
					id: 'course-1',
				},
			},
		} as any);

		expect(deleteMock).toHaveBeenCalledWith('course-1');
		expect(result).toEqual({
			success: true,
			data: {
				id: 'course-1',
				name: 'bs information technology',
				abbreviation: 'bsit',
				major: 'network administration',
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-03-01T00:00:00.000Z',
			},
			meta: undefined,
		});
	});

	it('returns 500 when the course id is missing', async () => {
		const response = (await handler({
			context: {
				params: {},
			},
		} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(500);
		expect(deleteMock).not.toHaveBeenCalled();
		expect(json.success).toBe(false);
		expect(json.error.code).toBe('INTERNAL_ERROR');
		expect(json.error.message).toBe('An unexpected error occurred');
	});
});
