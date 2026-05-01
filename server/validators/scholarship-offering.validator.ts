import z from 'zod';

const amountSchema = z.coerce
	.number()
	.positive('allocatedBudget must be greater than 0')
	.max(999999999999.99, 'allocatedBudget is too large')
	.transform((value) => value.toFixed(2));

const dateSchema = z
	.string()
	.refine((value) => !Number.isNaN(Date.parse(value)), {
		message: 'Invalid date',
	});

const scholarshipOfferingFields = z.object({
	programId: z.uuid('Invalid scholarship program id'),
	academicYear: z
		.string()
		.trim()
		.min(1, 'academicYear is required')
		.regex(/^\d{4}-\d{4}$/, 'academicYear must be YYYY-YYYY'),
	semester: z.enum(['1', '2']),
	allocatedBudget: amountSchema,
	availableSlots: z.coerce
		.number()
		.int()
		.positive('availableSlots must be greater than 0'),
	applicationStartAt: dateSchema.nullable().optional(),
	applicationEndAt: dateSchema.nullable().optional(),
	status: z.enum(['draft', 'open', 'closed', 'archived']).default('draft'),
});

function endDateAfterStartDate(data: {
	applicationStartAt?: string | null;
	applicationEndAt?: string | null;
}) {
	if (!data.applicationStartAt || !data.applicationEndAt) return true;

	return Date.parse(data.applicationEndAt) > Date.parse(data.applicationStartAt);
}

export const createScholarshipOfferingSchema = scholarshipOfferingFields.refine(
	endDateAfterStartDate,
	{
		message: 'applicationEndAt must be after applicationStartAt',
		path: ['applicationEndAt'],
	},
);

export const updateScholarshipOfferingSchema = scholarshipOfferingFields
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field is required',
	})
	.refine(endDateAfterStartDate, {
		message: 'applicationEndAt must be after applicationStartAt',
		path: ['applicationEndAt'],
	});

export type CreateScholarshipOfferingSchema = z.infer<
	typeof createScholarshipOfferingSchema
>;
export type UpdateScholarshipOfferingSchema = z.infer<
	typeof updateScholarshipOfferingSchema
>;
