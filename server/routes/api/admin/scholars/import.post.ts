import { defineHandler } from 'nitro';

import { createdResponse, handleError } from '../../../../utils/response';
import {
	BadRequestError,
	UnsupportedFileTypeError,
	FileTooLargeError,
	ValidationError,
} from '../../../../utils/errors';
import { db, uploads, programs } from '../../../../db';
import { eq } from 'drizzle-orm';
import {
	scholarService,
	type ScholarImportRow,
} from '#server/service/scholar.service.ts';
import { importUploadSchema } from '#server/validators/application.validator.ts';

// ─────────────────────────────────────────────
// POST /api/admin/scholars/import
//
// Accepts multipart/form-data:
//   file         — CSV file (max 10 MB)
//   programId    — integer
//   academicYear — "YYYY-YYYY" (e.g. "2024-2025")
//   semester     — "1" | "2" | "summer"
//
// ⚠️  uploads table schema:
//       id, file_name, program_id, academic_year,
//       semester, uploaded_at
//     There is NO uploadedBy column in the current
//     migration — do not insert it until a migration
//     adds the column.
//
// Protected by admin-guard.ts.
// ─────────────────────────────────────────────

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export default defineHandler(async (event) => {
	try {
		// Parse multipart form (H3 v2 / web standard)
		const formData = await event.req.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			throw new BadRequestError('No file uploaded — expected field "file"');
		}

		// Validate upload metadata fields via Zod
		const metaParsed = importUploadSchema.safeParse({
			programId: formData.get('programId'),
			academicYear: formData.get('academicYear'),
			semester: formData.get('semester'),
		});

		if (!metaParsed.success) {
			throw new ValidationError(metaParsed.error.flatten());
		}

		const { programId, academicYear, semester } = metaParsed.data;

		// Validate file size
		if (file.size > MAX_FILE_BYTES) {
			throw new FileTooLargeError(10);
		}

		// Validate file type (accept .csv only in Phase 2)
		const isCSV =
			file.type === 'text/csv' ||
			file.type === 'application/vnd.ms-excel' ||
			file.name.toLowerCase().endsWith('.csv');

		if (!isCSV) {
			throw new UnsupportedFileTypeError(['.csv']);
		}

		// Verify program exists
		const program = await db.query.programs.findFirst({
			where: eq(programs.id, programId),
		});

		if (!program) {
			throw new BadRequestError(`Program with ID ${programId} does not exist`);
		}

		// Parse CSV
		const text = await file.text();
		const rows = parseCSV(text, programId);

		if (rows.length === 0) {
			throw new BadRequestError(
				'The uploaded file contains no valid data rows',
			);
		}

		// Record the upload — only columns that exist in the schema
		const [upload] = await db
			.insert(uploads)
			.values({
				fileName: file.name,
				programId,
				academicYear,
				semester,
				// uploadedBy is NOT in the current schema — add migration before using it
			})
			.returning();

		// Run bulk import
		const summary = await scholarService.importBatch(rows, upload.id);

		return createdResponse({
			uploadId: upload.id,
			fileName: file.name,
			programId,
			academicYear,
			semester,
			...summary,
		});
	} catch (err) {
		return handleError(event, err);
	}
});

// ─────────────────────────────────────────────
// CSV parser
//
// Expected headers (case-insensitive, order-independent):
//   scholar_identifier, last_name, first_name,
//   middle_name, sex, province, city, course,
//   year_level, award_no, app_no
//
// programId comes from the form field, not the CSV.
// ─────────────────────────────────────────────

function parseCSV(text: string, programId: number): ScholarImportRow[] {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);

	if (lines.length < 2) return [];

	const headers = lines[0]
		.split(',')
		.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

	const col = (name: string) => headers.indexOf(name);

	const rows: ScholarImportRow[] = [];

	for (let i = 1; i < lines.length; i++) {
		const cells = splitCSVLine(lines[i]);

		const scholarIdentifier = cells[col('scholar_identifier')]?.trim();
		const lastName = cells[col('last_name')]?.trim();
		const firstName = cells[col('first_name')]?.trim(); // scholars use firstName
		const middleName = cells[col('middle_name')]?.trim() || undefined;
		const sexRaw = cells[col('sex')]?.trim().toLowerCase();
		const province = cells[col('province')]?.trim() || undefined;
		const city = cells[col('city')]?.trim() || undefined;
		const course = cells[col('course')]?.trim();
		const yearLevelRaw = cells[col('year_level')]?.trim();
		const awardNo = cells[col('award_no')]?.trim() || undefined;
		const appNo = cells[col('app_no')]?.trim() || undefined;

		// Skip blank rows
		if (!scholarIdentifier && !lastName && !firstName) continue;

		rows.push({
			scholarIdentifier: scholarIdentifier ?? '',
			lastName: lastName ?? '',
			firstName: firstName ?? '',
			middleName,
			sex: sexRaw === 'male' || sexRaw === 'female' ? sexRaw : undefined,
			province,
			city,
			programId,
			course: course ?? '',
			yearLevel: yearLevelRaw
				? parseInt(yearLevelRaw, 10) || undefined
				: undefined,
			awardNo,
			appNo,
		});
	}

	return rows;
}

// Handles quoted CSV fields containing commas
function splitCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (const char of line) {
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	result.push(current);
	return result;
}
