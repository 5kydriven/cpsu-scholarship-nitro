import z from 'zod';

const parentSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	middleName: z.string().optional(),
	extName: z.string().optional(),
	occupation: z.string().optional(),
	monthlyIncome: z.string().optional(),
	contactNumber: z.string().optional(),
});

const optionalParentSchema = parentSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Parent details cannot be empty',
	});

export const createParentSchema = z
	.object({
		father: optionalParentSchema.optional(),
		mother: optionalParentSchema.optional(),
		guardian: optionalParentSchema.optional(),
	})
	.refine((data) => data.father || data.mother || data.guardian, {
		message: 'At least one parent is required',
		path: ['father'],
	});

export type CreateParentInput = z.infer<typeof createParentSchema>;
