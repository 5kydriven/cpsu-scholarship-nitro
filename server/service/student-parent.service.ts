import { db, studentParents, type NewStudentParent } from '../db';

export const studentParentService = {
	async create(parent: NewStudentParent) {
		return await db.insert(studentParents).values(parent).returning();
	},

	async createMany(parents: NewStudentParent[]) {
		return await db.insert(studentParents).values(parents).returning();
	},
};
