import z from 'zod';
import { registerUserSchema } from './auth.validator';
import { searchSchema } from './shared.validator';

export const createPersonnelSchema = registerUserSchema.safeExtend({
	role: z.string().trim().toLowerCase(),
	firstName: z.string().trim().toLowerCase(),
	lastName: z.string().trim().toLowerCase(),
	middleName: z.string().trim().toLowerCase().optional(),
	extName: z.string().trim().toLowerCase().optional(),
	sex: z.enum(['male', 'female']),
	birthdate: z.string().optional(),
	contactNumber: z
		.string()
		.regex(/^09\d{9}$/, 'Invalid PH mobile number')
		.transform((v) => v.replace(/^0/, '+63'))
		.optional(),
	position: z.string().trim().toLowerCase().optional(),
	department: z.string().trim().toLowerCase().optional(),
});

export const personnelQuerySchema = searchSchema.safeExtend({
	sortBy: z.enum(['lastName', 'firstName']).default('lastName'),
});

export type CreatePersonnelSchema = z.infer<typeof createPersonnelSchema>;
