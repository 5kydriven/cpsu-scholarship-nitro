import { defineHandler } from 'nitro';
import { ForbiddenError } from '../utils/errors';
import { handleError } from '../utils/response';
import type { AppRole } from '../types/h3';

// ─────────────────────────────────────────────
// admin-guard.ts
//
// Route-scoped middleware — only runs for
// /api/admin/** requests (configured in nitro.config.ts).
//
// 02.auth.ts always runs first and has already:
//   • Verified the JWT
//   • Attached event.context.user
//   • Resolved event.context.role
//
// This guard only needs to check the role.
// Never duplicate auth token logic here.
// ─────────────────────────────────────────────

// Roles that are allowed to access /api/admin/** routes.
// Extend this set when adding staff or super-admin roles.
const ALLOWED_ROLES: AppRole[] = ['admin'];

export default defineHandler(async (event) => {
	const role = event.context.role;

	if (!role || !ALLOWED_ROLES.includes(role)) {
		return handleError(event, new ForbiddenError('Admin access required'));
	}

	return;
});
