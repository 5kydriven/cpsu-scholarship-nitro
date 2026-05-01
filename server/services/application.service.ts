import { and, asc, count, desc, eq, ilike, inArray, or, SQL } from 'drizzle-orm';
import {
	addresses,
	applicationStatusHistory,
	applications,
	db,
	documents,
	scholars,
	scholarshipOfferings,
	scholarshipNominations,
	studentParents,
	students,
	type NewAddress,
	type NewApplication,
	type NewApplicationStatusHistory,
	type NewDocument,
	type NewStudent,
	type NewStudentParent,
} from '../db';
import { deleteDocument, uploadDocument } from '#server/lib/supabase.ts';
import {
	BadRequestError,
	ConflictError,
	FileTooLargeError,
	ForbiddenError,
	NotFoundError,
	UnsupportedFileTypeError,
} from '#server/utils/errors.ts';
import type {
	ApplicationDocumentInput,
	CreateStudentApplicationSchema,
} from '#server/validators/student.validation.ts';
import type {
	ApplicationQuery,
	SubmitApplicationInput,
	UpdateApplicationStatusInput,
} from '#server/validators/application.validator.ts';
import { buildMeta, toOffset } from '#server/utils/pagination.ts';
import type { User } from '@supabase/supabase-js';

const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg'];
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;

export interface MultipartDocumentFile {
	filename: string;
	type: string;
	size: number;
	file: File;
}

interface CreateStudentApplicationArgs {
	user: User;
	input: CreateStudentApplicationSchema;
	files: Record<string, MultipartDocumentFile>;
}

interface SubmitApplicationArgs {
	studentId: string;
	input: SubmitApplicationInput;
	files: Record<string, MultipartDocumentFile>;
}

function assertDocumentFile(
	document: ApplicationDocumentInput,
	file: MultipartDocumentFile | undefined,
): MultipartDocumentFile {
	if (!file) {
		throw new BadRequestError(
			`Missing file for document field "${document.field}"`,
		);
	}

	if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
		throw new UnsupportedFileTypeError(ALLOWED_DOCUMENT_TYPES);
	}

	if (file.size > MAX_DOCUMENT_SIZE) {
		throw new FileTooLargeError(50);
	}

	return file;
}

function fileExtension(mime: string): string {
	if (mime === 'application/pdf') return 'pdf';
	return 'jpg';
}

function toStoragePath(
	applicationId: string,
	documentType: string,
	mime: string,
): string {
	return `applications/${applicationId}/${documentType}-${crypto.randomUUID()}.${fileExtension(mime)}`;
}

function toScholarNo(code: string | null, academicYear: string, semester: string) {
	const prefix = code?.trim() || 'SCH';
	const year = academicYear.replace(/[^0-9]/g, '');
	return `${prefix}-${year}-${semester}-${crypto.randomUUID().slice(0, 8)}`;
}

async function assertAvailableScholarSlot(offeringId: string, limit: number | null) {
	if (limit === null) return;

	const [result] = await db
		.select({ total: count() })
		.from(scholars)
		.where(eq(scholars.offeringId, offeringId));

	if ((result?.total ?? 0) >= limit) {
		throw new ConflictError('No scholarship slots are available for this offering');
	}
}

async function createScholarForApplication(
	tx: any,
	application: typeof applications.$inferSelect,
	offering: typeof scholarshipOfferings.$inferSelect & {
		program?: { code: string | null } | null;
	},
) {
	const existingScholar = await tx.query.scholars.findFirst({
		where: eq(scholars.applicationId, application.id),
	});

	if (existingScholar) return existingScholar;

	const [scholar] = await tx
		.insert(scholars)
		.values({
			studentId: application.studentId,
			applicationId: application.id,
			offeringId: application.offeringId,
			scholarNo: toScholarNo(
				offering.program?.code ?? null,
				offering.academicYear,
				offering.semester,
			),
			status: 'active',
		})
		.returning();

	return scholar;
}

export const applicationService = {
	async createWithStudentProfile({
		user,
		input,
		files,
	}: CreateStudentApplicationArgs) {
		const offering = await db.query.scholarshipOfferings.findFirst({
			where: eq(scholarshipOfferings.id, input.offeringId),
			with: {
				program: true,
			},
		});

		if (!offering) {
			throw new NotFoundError('Scholarship offering');
		}

		if (offering.status !== 'open' || !offering.program?.isActive) {
			throw new BadRequestError('Scholarship offering is not open');
		}

		const existingStudent = await db.query.students.findFirst({
			where: eq(students.id, user.id),
		});

		if (existingStudent) {
			throw new ConflictError(
				'Student already exists. Please update your profile instead.',
			);
		}

		const existingApplication = await db.query.applications.findFirst({
			where: and(
				eq(applications.studentId, user.id),
				eq(applications.offeringId, input.offeringId),
			),
		});

		if (existingApplication) {
			throw new ConflictError(
				'You already submitted an application for this scholarship offering.',
			);
		}

		const documentFiles = input.documents.map((document) => ({
			document,
			file: assertDocumentFile(document, files[document.field]),
		}));

		const applicationId = crypto.randomUUID();
		const uploadedPaths: string[] = [];

		try {
			const uploadedDocuments: NewDocument[] = [];

			for (const { document, file } of documentFiles) {
				const path = toStoragePath(applicationId, document.type, file.type);
				const url = await uploadDocument(path, file.file, file.type);
				uploadedPaths.push(path);

				uploadedDocuments.push({
					applicationId,
					type: document.type,
					url,
				});
			}

			const result = await db.transaction(async (tx) => {
				const [student] = await tx
					.insert(students)
					.values({
						id: user.id,
						birthdate: input.birthdate,
						contactNumber: input.contactNumber,
						email: user.email,
						extName: input.extName,
						firstName: input.firstName,
						lastName: input.lastName,
						middleName: input.middleName,
						sex: input.sex,
						yearLevel: input.yearLevel,
					} satisfies NewStudent)
					.returning();

				const [address] = await tx
					.insert(addresses)
					.values({
						studentId: user.id,
						street: input.address.street,
						barangay: input.address.barangay,
						city: input.address.city,
						province: input.address.province,
						zipcode: input.address.zipcode,
					} satisfies NewAddress)
					.returning();

				const parentRows = input.parents.map(
					(parent) =>
						({
							type: parent.type,
							firstName: parent.firstName,
							lastName: parent.lastName,
							middleName: parent.middleName,
							contactNumber: parent.contactNumber,
							studentId: user.id,
						}) satisfies NewStudentParent,
				);

				const parents = await tx
					.insert(studentParents)
					.values(parentRows)
					.returning();

				const [application] = await tx
					.insert(applications)
					.values({
						id: applicationId,
						studentId: user.id,
						offeringId: input.offeringId,
						status: 'pending',
						formType: offering.program.code ?? offering.program.name,
						extraAnswers: input.extraAnswers,
						submittedAt: new Date().toISOString(),
					} satisfies NewApplication)
					.returning();

				const createdDocuments = await tx
					.insert(documents)
					.values(uploadedDocuments)
					.returning();

				const [statusHistory] = await tx
					.insert(applicationStatusHistory)
					.values({
						applicationId,
						toStatus: 'pending',
						reason: 'Student submitted application',
					} satisfies NewApplicationStatusHistory)
					.returning();

				return {
					student,
					address,
					parents,
					application,
					documents: createdDocuments,
					statusHistory,
				};
			});

			return result;
		} catch (error) {
			await Promise.all(uploadedPaths.map((path) => deleteDocument(path)));
			throw error;
		}
	},

	async getByStudent(studentId: string) {
		return await db.query.applications.findMany({
			where: eq(applications.studentId, studentId),
			with: {
				offering: {
					with: {
						program: true,
					},
				},
				documents: true,
				statusHistory: true,
			},
			orderBy: desc(applications.createdAt),
		});
	},

	async submit({ studentId, input, files }: SubmitApplicationArgs) {
		const student = await db.query.students.findFirst({
			where: eq(students.id, studentId),
			with: {
				address: true,
				parents: true,
			},
		});

		if (!student) {
			throw new BadRequestError(
				'Complete your student profile before applying for a scholarship',
			);
		}

		const offering = await db.query.scholarshipOfferings.findFirst({
			where: eq(scholarshipOfferings.id, input.offeringId),
			with: {
				program: true,
			},
		});

		if (!offering) throw new NotFoundError('Scholarship offering');

		if (offering.status !== 'open' || !offering.program?.isActive) {
			throw new BadRequestError('Scholarship offering is not open');
		}

		const existingApplication = await db.query.applications.findFirst({
			where: and(
				eq(applications.studentId, studentId),
				eq(applications.offeringId, input.offeringId),
			),
		});

		if (existingApplication) {
			throw new ConflictError(
				'You already submitted an application for this scholarship offering.',
			);
		}

		let nomination: typeof scholarshipNominations.$inferSelect | undefined;

		if (offering.program.intakeType === 'staff_nomination') {
			const foundNomination = await db.query.scholarshipNominations.findFirst({
				where: and(
					eq(scholarshipNominations.studentId, studentId),
					eq(scholarshipNominations.offeringId, input.offeringId),
					eq(scholarshipNominations.status, 'pending'),
				),
			});

			if (!foundNomination) {
				throw new ForbiddenError(
					'You must be nominated before submitting this scholarship form',
				);
			}

			nomination = foundNomination;
		}

		const documentFiles = input.documents.map((document) => ({
			document,
			file: assertDocumentFile(document, files[document.field]),
		}));
		const applicationId = crypto.randomUUID();
		const uploadedPaths: string[] = [];

		try {
			const uploadedDocuments: NewDocument[] = [];

			for (const { document, file } of documentFiles) {
				const path = toStoragePath(applicationId, document.type, file.type);
				const url = await uploadDocument(path, file.file, file.type);
				uploadedPaths.push(path);

				uploadedDocuments.push({
					applicationId,
					type: document.type,
					url,
				});
			}

			return await db.transaction(async (tx) => {
				const shouldApproveImmediately =
					offering.program.intakeType === 'staff_nomination';
				const now = new Date().toISOString();

				const [application] = await tx
					.insert(applications)
					.values({
						id: applicationId,
						studentId,
						offeringId: input.offeringId,
						status: shouldApproveImmediately ? 'approved' : 'pending',
						formType: offering.program.code ?? offering.program.name,
						extraAnswers: input.extraAnswers,
						submittedAt: now,
						approvedAt: shouldApproveImmediately ? now : null,
					} satisfies NewApplication)
					.returning();

				const createdDocuments =
					uploadedDocuments.length > 0
						? await tx.insert(documents).values(uploadedDocuments).returning()
						: [];

				const [statusHistory] = await tx
					.insert(applicationStatusHistory)
					.values({
						applicationId,
						toStatus: application.status,
						reason: shouldApproveImmediately
							? 'Nominated student completed form'
							: 'Student submitted application',
					} satisfies NewApplicationStatusHistory)
					.returning();

				const scholar = shouldApproveImmediately
					? await createScholarForApplication(tx, application, offering)
					: null;

				if (nomination) {
					await tx
						.update(scholarshipNominations)
						.set({
							applicationId,
							status: 'completed',
							updatedAt: now,
						})
						.where(eq(scholarshipNominations.id, nomination.id));
				}

				return {
					application,
					documents: createdDocuments,
					statusHistory,
					scholar,
				};
			});
		} catch (error) {
			await Promise.all(uploadedPaths.map((path) => deleteDocument(path)));
			throw error;
		}
	},

	async list(query: ApplicationQuery) {
		const { page, limit, sortOrder, q, status, offeringId, sortBy } = query;
		const conditions: SQL[] = [];

		if (status) conditions.push(eq(applications.status, status));
		if (offeringId) conditions.push(eq(applications.offeringId, offeringId));
		if (q) {
			const matches = await db
				.select({ id: students.id })
				.from(students)
				.where(
					or(
						ilike(students.firstName, `%${q}%`),
						ilike(students.lastName, `%${q}%`),
					),
				);

			conditions.push(
				matches.length
					? inArray(
							applications.studentId,
							matches.map((student) => student.id),
						)
					: eq(applications.studentId, crypto.randomUUID()),
			);
		}

		const where = conditions.length ? and(...conditions) : undefined;
		const orderColumn = applications.createdAt;
		const order = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn);

		const [countResult] = await db
			.select({ total: count() })
			.from(applications)
			.where(where);

		const data = await db.query.applications.findMany({
			where,
			with: {
				student: {
					with: {
						address: true,
						parents: true,
					},
				},
				offering: {
					with: {
						program: true,
					},
				},
				documents: true,
				scholar: true,
			},
			limit,
			offset: toOffset(page, limit),
			orderBy: order,
		});

		return {
			data,
			meta: buildMeta(countResult?.total ?? 0, page, limit),
		};
	},

	async getById(id: string) {
		const application = await db.query.applications.findFirst({
			where: eq(applications.id, id),
			with: {
				student: {
					with: {
						address: true,
						parents: true,
					},
				},
				offering: {
					with: {
						program: true,
					},
				},
				documents: true,
				statusHistory: true,
				scholar: true,
			},
		});

		if (!application) throw new NotFoundError('Application');

		return application;
	},

	async updateStatus(
		id: string,
		input: UpdateApplicationStatusInput,
		personnelId: string,
	) {
		const current = await db.query.applications.findFirst({
			where: eq(applications.id, id),
			with: {
				offering: {
					with: {
						program: true,
					},
				},
				scholar: true,
			},
		});

		if (!current) throw new NotFoundError('Application');

		if (current.status === 'approved' || current.status === 'rejected') {
			throw new ConflictError('Application has already been finalized');
		}

		if (input.status === 'approved') {
			await assertAvailableScholarSlot(
				current.offeringId,
				current.offering.availableSlots,
			);
		}

		return await db.transaction(async (tx) => {
			const now = new Date().toISOString();
			const [application] = await tx
				.update(applications)
				.set({
					status: input.status,
					reviewedBy: personnelId,
					reviewedAt: now,
					approvedBy: input.status === 'approved' ? personnelId : null,
					approvedAt: input.status === 'approved' ? now : null,
					rejectionReason: input.status === 'rejected' ? input.reason : null,
					updatedAt: now,
				})
				.where(eq(applications.id, id))
				.returning();

			const [statusHistory] = await tx
				.insert(applicationStatusHistory)
				.values({
					applicationId: id,
					fromStatus: current.status,
					toStatus: input.status,
					changedBy: personnelId,
					reason:
						input.reason ??
						(input.status === 'approved'
							? 'Application approved'
							: 'Application rejected'),
				} satisfies NewApplicationStatusHistory)
				.returning();

			const scholar =
				input.status === 'approved'
					? await createScholarForApplication(tx, application, current.offering)
					: null;

			return {
				application,
				statusHistory,
				scholar,
			};
		});
	},
};
