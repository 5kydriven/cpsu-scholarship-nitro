import { beforeEach, describe, expect, it, mock } from 'bun:test';
import * as XLSX from 'xlsx';

const requestBodyMock = mock(async () => ({
	file: rosterFile(
		'Student ID No.\tName\n2025-0015-R\tABELO, JANEL\n',
		'student-id-roster.tsv',
		'text/tab-separated-values',
	),
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
	'../../../server/routes/api/admin/student-id-roster/import.post.ts'
);

function rosterFile(content: string, filename = 'roster.csv', type = 'text/csv') {
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
		file: rosterFile(
			'Student ID No.\tName\n2025-0015-R\tABELO, JANEL\n',
			'student-id-roster.tsv',
			'text/tab-separated-values',
		),
	}));
	importRowsMock.mockImplementation(async (rows) => ({
		totalRows: rows.length,
		created: rows.length,
		updated: 0,
		linkedExisting: 0,
	}));
}

function xlsxFile() {
	const workbook = XLSX.utils.book_new();
	const worksheet = XLSX.utils.aoa_to_sheet([
		['Student ID No.', 'Name'],
		['2025-0075-R', 'AGUADO, LARRY'],
	]);
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Roster');
	const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

	return {
		filename: 'student-id-roster.xlsx',
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		size: buffer.byteLength,
		file: new File([buffer], 'student-id-roster.xlsx', {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		}),
	};
}

describe('POST /api/admin/student-id-roster/import', () => {
	beforeEach(() => {
		resetMocks();
	});

	it('imports valid student roster tab-separated rows', async () => {
		const result = await handler({} as any);

		expect(importRowsMock).toHaveBeenCalledWith([
			{
				studentId: '2025-0015-R',
				fullName: 'ABELO, JANEL',
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

	it('imports valid Excel workbook rows', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			file: xlsxFile(),
		}));

		const result = await handler({} as any);

		expect(importRowsMock).toHaveBeenCalledWith([
			{
				studentId: '2025-0075-R',
				fullName: 'AGUADO, LARRY',
			},
		]);
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
			}),
		);
	});

	it('rejects missing CSV headers', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			file: rosterFile('id,name\n2024-0001,Ada Lovelace\n'),
		}));

		const response = (await handler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(importRowsMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('IMPORT_ERROR');
		expect(json.error.message).toBe(
			'Spreadsheet headers must be Student ID No.,Name',
		);
	});

	it('rejects blank values', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			file: rosterFile(
				'Student ID No.,Name\n,"ABELO, JANEL"\n2025-0022-R,\n',
			),
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
			file: rosterFile(
				'Student ID No.,Name\n2025-0015-R,"ABELO, JANEL"\n2025-0015-R,"AGUADO, LARRY"\n',
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
				reason: 'Duplicate student ID in file',
			},
		]);
	});

	it('rejects unsupported uploads', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			file: rosterFile(
				'Student ID No.,Name\n2025-0015-R,"ABELO, JANEL"\n',
				'students.pdf',
				'application/pdf',
			),
		}));

		const response = (await handler({} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(415);
		expect(importRowsMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('UNSUPPORTED_FILE_TYPE');
	});
});
