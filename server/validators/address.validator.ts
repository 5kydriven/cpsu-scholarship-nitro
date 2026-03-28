import z from 'zod';

export const createAddressSchema = z.object({
	studentId: z.string().trim().toLowerCase().optional(),
	personnelId: z.string().trim().toLowerCase().optional(),
	street: z.string().trim().toLowerCase().min(1).max(100),
	barangay: z.string().trim().toLowerCase().min(1).max(100),
	city: z.string().trim().toLowerCase().min(1).max(100),
	province: z.string().trim().toLowerCase().min(1).max(100),
	zipcode: z.coerce.string().trim().toLowerCase().min(1).max(100),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
