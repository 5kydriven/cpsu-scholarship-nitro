import { beforeEach, describe, expect, it, mock } from 'bun:test';

const requestBodyMock = mock(async () => ({}));
const updateByIdMock = mock(async (id, input) => ({
	id,
	...input,
	updatedAt: '2026-05-03T00:00:00.000Z',
}));
const deleteByIdMock = mock(async (id) => ({
	id,
	studentId: '2025-0015-R',
}));
const deleteBatchMock = mock(async () => ({
	deleted: 2,
	rows: [
		{ studentId: '2025-0015-R' },
		{ studentId: '2025-0075-R' },
	],
}));

mock.module('#server/utils/request-body.ts', () => ({
	requestBody: requestBodyMock,
}));

mock.module('#server/services/student-id-roster.service.ts', () => ({
	studentIdRosterService: {
		updateById: updateByIdMock,
		deleteById: deleteByIdMock,
		deleteBatch: deleteBatchMock,
	},
}));

const { default: updateHandler } = await import(
	'../../../server/routes/api/admin/student-id-roster/[id].put.ts'
);
const { default: deleteHandler } = await import(
	'../../../server/routes/api/admin/student-id-roster/[id].delete.ts'
);
const { default: batchDeleteHandler } = await import(
	'../../../server/routes/api/admin/student-id-roster/batch-delete.post.ts'
);

const rosterId = '11111111-1111-4111-8111-111111111111';

function event(id = rosterId) {
	return {
		context: {
			params: {
				id,
			},
		},
	} as any;
}

function resetMocks() {
	for (const mocked of [
		requestBodyMock,
		updateByIdMock,
		deleteByIdMock,
		deleteBatchMock,
	]) {
		mocked.mockClear();
	}

	requestBodyMock.mockImplementation(async () => ({}));
	updateByIdMock.mockImplementation(async (id, input) => ({
		id,
		...input,
		updatedAt: '2026-05-03T00:00:00.000Z',
	}));
	deleteByIdMock.mockImplementation(async (id) => ({
		id,
		studentId: '2025-0015-R',
	}));
	deleteBatchMock.mockImplementation(async () => ({
		deleted: 2,
		rows: [
			{ studentId: '2025-0015-R' },
			{ studentId: '2025-0075-R' },
		],
	}));
}

describe('student ID roster management routes', () => {
	beforeEach(() => {
		resetMocks();
	});

	it('updates a roster row', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '2025-0015-R',
			fullName: 'ABELO, JANEL',
		}));

		const result = await updateHandler(event());

		expect(updateByIdMock).toHaveBeenCalledWith(rosterId, {
			studentId: '2025-0015-R',
			fullName: 'ABELO, JANEL',
		});
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
			}),
		);
	});

	it('deletes a single roster row by id', async () => {
		const result = await deleteHandler(event());

		expect(deleteByIdMock).toHaveBeenCalledWith(rosterId);
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
			}),
		);
	});

	it('deletes roster rows in a batch by student IDs', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentIds: ['2025-0015-R', '2025-0075-R'],
		}));

		const result = await batchDeleteHandler({} as any);

		expect(deleteBatchMock).toHaveBeenCalledWith({
			studentIds: ['2025-0015-R', '2025-0075-R'],
		});
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
			}),
		);
	});

	it('rejects empty batch delete requests', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({}));

		const response = (await batchDeleteHandler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(deleteBatchMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('VALIDATION_ERROR');
	});
});
