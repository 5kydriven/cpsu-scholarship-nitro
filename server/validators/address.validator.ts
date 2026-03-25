import z from 'zod';

export const createAddressSchema = z.object({
	studentId: z.string().optional(),
	personnelId: z.string().optional(),
	street: z.string().min(1).max(100),
	barangay: z.string().min(1).max(100),
	city: z.string().min(1).max(100),
	province: z.string().min(1).max(100),
	zipcode: z.coerce.string().min(1).max(100),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
