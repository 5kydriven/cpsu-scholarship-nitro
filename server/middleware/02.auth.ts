import { defineHandler } from 'nitro';
import { eq } from 'drizzle-orm';
import { createUserClient } from '../lib/supabase';
import { db, students } from '../db';
import { UnauthorizedError } from '../utils/errors';
import { handleError } from '../utils/response';
import { isDev } from '../utils/env';
import type { AppRole } from '../types/h3';
import { getCookie, setCookie } from 'h3';
import type { User } from '@supabase/supabase-js';

const PUBLIC_ROUTES: string[] = ['/api/auth/register', '/api/auth/login'];

export default defineHandler(async (event) => {
	const url = new URL(event.req.url);
	const path = url.pathname;
	const isPublic = PUBLIC_ROUTES.some((route) => path.startsWith(route));

	if (isPublic || path === '/') return;

	const access = getCookie(event, 'sb-access-token');
	const refresh = getCookie(event, 'sb-refresh-token');

	let supabase = createUserClient(access);

	const { data, error } = await supabase.auth.getUser();

	// 🔥 access token expired → refresh automatically
	if (error && refresh) {
		const refreshClient = createUserClient();

		const { data: refreshData, error: refreshError } =
			await refreshClient.auth.refreshSession({
				refresh_token: refresh,
			});

		if (!refreshError) {
			const newAccess = refreshData.session?.access_token ?? '';
			const newRefresh = refreshData.session?.refresh_token ?? '';

			setCookie(event, 'sb-access-token', newAccess, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/',
			});

			setCookie(event, 'sb-refresh-token', newRefresh, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/',
			});

			supabase = createUserClient(newAccess);

			const { data: retryUser } = await supabase.auth.getUser();

			event.context.user = retryUser.user as User;
			return;
		}
	}

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
