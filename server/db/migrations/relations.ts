import { relations } from "drizzle-orm/relations";
import { programs, uploads, scholars, enrollments, usersInAuth, students, applications, applicationAddresses, applicationDocuments, applicationParents } from "./schema";

export const uploadsRelations = relations(uploads, ({one, many}) => ({
	program: one(programs, {
		fields: [uploads.programId],
		references: [programs.id]
	}),
	enrollments: many(enrollments),
}));

export const programsRelations = relations(programs, ({many}) => ({
	uploads: many(uploads),
	enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({one}) => ({
	scholar: one(scholars, {
		fields: [enrollments.scholarId],
		references: [scholars.id]
	}),
	program: one(programs, {
		fields: [enrollments.programId],
		references: [programs.id]
	}),
	upload: one(uploads, {
		fields: [enrollments.uploadId],
		references: [uploads.id]
	}),
}));

export const scholarsRelations = relations(scholars, ({many}) => ({
	enrollments: many(enrollments),
}));

export const studentsRelations = relations(students, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [students.id],
		references: [usersInAuth.id]
	}),
	applications: many(applications),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	students: many(students),
}));

export const applicationAddressesRelations = relations(applicationAddresses, ({one}) => ({
	application: one(applications, {
		fields: [applicationAddresses.applicationId],
		references: [applications.id]
	}),
}));

export const applicationsRelations = relations(applications, ({one, many}) => ({
	applicationAddresses: many(applicationAddresses),
	applicationDocuments: many(applicationDocuments),
	applicationParents: many(applicationParents),
	student: one(students, {
		fields: [applications.studentId],
		references: [students.id]
	}),
}));

export const applicationDocumentsRelations = relations(applicationDocuments, ({one}) => ({
	application: one(applications, {
		fields: [applicationDocuments.applicationId],
		references: [applications.id]
	}),
}));

export const applicationParentsRelations = relations(applicationParents, ({one}) => ({
	application: one(applications, {
		fields: [applicationParents.applicationId],
		references: [applications.id]
	}),
}));