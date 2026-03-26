import z from 'zod';

export const createParentSchema = z.object({
	type: z.enum(['father', 'mother', 'guardian']),
	firstName: z.string().trim().toLowerCase().min(1).max(100),
	lastName: z.string().trim().toLowerCase().min(1).max(100),
	middleName: z.string().trim().toLowerCase().max(100).optional(),
	contactNumber: z
		.string()
		.regex(/^09\d{9}$/)
		.transform((v) => v.replace(/^0/, '+63'))
		.optional(),
});

export type CreateParentInput = z.infer<typeof createParentSchema>;
