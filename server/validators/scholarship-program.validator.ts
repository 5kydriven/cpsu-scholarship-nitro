import z from 'zod';

const amountSchema = z.coerce
	.number()
	.positive('defaultAmountPerSemester must be greater than 0')
	.max(9999999999.99, 'defaultAmountPerSemester is too large')
	.transform((value) => value.toFixed(2));

const scholarshipProgramFields = z.object({
	code: z.string().optional(),
	name: z.string().trim().min(1).max(200),
	description: z.string().trim().max(1000).nullable().optional(),
	intakeType: z
		.enum(['public_application', 'staff_nomination'])
		.default('public_application'),
	defaultAmountPerSemester: amountSchema,
	isActive: z.boolean().optional(),
});

export const createScholarshipProgramSchema = scholarshipProgramFields;

export const updateScholarshipProgramSchema = scholarshipProgramFields
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field is required',
	});

export type CreateScholarshipProgramSchema = z.infer<
	typeof createScholarshipProgramSchema
>;
export type UpdateScholarshipProgramSchema = z.infer<
	typeof updateScholarshipProgramSchema
>;
