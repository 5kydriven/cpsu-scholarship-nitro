import { defineHandler } from 'nitro';
import { updateApplicationStatusSchema } from '../../../../validators/application.validator';
import { successResponse, handleError } from '../../../../utils/response';
import { BadRequestError, ValidationError } from '../../../../utils/errors';
import { applicationService } from '#server/service/application.service.ts';
import z from 'zod';

// ─────────────────────────────────────────────
// PATCH /api/admin/applications/[id]
//
// Approve or reject a pending application.
// Protected by admin-guard.ts.
//
// Approve body:
//   { status: 'approved', awardNo: '...', appNo: '...', batch: '...' }
//
// Reject body:
//   { status: 'rejected', reason?: '...' }
//
// After status change, a mail notification is sent
// to the student (fire-and-forget — never blocks response).
// ─────────────────────────────────────────────

export default defineHandler(async (event) => {
	try {
		const id = event.context.params?.id;

		if (!id) throw new BadRequestError('Application ID is required');

		const body = await event.req.json();
		const parsed = updateApplicationStatusSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const adminId = event.context.user.id;

		const updated = await applicationService.updateStatus(
			id,
			parsed.data,
			adminId,
		);

		return successResponse(updated);
	} catch (err) {
		return handleError(event, err);
	}
});
