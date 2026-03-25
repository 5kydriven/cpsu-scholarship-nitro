import z from 'zod';

export const registerUserSchema = z.object({
	email: z.email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterUserSchema = z.infer<typeof registerUserSchema>;
