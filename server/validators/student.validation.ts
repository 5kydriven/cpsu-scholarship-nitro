import z from 'zod';

export const registerStudentSchema = z.object({
	email: z.email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	firstName: z.string().min(1, 'First name is required').max(100),
	lastName: z.string().min(1, 'Last name is required').max(100),
	middleName: z.string().max(100).optional(),
	extName: z.string().max(20).optional(),
	contactNumber: z
		.string()
		.regex(
			/^09\d{9}$/,
			'Contact number must be a valid PH mobile number (09XXXXXXXXX)',
		),
	sex: z.enum(['male', 'female']),
	yearLevel: z.number().int().min(1).max(6),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
