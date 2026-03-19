import { z } from 'zod';
import { searchSchema } from './shared.validator';

// ─────────────────────────────────────────────
// Student registration
// ─────────────────────────────────────────────

export const registerStudentSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	studentId: z
		.string()
		.min(1, 'Student ID is required')
		.regex(/^\d{4}-\d{5}$/, 'Student ID must be in the format YYYY-NNNNN'),
	lastName: z.string().min(1, 'Last name is required').max(100),
	givenName: z.string().min(1, 'Given name is required').max(100),
	middleName: z.string().max(100).optional(),
	extName: z.string().max(20).optional(),
	sex: z.enum(['male', 'female']),
	birthdate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be YYYY-MM-DD'),
	contactNumber: z
		.string()
		.regex(
			/^09\d{9}$/,
			'Contact number must be a valid PH mobile number (09XXXXXXXXX)',
		)
		.optional(),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;

// ─────────────────────────────────────────────
// Application submission
//
// ⚠️  Address fields match the REAL application_addresses
//     schema: street (nullable), barangay, zipcode (nullable).
//     municipality and region are NOT columns in the DB —
//     do not add them here without a migration first.
// ─────────────────────────────────────────────

const addressSchema = z.object({
	street: z.string().max(200).optional(),
	barangay: z.string().min(1, 'Barangay is required').max(100),
	zipcode: z.string().max(10).optional(),
});

const parentSchema = z.object({
	type: z.enum(['father', 'mother']),
	lastName: z.string().max(100).optional(),
	givenName: z.string().max(100).optional(),
	middleName: z.string().max(100).optional(),
});

export const submitApplicationSchema = z.object({
	programName: z.string().min(1, 'Program name is required').max(200),
	yearLevel: z.number().int().min(1).max(6),
	hasDisability: z.boolean().default(false),
	hasIpGroup: z.boolean().default(false),
	address: addressSchema,
	parents: z
		.array(parentSchema)
		.min(1, 'At least one parent/guardian is required')
		.max(2),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

// ─────────────────────────────────────────────
// Admin — application list query
// ─────────────────────────────────────────────

export const applicationQuerySchema = searchSchema.extend({
	status: z.enum(['pending', 'approved', 'rejected']).optional(),
	sortBy: z
		.enum(['createdAt', 'lastName', 'programName', 'yearLevel'])
		.default('createdAt'),
});

export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;

// ─────────────────────────────────────────────
// Admin — approve / reject
// ─────────────────────────────────────────────

export const updateApplicationStatusSchema = z
	.object({
		status: z.enum(['approved', 'rejected']),
		awardNo: z.string().max(50).optional(),
		appNo: z.string().max(50).optional(),
		batch: z.string().max(50).optional(),
		reason: z.string().max(500).optional(),
	})
	.refine(
		(data) => {
			if (data.status === 'approved') {
				return !!data.awardNo && !!data.appNo && !!data.batch;
			}
			return true;
		},
		{
			message: 'awardNo, appNo, and batch are required when approving',
			path: ['awardNo'],
		},
	);

export type UpdateApplicationStatusInput = z.infer<
	typeof updateApplicationStatusSchema
>;

// ─────────────────────────────────────────────
// Scholar management queries
//
// ⚠️  uploads table uses academicYear + semester,
//     NOT a single "batch" string.
// ─────────────────────────────────────────────

export const scholarQuerySchema = searchSchema.extend({
	programId: z.coerce.number().int().positive().optional(),
	academicYear: z.string().optional(),
	semester: z.string().optional(),
	province: z.string().optional(),
	yearLevel: z.coerce.number().int().min(1).max(6).optional(),
	sortBy: z
		.enum(['createdAt', 'lastName', 'scholarIdentifier', 'province'])
		.default('createdAt'),
});

export type ScholarQuery = z.infer<typeof scholarQuerySchema>;

// ─────────────────────────────────────────────
// CSV import upload metadata
// Matches uploads schema: academicYear + semester
// ─────────────────────────────────────────────

export const importUploadSchema = z.object({
	programId: z.coerce
		.number()
		.int()
		.positive('programId must be a positive integer'),
	academicYear: z
		.string()
		.min(1, 'academicYear is required')
		.regex(/^\d{4}-\d{4}$/, 'academicYear must be YYYY-YYYY (e.g. 2024-2025)'),
	semester: z.enum(['1', '2', 'summer']),
});

export type ImportUploadInput = z.infer<typeof importUploadSchema>;
