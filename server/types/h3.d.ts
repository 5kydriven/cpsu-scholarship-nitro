import type { User } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// AppRole
//
// The canonical set of roles in the system.
// Stored in Supabase auth.users.user_metadata.role.
//
// Current roles:
//   'admin'   — full system access; no students row in the DB
//   'student' — registered applicant; has a row in the students table
//
// Future roles (planned):
//   'staff'   — read + limited write; no students row
//
// To add a new role:
//   1. Extend this union below                  ← one line change
//   2. Set user_metadata.role on the new auth   ← done via supabaseAdmin
//      user in Supabase at user creation
//   3. Update admin-guard.ts ALLOWED_ROLES if
//      the role needs /api/admin/** access
//   No other files require changes.
// ─────────────────────────────────────────────────────────────────────────────
export type AppRole = 'admin' | 'student' | 'staff';

// ─────────────────────────────────────────────────────────────────────────────
// AppStudent
//
// Typed snapshot of the students table row.
// Defined inline here (not imported from db/schema) to avoid a circular
// dependency between the types file and the db/schema barrel, and to keep
// the declaration file self-contained.
//
// Keep in sync with server/db/migrations/schema.ts → students table.
// When adding a column to students, add the field here too.
// ─────────────────────────────────────────────────────────────────────────────
export interface AppStudent {
	/** UUID — same as auth.users.id (students_auth_fk) */
	id: string;

	/** School-issued student ID, e.g. "2021-00123" */
	studentId: string;

	lastName: string;
	givenName: string;
	middleName: string | null;
	extName: string | null;

	/** 'male' | 'female' — constrained at DB level */
	sex: string | null;

	/** ISO date string, e.g. "2003-04-15" */
	birthdate: string | null;

	contactNumber: string | null;
	email: string | null;

	/** ISO timestamp string */
	createdAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// H3EventContext augmentation
//
// Extends Nitro/H3's request context with CPSU Scholarship-specific fields.
// All fields are attached by server/middleware/02.auth.ts on every
// protected request before any route handler runs.
//
// Usage in route handlers:
//   const { user, role, student } = event.context;
//
// Services should NOT import H3EventContext. Pass only the typed values
// they need as function arguments — keeps services testable without HTTP.
// ─────────────────────────────────────────────────────────────────────────────
declare module 'h3' {
	interface H3EventContext {
		// ── Set by 02.auth.ts ──────────────────────────────────────────────

		/**
		 * The verified Supabase auth user.
		 *
		 * Always present on protected routes.
		 * Not present on PUBLIC_ROUTES (e.g. /api/health).
		 *
		 * - user.id       → links to students.id (students_auth_fk)
		 * - user.email    → use for logging and notification emails
		 * - user.user_metadata.role → raw role string; prefer event.context.role
		 */
		user: User;

		/**
		 * The resolved application role.
		 *
		 * Derived from auth.users.user_metadata.role by 02.auth.ts.
		 * Always use this in guards — never read user_metadata directly.
		 *
		 *   'admin'   → admin; event.context.student === null
		 *   'student' → registered student; event.context.student is set
		 *   'staff'   → staff (future); event.context.student === null
		 */
		role: AppRole;

		/**
		 * The row from the students table for the authenticated user.
		 *
		 * Present when role === 'student'.
		 * null when role === 'admin' or 'staff' — those users have no students row.
		 *
		 * The students table is directly FK-linked to auth.users via
		 * students_auth_fk. There is no separate profiles table in this project.
		 *
		 * Standard guard pattern in student-only route handlers:
		 *
		 *   const student = requireStudent(event.context); // throws if not student
		 *   // student is AppStudent here — TypeScript narrows correctly
		 */
		student: AppStudent | null;

		/**
		 * Route path params parsed from the URL pattern by Nitro.
		 * e.g. /api/students/[id] → params.id
		 *
		 * Typed as Record<string, string> — always validate with Zod before use.
		 */
		params: Record<string, string>;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Role guard helpers
//
// Import these in route handlers for typed, throw-on-fail role checks.
// They produce narrow types so TypeScript knows student is non-null after
// requireStudent(), removing the need for manual null checks everywhere.
//
// These helpers throw AppError subclasses, so handleError() in the route
// handler's catch block will translate them to the correct HTTP status.
// ─────────────────────────────────────────────────────────────────────────────

import type { H3EventContext } from 'h3';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Asserts the request is from a student with a valid DB row.
 * Returns the narrowed AppStudent (guaranteed non-null).
 * Throws UnauthorizedError (401) otherwise.
 *
 * @example
 *   export default defineHandler(async (event) => {
 *     try {
 *       const student = requireStudent(event.context);
 *       const apps = await applicationService.getByStudent(student.id);
 *       return successResponse(apps);
 *     } catch (err) {
 *       return handleError(event, err);
 *     }
 *   });
 */
export function requireStudent(ctx: H3EventContext): AppStudent {
	if (ctx.role !== 'student' || !ctx.student) {
		throw new UnauthorizedError('Student access required');
	}
	return ctx.student;
}

/**
 * Asserts the request is from an admin.
 * Throws ForbiddenError (403) otherwise.
 *
 * Note: /api/admin/** is already protected by admin-guard.ts middleware.
 * Use this helper only in shared routes that need to branch by role,
 * not as a replacement for the route-scoped middleware.
 *
 * @example
 *   requireAdmin(event.context);
 *   // only admins reach this line
 */
export function requireAdmin(ctx: H3EventContext): void {
	if (ctx.role !== 'admin') {
		throw new ForbiddenError('Admin access required');
	}
}

/**
 * Asserts the request is from a staff member or admin.
 * Throws ForbiddenError (403) otherwise.
 *
 * Useful for routes accessible by both roles (planned for Phase 6+).
 *
 * @example
 *   requireStaffOrAdmin(event.context);
 */
export function requireStaffOrAdmin(ctx: H3EventContext): void {
	if (ctx.role !== 'staff' && ctx.role !== 'admin') {
		throw new ForbiddenError('Staff or admin access required');
	}
}

/**
 * Type predicate — narrows context to one where student is non-null.
 * Use when you need to branch without throwing.
 *
 * @example
 *   if (isStudentContext(event.context)) {
 *     // event.context.student is AppStudent here — safe to use
 *   } else {
 *     // admin or staff — student is null
 *   }
 */
export function isStudentContext(
	ctx: H3EventContext,
): ctx is H3EventContext & { student: AppStudent } {
	return ctx.role === 'student' && ctx.student !== null;
}
