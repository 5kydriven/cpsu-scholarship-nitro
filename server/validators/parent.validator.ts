import z from 'zod';

export const createParentSchema = z.object({
	type: z.enum(['father', 'mother', 'guardian']),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	middleName: z.string().optional(),
	contactNumber: z
		.string()
		.regex(/^09\d{9}$/)
		.transform((v) => v.replace(/^0/, '+63'))
		.optional(),
});

export type CreateParentInput = z.infer<typeof createParentSchema>;
