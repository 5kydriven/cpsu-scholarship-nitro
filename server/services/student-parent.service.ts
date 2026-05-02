import { eq } from 'drizzle-orm';
import { db, studentParents, type NewStudentParent } from '../db';
import type { CreateParentInput } from '#server/validators/parent.validator.ts';

export const studentParentService = {
	async create(parent: NewStudentParent) {
		return await db.insert(studentParents).values(parent).returning();
	},

	async createMany(parents: NewStudentParent[]) {
		return await db.insert(studentParents).values(parents).returning();
	},

	async replaceForStudent(
		studentId: string,
		parents: CreateParentInput[],
		executor: typeof db | any = db,
	) {
		await executor.delete(studentParents).where(eq(studentParents.studentId, studentId));

		const rows = parents.map(
			(parent) =>
				({
					studentId,
					type: parent.type,
					firstName: parent.firstName,
					lastName: parent.lastName,
					middleName: parent.middleName,
					extName: parent.extName,
					occupation: parent.occupation,
					monthlyIncome: parent.monthlyIncome,
					status: parent.status,
					contactNumber: parent.contactNumber,
					email: parent.email,
				}) satisfies NewStudentParent,
		);

		return await executor.insert(studentParents).values(rows).returning();
	},
};
