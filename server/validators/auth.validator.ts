import z from 'zod';

export const registerUserSchema = z.object({
	email: z.email('Invalid email address'),
	password: z.string().trim().min(8, 'Password must be at least 8 characters'),
});

export const studentIdSchema = z
	.string()
	.trim()
	.min(1, 'Student ID is required')
	.max(100);

export const registerStudentSchema = registerUserSchema.extend({
	studentId: studentIdSchema,
});

export const loginSchema = z.union([
	z.object({
		email: z.email('Invalid email address'),
		password: z.string().trim().min(1, 'Password is required'),
	}),
	z.object({
		studentId: studentIdSchema,
		password: z.string().trim().min(1, 'Password is required'),
	}),
]);

export const studentIdCheckSchema = z.object({
	studentId: studentIdSchema,
});

export type RegisterUserSchema = z.infer<typeof registerUserSchema>;
export type RegisterStudentSchema = z.infer<typeof registerStudentSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type StudentIdCheckSchema = z.infer<typeof studentIdCheckSchema>;
