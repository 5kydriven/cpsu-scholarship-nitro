import { defineHandler } from 'nitro';
import { successResponse, handleError } from '../../../utils/response';
import { requireStudent } from '../../../types/h3';
import { applicationService } from '#server/service/application.service.ts';

// ─────────────────────────────────────────────
// GET /api/applications/me
//
// Returns the authenticated student's most recent
// application (with address, parents, documents).
//
// Returns data: null when the student has not yet
// submitted — this is not a 404. The frontend
// should treat null as "no application yet".
// ─────────────────────────────────────────────

export default defineHandler(async (event) => {
	try {
		const student = requireStudent(event.context);

		const application = await applicationService.getByStudent(student.id);

		return successResponse(application);
	} catch (err) {
		return handleError(event, err);
	}
});
