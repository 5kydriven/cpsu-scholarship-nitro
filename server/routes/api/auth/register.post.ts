import { defineHandler } from 'nitro';
import { registerStudentSchema } from '../../../validators/application.validator';
import { createdResponse, handleError } from '../../../utils/response';
import { ValidationError } from '../../../utils/errors';
import { studentService } from '#server/service/student.service.ts';
import z from 'zod';

// ─────────────────────────────────────────────
// POST /api/auth/register
//
// Public route — listed in PUBLIC_ROUTES in 02.auth.ts.
// No Bearer token required.
//
// Creates a Supabase auth user + students DB row.
// The atomicity strategy is in student.service.ts.
// ─────────────────────────────────────────────

export default defineHandler(async (event) => {
	try {
		const body = await event.req.json();
		const parsed = registerStudentSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(z.treeifyError(parsed.error));
		}

		const student = await studentService.register(parsed.data);

		return createdResponse({
			id: student.id,
			studentId: student.studentId,
			lastName: student.lastName,
			givenName: student.givenName,
			email: student.email,
		});
	} catch (err) {
		return handleError(event, err);
	}
});
