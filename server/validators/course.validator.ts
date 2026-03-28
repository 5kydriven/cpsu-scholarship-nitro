import z from 'zod';

export const createCourseSchema = z.object({
	name: z.string().trim().toLowerCase().min(1).max(100),
	abbreviation: z.string().trim().toLowerCase().min(1).max(20),
	major: z.string().trim().toLowerCase().max(50).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export type CreateCourseSchema = z.infer<typeof createCourseSchema>;
export type UpdateCourseSchema = z.infer<typeof updateCourseSchema>;
