import z from 'zod';
import { registerUserSchema } from './auth.validator';
import { searchSchema } from './shared.validator';

export const createPersonnelSchema = registerUserSchema.safeExtend({
	role: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	middleName: z.string().optional(),
	extName: z.string().optional(),
	sex: z.enum(['male', 'female']),
	birthdate: z.string().optional(),
	contactNumber: z
		.string()
		.regex(/^09\d{9}$/, 'Invalid PH mobile number')
		.transform((v) => v.replace(/^0/, '+63'))
		.optional(),
	position: z.string().optional(),
	department: z.string().optional(),
});

export const personnelQuerySchema = searchSchema.safeExtend({
	sortBy: z.enum(['lastName', 'firstName']).default('lastName'),
});

export type CreatePersonnelSchema = z.infer<typeof createPersonnelSchema>;
