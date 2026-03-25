import { relations } from 'drizzle-orm';
import { addresses } from './addresses';
import { students } from './students';
import { personnels } from './personnels';
import { studentParents } from './student-parents';

export const studentsRelations = relations(students, ({ one, many }) => ({
	address: one(addresses, {
		fields: [students.id],
		references: [addresses.studentId],
	}),
	parents: many(studentParents),
}));

export const personnelRelations = relations(personnels, ({ one }) => ({
	address: one(addresses, {
		fields: [personnels.id],
		references: [addresses.personnelId],
	}),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
	student: one(students, {
		fields: [addresses.studentId],
		references: [students.id],
	}),
	personnels: one(personnels, {
		fields: [addresses.personnelId],
		references: [personnels.id],
	}),
}));

export const studentParentsRelations = relations(studentParents, ({ one }) => ({
	student: one(students, {
		fields: [studentParents.studentId],
		references: [students.id],
	}),
}));
