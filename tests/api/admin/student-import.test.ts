import { beforeEach, describe, expect, it, mock } from 'bun:test';

const requestBodyMock = mock(async () => ({
	file: csvFile('student_id,name\n2024-0001,Ada Lovelace\n'),
}));
const importRowsMock = mock(async (rows) => ({
	totalRows: rows.length,
	created: rows.length,
	updated: 0,
	linkedExisting: 0,
}));

mock.module('#server/utils/request-body.ts', () => ({
	requestBody: requestBodyMock,
}));

mock.module('#server/services/student-id-roster.service.ts', () => ({
	studentIdRosterService: {
		importRows: importRowsMock,
	},
}));

const { default: handler } = await import(
	'../../../server/routes/api/admin/students/import.post.ts'
);

function csvFile(content: string, filename = 'students.csv', type = 'text/csv') {
	return {
		filename,
		type,
		size: content.length,
		file: new File([content], filename, { type }),
	};
}

function resetMocks() {
	requestBodyMock.mockClear();
	importRowsMock.mockClear();
	requestBodyMock.mockImplementation(async () => ({
		file: csvFile('student_id,name\n2024-0001,Ada Lovelace\n'),
	}));
	importRowsMock.mockImplementation(async (rows) => ({
		totalRows: rows.length,
		created: rows.length,
		updated: 0,
		linkedExisting: 0,
	}));
}

describe('POST /api/admin/students/import', () => {
	beforeEach(() => {
		resetMocks();
	});

	it('imports valid student roster CSV rows', async () => {
		const result = await handler({} as any);

		expect(importRowsMock).toHaveBeenCalledWith([
			{
				studentId: '2024-0001',
				fullName: 'Ada Lovelace',
			},
		]);
		expect(result).toEqual({
			success: true,
			data: {
				total_rows: 1,
				created: 1,
				updated: 0,
				linked_existing: 0,
			},
			meta: undefined,
		});
	});

	it('rejects missing CSV headers', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			file: csvFile('id,name\n2024-0001,Ada Lovelace\n'),
		}));

		const response = (await handler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(importRowsMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('IMPORT_ERROR');
		expect(json.error.message).toBe('CSV headers must be student_id,name');
	});

	it('rejects blank values', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			file: csvFile('student_id,name\n,Ada Lovelace\n2024-0002,\n'),
		}));

		const response = (await handler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(importRowsMock).not.toHaveBeenCalled();
		expect(json.error.details).toEqual([
			{
				row: 2,
				field: 'student_id',
				reason: 'Student ID is required',
			},
			{
				row: 3,
				field: 'name',
				reason: 'Name is required',
			},
		]);
	});

	it('rejects duplicate student IDs in the same CSV', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			file: csvFile(
				'student_id,name\n2024-0001,Ada Lovelace\n2024-0001,Grace Hopper\n',
			),
		}));

		const response = (await handler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(importRowsMock).not.toHaveBeenCalled();
		expect(json.error.details).toEqual([
			{
				row: 3,
				field: 'student_id',
				reason: 'Duplicate student ID in CSV',
			},
		]);
	});

	it('rejects non-CSV uploads', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			file: csvFile('student_id,name\n2024-0001,Ada Lovelace\n', 'students.txt', 'text/plain'),
		}));

		const response = (await handler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(415);
		expect(importRowsMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('UNSUPPORTED_FILE_TYPE');
	});
});
