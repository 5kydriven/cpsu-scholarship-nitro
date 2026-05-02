import { z } from 'zod';
import {
	isMultipartDocumentFile,
	type MultipartDocumentFile,
} from '#server/utils/multipart-form.ts';
import { searchSchema } from './shared.validator';
import { createStudentSchema } from './student.validation';

const applicationProfileSchema = createStudentSchema.omit({ studentId: true });

const submitApplicationDocumentSchema = z.object({
	type: z
	.string()
		.trim()
		.min(1)
		.max(100)
		.regex(/^[a-z0-9_]+$/, 'Document type must be snake_case'),
	file: z.custom<MultipartDocumentFile>(isMultipartDocumentFile, {
		message: 'Document file is required',
	}),
});

export const submitApplicationSchema = z.object({
	studentId: z.string().trim().min(1, 'Student ID is required').max(100),
	offeringId: z.uuid('Invalid scholarship offering id'),
	profile: applicationProfileSchema,
	extraAnswers: z.record(z.string(), z.unknown()).default({}),
	documents: z
		.array(submitApplicationDocumentSchema)
		.min(1, 'At least one document is required'),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

export const applicationQuerySchema = searchSchema.extend({
	status: z
		.enum(['pending', 'under_review', 'approved', 'rejected', 'cancelled'])
		.optional(),
	offeringId: z.uuid('Invalid scholarship offering id').optional(),
	sortBy: z.enum(['createdAt', 'lastName']).default('createdAt'),
});

export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;

export const updateApplicationStatusSchema = z
	.object({
		status: z.enum(['approved', 'rejected']),
		reason: z.string().trim().max(500).optional(),
	})
	.refine((data) => data.status === 'approved' || !!data.reason, {
		message: 'reason is required when rejecting',
		path: ['reason'],
	});

export type UpdateApplicationStatusInput = z.infer<
	typeof updateApplicationStatusSchema
>;

export const scholarQuerySchema = searchSchema.extend({
	offeringId: z.uuid('Invalid scholarship offering id').optional(),
	programId: z.uuid('Invalid scholarship program id').optional(),
	academicYear: z.string().optional(),
	semester: z.enum(['1', '2']).optional(),
	status: z.enum(['active', 'inactive', 'completed', 'revoked']).optional(),
	sortBy: z.enum(['createdAt', 'lastName', 'scholarNo']).default('createdAt'),
});

export type ScholarQuery = z.infer<typeof scholarQuerySchema>;
