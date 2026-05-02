import z from 'zod';
import { searchSchema } from './shared.validator';

export const generatePayoutsSchema = z.object({
	offeringId: z.uuid('Invalid scholarship offering id'),
});

export const releasePayoutSchema = z.object({
	remarks: z.string().trim().max(500).optional(),
});

export const confirmPayoutReceiptSchema = z.object({
	checkNumber: z.string().trim().min(1).max(100),
});

export const payoutQuerySchema = searchSchema.extend({
	offeringId: z.uuid('Invalid scholarship offering id').optional(),
	studentId: z
		.string()
		.trim()
		.min(1, 'Student ID is required')
		.max(100)
		.optional(),
	status: z.enum(['pending', 'released', 'received', 'cancelled']).optional(),
});

export type GeneratePayoutsInput = z.infer<typeof generatePayoutsSchema>;
export type ReleasePayoutInput = z.infer<typeof releasePayoutSchema>;
export type ConfirmPayoutReceiptInput = z.infer<
	typeof confirmPayoutReceiptSchema
>;
export type PayoutQuery = z.infer<typeof payoutQuerySchema>;
