import { defineHandler } from 'nitro';
import { eq } from 'drizzle-orm';
import { supabase } from '../lib/supabase';
import { db, students } from '../db';
import { UnauthorizedError } from '../utils/errors';
import { handleError } from '../utils/response';
import type { AppRole } from '../types/h3';

// ─────────────────────────────────────────────
// 02.auth.ts
//
// Runs second on every request.
// Verifies the Supabase JWT, loads the student
// row (if the user is a student), and attaches
// both to event.context for use in route handlers.
//
// Routes in PUBLIC_ROUTES skip all auth checks.
// ─────────────────────────────────────────────

// Routes that skip JWT verification entirely.
// Webhook paths do their own signature verification internally.
// Add new public routes here — never bypass auth in route handlers.
const PUBLIC_ROUTES: string[] = ['/api/health'];

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
	// Supabase validates the signature and expiry.
	// No manual jwt.verify() needed.
	const { data, error } = await supabase.auth.getUser(token);

	if (error || !data.user) {
		return handleError(
			event,
			new UnauthorizedError('Invalid or expired token'),
		);
	}

	const authUser = data.user;

	// ── Resolve application role ──────────────
	// Roles are stored in Supabase auth.users.user_metadata.role.
	// Set this when creating admin users via supabaseAdmin.auth.admin.createUser()
	// or via the Supabase dashboard.
	//
	// Students: user_metadata.role is absent or 'student'
	// Admins:   user_metadata.role === 'admin'
	//
	// Future roles (staff, etc.) only require adding to the AppRole union
	// in server/types/h3.d.ts — no middleware changes needed.
	const rawRole = authUser.user_metadata?.role as string | undefined;
	const role: AppRole = rawRole === 'admin' ? 'admin' : 'student';

	// ── Attach auth user + role ───────────────
	event.context.user = authUser;
	event.context.role = role;

	// ── Load student row ──────────────────────
	// Admins do not have a row in the students table.
	// student will be null for admin users — that is intentional.
	// Services that need student data should guard with:
	//   if (!event.context.student) throw new UnauthorizedError()
	const student = await db.query.students.findFirst({
		where: eq(students.id, authUser.id),
	});

	event.context.student = student ?? null;

	// ── Student profile guard ─────────────────
	// A student auth user with no matching students row means
	// registration was not completed (auth created but DB insert failed).
	// Reject the request so the frontend can prompt re-registration.
	if (role === 'student' && !student) {
		return handleError(
			event,
			new UnauthorizedError(
				'Student profile not found — please complete registration',
			),
		);
	}
});
