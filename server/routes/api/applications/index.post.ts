import { defineHandler } from 'nitro';
import { submitApplicationSchema } from '../../../validators/application.validator';
import { createdResponse, handleError } from '../../../utils/response';
import { ValidationError } from '../../../utils/errors';
import { requireStudent } from '../../../types/h3';
import { applicationService } from '#server/service/application.service.ts';
import z from 'zod';

// ─────────────────────────────────────────────
// POST /api/applications
//
// Student submits a new scholarship application.
// Protected: JWT required, student role only.
//
// The service enforces one-pending-per-student via
// the unique_pending_application DB index.
// ─────────────────────────────────────────────

export default defineHandler(async (event) => {
	try {
		const student = requireStudent(event.context);

		const body = await event.req.json();
		const parsed = submitApplicationSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const application = await applicationService.submit(
			student.id,
			parsed.data,
		);

		return createdResponse(application);
	} catch (err) {
		return handleError(event, err);
	}
});
