import z from 'zod';
import { searchSchema } from './shared.validator';

export const createNominationSchema = z.object({
	studentId: z.uuid('Invalid student id'),
	offeringId: z.uuid('Invalid scholarship offering id'),
	remarks: z.string().trim().max(500).optional(),
});

export const nominationQuerySchema = searchSchema.extend({
	offeringId: z.uuid('Invalid scholarship offering id').optional(),
	status: z.enum(['pending', 'completed', 'cancelled']).optional(),
});

export type CreateNominationInput = z.infer<typeof createNominationSchema>;
export type NominationQuery = z.infer<typeof nominationQuerySchema>;
