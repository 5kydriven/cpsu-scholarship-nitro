import z from 'zod';

const studentAddress = z.object({
	studentId: z.string(),
	personnelId: z.undefined().optional(),
});

const personnelAddress = z.object({
	personnelId: z.string(),
	studentId: z.undefined().optional(),
});

export const createAddressSchema = z.intersection(
	z.union([studentAddress, personnelAddress]),
	z.object({
		street: z.string().min(1).max(100),
		barangay: z.string().min(1).max(100),
		city: z.string().min(1).max(100),
		province: z.string().min(1).max(100),
		zipcode: z.string().min(1).max(100),
	}),
);

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
