import { eq } from 'drizzle-orm';
import { db, students } from '../db';
import { supabaseAdmin } from '../lib/supabase';
import { ConflictError, InternalError, NotFoundError } from '../utils/errors';
import type { RegisterStudentInput } from '../validators/application.validator';

// ─────────────────────────────────────────────
// student.service.ts
//
// Owns all business logic for student accounts.
//
// ATOMICITY NOTE — register():
//   Supabase Auth and Postgres are separate systems.
//   There is no distributed transaction across them.
//   Strategy:
//     1. Insert the students row first (can be rolled back)
//     2. Create the Supabase auth user second
//     3. If step 2 fails, delete the students row manually
//   This keeps the auth user as the trailing, not leading,
//   side of the operation — avoiding orphaned auth users
//   with no matching DB row.
//
//   If step 3 (the rollback delete) also fails, we log the
//   orphaned student ID so it can be cleaned up manually.
//   This is acceptable for a 1-2 dev team and far safer
//   than the reverse order.
// ─────────────────────────────────────────────

export const studentService = {
	// ── Register ─────────────────────────────
	async register(input: RegisterStudentInput) {
		const { email, password, ...profile } = input;

		// 1. Check for duplicate studentId before touching auth
		const existing = await db.query.students.findFirst({
			where: eq(students.studentId, profile.studentId),
		});

		if (existing) {
			throw new ConflictError(
				`Student ID "${profile.studentId}" is already registered`,
			);
		}

		// 2. Create Supabase auth user (no DB row yet)
		const { data: authData, error: authError } =
			await supabaseAdmin.auth.admin.createUser({
				email,
				password,
				email_confirm: true, // skip email confirmation for school-issued accounts
				user_metadata: {
					role: 'student',
				},
			});

		if (authError || !authData.user) {
			// Supabase returns 422 for duplicate emails
			if (authError?.message?.toLowerCase().includes('already')) {
				throw new ConflictError('An account with this email already exists');
			}
			throw new InternalError(
				`Failed to create auth user: ${authError?.message ?? 'unknown error'}`,
			);
		}

		const authUserId = authData.user.id;

		// 3. Insert students row — if this fails, roll back the auth user
		try {
			const [student] = await db
				.insert(students)
				.values({
					id: authUserId, // FK → auth.users.id
					studentId: profile.studentId,
					lastName: profile.lastName,
					givenName: profile.givenName,
					middleName: profile.middleName ?? null,
					extName: profile.extName ?? null,
					sex: profile.sex,
					birthdate: profile.birthdate,
					contactNumber: profile.contactNumber ?? null,
					email,
				})
				.returning();

			return student;
		} catch (dbError) {
			// Rollback: delete the auth user so it doesn't become an orphan
			console.error(
				`[student.service] DB insert failed for auth user ${authUserId} — rolling back auth user`,
				dbError,
			);

			const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
				authUserId,
			);

			if (deleteError) {
				// Both the insert AND the rollback failed.
				// Log the orphaned auth user ID for manual cleanup.
				console.error(
					`[student.service] ORPHANED AUTH USER — manual cleanup required: ${authUserId}`,
					deleteError,
				);
			}

			throw new InternalError(
				'Registration failed — please try again or contact support',
			);
		}
	},

	// ── Get by ID ────────────────────────────
	async getById(id: string) {
		const student = await db.query.students.findFirst({
			where: eq(students.id, id),
		});

		if (!student) throw new NotFoundError('Student');
		return student;
	},
};
