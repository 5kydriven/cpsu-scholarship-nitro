import { defineHandler } from 'nitro';
import { ForbiddenError } from '../utils/errors';
import { handleError } from '../utils/response';
import type { AppRole } from '../types/h3';

const ALLOWED_ROLES: AppRole[] = ['admin', 'staff'];

const GUARDED_PREFIXES: string[] = ['/api/admin', '/api/personnels'];

export default defineHandler(async (event) => {
	const path = event.url.pathname;

	const isGuarded = GUARDED_PREFIXES.some((prefix) => path.startsWith(prefix));

	if (!isGuarded) return;

	const role = event.context.role;

	if (!role || !ALLOWED_ROLES.includes(role)) {
		return handleError(event, new ForbiddenError('Admin access required'));
	}

	return;
});
