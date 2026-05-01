import { relations } from 'drizzle-orm';
import { addresses } from './addresses';
import { students } from './students';
import { personnels } from './personnels';
import { studentParents } from './student_parents';
import { courses } from './courses';
import { applicationStatusHistory } from './application_status_history';
import { applications } from './applications';
import { documents } from './documents';
import { payouts } from './payouts';
import { scholars } from './scholars';
import { scholarshipOfferings } from './scholarship_offerings';
import { scholarshipPrograms } from './scholarship_programs';
import { scholarshipNominations } from './scholarship_nominations';

export const studentsRelations = relations(students, ({ one, many }) => ({
	address: one(addresses, {
		fields: [students.id],
		references: [addresses.studentId],
	}),
	parents: many(studentParents),
	course: one(courses, {
		fields: [students.courseId],
		references: [courses.id],
	}),
	applications: many(applications),
	scholars: many(scholars),
	nominations: many(scholarshipNominations),
}));

export const personnelRelations = relations(personnels, ({ one, many }) => ({
	address: one(addresses, {
		fields: [personnels.id],
		references: [addresses.personnelId],
	}),
	reviewedApplications: many(applications, {
		relationName: 'applicationReviewer',
	}),
	approvedApplications: many(applications, {
		relationName: 'applicationApprover',
	}),
	processedPayouts: many(payouts),
	createdNominations: many(scholarshipNominations),
	statusChanges: many(applicationStatusHistory),
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

export const coursesRelations = relations(courses, ({ many }) => ({
	students: many(students),
}));

export const scholarshipProgramsRelations = relations(
	scholarshipPrograms,
	({ many }) => ({
		offerings: many(scholarshipOfferings),
	}),
);

export const scholarshipOfferingsRelations = relations(
	scholarshipOfferings,
	({ one, many }) => ({
		program: one(scholarshipPrograms, {
			fields: [scholarshipOfferings.programId],
			references: [scholarshipPrograms.id],
		}),
		applications: many(applications),
		scholars: many(scholars),
		nominations: many(scholarshipNominations),
	}),
);

export const applicationsRelations = relations(
	applications,
	({ one, many }) => ({
		student: one(students, {
			fields: [applications.studentId],
			references: [students.id],
		}),
		offering: one(scholarshipOfferings, {
			fields: [applications.offeringId],
			references: [scholarshipOfferings.id],
		}),
		reviewer: one(personnels, {
			fields: [applications.reviewedBy],
			references: [personnels.id],
			relationName: 'applicationReviewer',
		}),
		approver: one(personnels, {
			fields: [applications.approvedBy],
			references: [personnels.id],
			relationName: 'applicationApprover',
		}),
		documents: many(documents),
		statusHistory: many(applicationStatusHistory),
		scholar: one(scholars, {
			fields: [applications.id],
			references: [scholars.applicationId],
		}),
		nomination: one(scholarshipNominations, {
			fields: [applications.id],
			references: [scholarshipNominations.applicationId],
		}),
	}),
);

export const scholarshipNominationsRelations = relations(
	scholarshipNominations,
	({ one }) => ({
		student: one(students, {
			fields: [scholarshipNominations.studentId],
			references: [students.id],
		}),
		offering: one(scholarshipOfferings, {
			fields: [scholarshipNominations.offeringId],
			references: [scholarshipOfferings.id],
		}),
		nominator: one(personnels, {
			fields: [scholarshipNominations.nominatedBy],
			references: [personnels.id],
		}),
		application: one(applications, {
			fields: [scholarshipNominations.applicationId],
			references: [applications.id],
		}),
	}),
);

export const documentsRelations = relations(documents, ({ one }) => ({
	application: one(applications, {
		fields: [documents.applicationId],
		references: [applications.id],
	}),
}));

export const scholarsRelations = relations(scholars, ({ one, many }) => ({
	student: one(students, {
		fields: [scholars.studentId],
		references: [students.id],
	}),
	application: one(applications, {
		fields: [scholars.applicationId],
		references: [applications.id],
	}),
	offering: one(scholarshipOfferings, {
		fields: [scholars.offeringId],
		references: [scholarshipOfferings.id],
	}),
	payouts: many(payouts),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
	scholar: one(scholars, {
		fields: [payouts.scholarId],
		references: [scholars.id],
	}),
	processor: one(personnels, {
		fields: [payouts.processedBy],
		references: [personnels.id],
	}),
}));

export const applicationStatusHistoryRelations = relations(
	applicationStatusHistory,
	({ one }) => ({
		application: one(applications, {
			fields: [applicationStatusHistory.applicationId],
			references: [applications.id],
		}),
		changedByPersonnel: one(personnels, {
			fields: [applicationStatusHistory.changedBy],
			references: [personnels.id],
		}),
	}),
);
