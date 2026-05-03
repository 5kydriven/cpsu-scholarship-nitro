import { studentIdRosterService } from '#server/services/student-id-roster.service.ts';
import { BadRequestError } from '#server/utils/errors.ts';
import { isMultipartDocumentFile } from '#server/utils/multipart-form.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { parseStudentRosterCsv } from '#server/utils/student-roster-csv.ts';
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const file = body.file;

		if (!isMultipartDocumentFile(file)) {
			throw new BadRequestError('CSV file is required');
		}

		const rows = await parseStudentRosterCsv(file);
		const result = await studentIdRosterService.importRows(rows);

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
