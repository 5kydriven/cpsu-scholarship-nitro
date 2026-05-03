import type { StudentRosterImportRow } from '#server/services/student-id-roster.service.ts';
import {
	ImportError,
	UnsupportedFileTypeError,
} from '#server/utils/errors.ts';
import type { MultipartDocumentFile } from '#server/utils/multipart-form.ts';
import * as XLSX from 'xlsx';

const EXPECTED_HEADERS = ['student id no.', 'name'];
const SUPPORTED_TYPES = [
	'text/csv',
	'text/tab-separated-values',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function extension(file: MultipartDocumentFile) {
	const name = file.filename.toLowerCase();
	return name.slice(name.lastIndexOf('.') + 1);
}

function isSupportedFile(file: MultipartDocumentFile) {
	return (
		SUPPORTED_TYPES.includes(file.type) ||
		['csv', 'tsv', 'txt', 'xls', 'xlsx'].includes(extension(file))
	);
}

function delimiterFor(text: string, file: MultipartDocumentFile) {
	if (extension(file) === 'tsv') return '\t';

	const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
	const tabs = firstLine.split('\t').length - 1;
	const commas = firstLine.split(',').length - 1;

	return tabs > commas ? '\t' : ',';
}

function parseDelimited(text: string, delimiter: string) {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index]!;
		const next = text[index + 1];

		if (char === '"') {
			if (inQuotes && next === '"') {
				field += '"';
				index += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (char === delimiter && !inQuotes) {
			row.push(field);
			field = '';
			continue;
		}

		if ((char === '\n' || char === '\r') && !inQuotes) {
			if (char === '\r' && next === '\n') index += 1;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
			continue;
		}

		field += char;
	}

	if (inQuotes) {
		throw new ImportError('Spreadsheet has an unterminated quoted value');
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

async function parseWorkbook(file: MultipartDocumentFile) {
	const buffer = await file.file.arrayBuffer();
	const workbook = XLSX.read(buffer, { type: 'array' });
	const firstSheet = workbook.SheetNames[0];

	if (!firstSheet) {
		throw new ImportError('Spreadsheet file is empty');
	}

	return XLSX.utils
		.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet]!, {
			header: 1,
			blankrows: false,
			defval: '',
		})
		.map((row) => row.map((cell) => String(cell)));
}

async function parseRows(file: MultipartDocumentFile) {
	if (['xls', 'xlsx'].includes(extension(file))) {
		return await parseWorkbook(file);
	}

	const text = await file.file.text();
	return parseDelimited(text, delimiterFor(text, file));
}

function normalizeHeader(value: string) {
	return value.replace(/^\uFEFF/, '').trim().toLowerCase();
}

export async function parseStudentRosterFile(file: MultipartDocumentFile) {
	if (!isSupportedFile(file)) {
		throw new UnsupportedFileTypeError(SUPPORTED_TYPES);
	}

	const rows = await parseRows(file);

	if (rows.length === 0) {
		throw new ImportError('Spreadsheet file is empty');
	}

	const headers = rows[0]!.map(normalizeHeader);
	const hasExpectedHeaders =
		headers.length === EXPECTED_HEADERS.length &&
		headers.every((header, index) => header === EXPECTED_HEADERS[index]);

	if (!hasExpectedHeaders) {
		throw new ImportError(
			'Spreadsheet headers must be Student ID No.,Name',
		);
	}

	const seen = new Set<string>();
	const errors: { row: number; field: string; reason: string }[] = [];
	const parsedRows: StudentRosterImportRow[] = [];

	for (let index = 1; index < rows.length; index += 1) {
		const cells = rows[index]!;
		const rowNumber = index + 1;

		if (cells.length !== EXPECTED_HEADERS.length) {
			errors.push({
				row: rowNumber,
				field: 'row',
				reason: 'Expected exactly 2 columns',
			});
			continue;
		}

		const studentId = cells[0]!.trim();
		const fullName = cells[1]!.trim();

		if (!studentId) {
			errors.push({
				row: rowNumber,
				field: 'student_id',
				reason: 'Student ID is required',
			});
		}

		if (!fullName) {
			errors.push({
				row: rowNumber,
				field: 'name',
				reason: 'Name is required',
			});
		}

		if (studentId && seen.has(studentId)) {
			errors.push({
				row: rowNumber,
				field: 'student_id',
				reason: 'Duplicate student ID in file',
			});
		}

		if (studentId && fullName && !seen.has(studentId)) {
			seen.add(studentId);
			parsedRows.push({ studentId, fullName });
		}
	}

	if (errors.length > 0) {
		throw new ImportError('Student ID roster import validation failed', errors);
	}

	return parsedRows;
}
