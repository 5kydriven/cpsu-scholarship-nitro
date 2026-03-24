import z from 'zod';
import { createAddressSchema } from './address.validator';
import { createParentSchema } from './parent.validator';

export const createStudentSchema = z.object({
	firstName: z.string().min(1, 'First name is required').max(100),
	lastName: z.string().min(1, 'Last name is required').max(100),
	middleName: z.string().max(100).optional(),
	extName: z.string().max(20).optional(),
	birthdate: z.string().min(1, 'Birthdate is required').max(100),
	contactNumber: z
		.string()
		.regex(/^09\d{9}$/, 'Invalid PH mobile number')
		.transform((v) => v.replace(/^0/, '+63')),
	sex: z.enum(['male', 'female']),
	yearLevel: z.coerce.number().int().min(1).max(6),
	address: createAddressSchema,
	parents: z
		.array(createParentSchema)
		.min(1, 'At least one parent is required')
		.refine(
			(parents) => new Set(parents.map((p) => p.type)).size === parents.length,
			'Duplicate parent type',
		),
});

export type CreateStudentSchema = z.infer<typeof createStudentSchema>;
