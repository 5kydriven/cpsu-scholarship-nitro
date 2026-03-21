import { defineHandler } from 'nitro';
import { eq } from 'drizzle-orm';
import { supabase } from '../lib/supabase';
import { db, students } from '../db';
import { UnauthorizedError } from '../utils/errors';
import { handleError } from '../utils/response';
import { isDev } from '../utils/env';
import type { AppRole } from '../types/h3';

// ─────────────────────────────────────────────
// 02.auth.ts  (Phase 2 — updated)
//
// Changes from Phase 1:
//   • POST /api/auth/register added to PUBLIC_ROUTES
//   • Role resolution is now explicit — unrecognised
//     roles log a dev warning instead of silently
//     falling through to 'student'
// ─────────────────────────────────────────────

const PUBLIC_ROUTES: string[] = [
	'/api/health',
	'/api/auth/register', // Phase 2A — student self-registration
	'/',
];

export default defineHandler(async (event) => {
	const url = new URL(event.req.url);
	const path = url.pathname;

	// ── Public route bypass ───────────────────
	if (PUBLIC_ROUTES.some((r) => path.startsWith(r))) return;

	// ── Extract Bearer token ──────────────────
	const authHeader = event.req.headers.get('authorization');

	if (!authHeader?.startsWith('Bearer ')) {
		return handleError(
			event,
			new UnauthorizedError('Missing or malformed Authorization header'),
		);
	}

	const token = authHeader.slice(7);

	// ── Verify JWT with Supabase ──────────────
	const { data, error } = await supabase.auth.getUser(token);

	if (error || !data.user) {
		return handleError(
			event,
			new UnauthorizedError('Invalid or expired token'),
		);
	}

	const authUser = data.user;

	// ── Resolve role — explicit, no silent fallthrough ───
	// Roles live in auth.users.user_metadata.role.
	// Any value not in AppRole is treated as 'student' but
	// logged in development so dashboard typos are caught early.
	const rawRole = authUser.user_metadata?.role as string | undefined;

	let role: AppRole;

	if (rawRole === 'admin') {
		role = 'admin';
	} else if (rawRole === 'staff') {
		role = 'staff';
	} else {
		if (rawRole !== undefined && rawRole !== 'student') {
			if (isDev) {
				console.warn(
					`[auth] Unrecognised role "${rawRole}" for user ${authUser.id} — defaulting to "student"`,
				);
			}
		}
		role = 'student';
	}

	// ── Attach auth user + role ───────────────
	event.context.user = authUser;
	event.context.role = role;

	// ── Load student row (students only) ─────
	// Admins and staff have no students row — that is intentional.
	if (role === 'student') {
		const student = await db.query.students.findFirst({
			where: eq(students.id, authUser.id),
		});

		event.context.student = student ?? null;

		// A student auth user with no DB row means registration
		// was not fully completed. Reject so the frontend can retry.
		if (!student) {
			return handleError(
				event,
				new UnauthorizedError(
					'Student profile not found — please complete registration',
				),
			);
		}
	} else {
		event.context.student = null;
	}

	return;
});
