import z from 'zod';
import { studentIdSchema } from './auth.validator';

export const updateStudentIdRosterSchema = z
	.object({
		studentId: studentIdSchema.optional(),
		fullName: z.string().trim().min(1, 'Name is required').max(200).optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: 'At least one field is required',
	});

export const batchDeleteStudentIdRosterSchema = z
	.object({
		ids: z.array(z.uuid('Invalid roster id')).min(1).optional(),
		studentIds: z.array(studentIdSchema).min(1).optional(),
	})
	.refine((value) => Boolean(value.ids?.length || value.studentIds?.length), {
		message: 'ids or studentIds is required',
	});

export type UpdateStudentIdRosterInput = z.infer<
	typeof updateStudentIdRosterSchema
>;
export type BatchDeleteStudentIdRosterInput = z.infer<
	typeof batchDeleteStudentIdRosterSchema
>;
