import {
	ImportError,
	UnsupportedFileTypeError,
} from '#server/utils/errors.ts';
import type { MultipartDocumentFile } from '#server/utils/multipart-form.ts';
import type { StudentRosterImportRow } from '#server/services/student-id-roster.service.ts';

const EXPECTED_HEADERS = ['student_id', 'name'];

function isCsvFile(file: MultipartDocumentFile) {
	const filename = file.filename.toLowerCase();
	return file.type === 'text/csv' || filename.endsWith('.csv');
}

function parseCsv(text: string) {
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

		if (char === ',' && !inQuotes) {
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
		throw new ImportError('CSV has an unterminated quoted value');
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

function normalizeHeader(value: string) {
	return value.replace(/^\uFEFF/, '').trim().toLowerCase();
}

export async function parseStudentRosterCsv(file: MultipartDocumentFile) {
	if (!isCsvFile(file)) {
		throw new UnsupportedFileTypeError(['text/csv']);
	}

	const text = await file.file.text();
	const rows = parseCsv(text);

	if (rows.length === 0) {
		throw new ImportError('CSV file is empty');
	}

	const headers = rows[0]!.map(normalizeHeader);
	const hasExpectedHeaders =
		headers.length === EXPECTED_HEADERS.length &&
		headers.every((header, index) => header === EXPECTED_HEADERS[index]);

	if (!hasExpectedHeaders) {
		throw new ImportError('CSV headers must be student_id,name');
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
				reason: 'Duplicate student ID in CSV',
			});
		}

		if (studentId && fullName && !seen.has(studentId)) {
			seen.add(studentId);
			parsedRows.push({ studentId, fullName });
		}
	}

	if (errors.length > 0) {
		throw new ImportError('CSV import validation failed', errors);
	}

	return parsedRows;
}
