import { describe, expect, it, mock } from 'bun:test';

const getAllMock = mock(async () => [
	{
		id: 'course-1',
		name: 'bs information technology',
		abbreviation: 'bsit',
		major: 'network administration',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z',
	},
]);

mock.module('#server/services/course.service.ts', () => ({
	courseService: {
		getAll: getAllMock,
	},
}));

const { default: handler } = await import(
	'../../../server/routes/api/courses/index.get.ts'
);

describe('GET /api/courses', () => {
	it('returns the standard success envelope with snake_case data keys', async () => {
		const result = await handler({} as any);

		expect(getAllMock).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			success: true,
			data: [
				{
					id: 'course-1',
					name: 'bs information technology',
					abbreviation: 'bsit',
					major: 'network administration',
					created_at: '2026-01-01T00:00:00.000Z',
					updated_at: '2026-01-02T00:00:00.000Z',
				},
			],
			meta: undefined,
		});
	});
});
