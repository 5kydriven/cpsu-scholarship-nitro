import { and, desc, eq } from 'drizzle-orm';
import {
	addresses,
	applicationStatusHistory,
	applications,
	db,
	documents,
	scholarshipOfferings,
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
	NotFoundError,
	UnsupportedFileTypeError,
} from '#server/utils/errors.ts';
import type {
	ApplicationDocumentInput,
	CreateStudentApplicationSchema,
} from '#server/validators/student.validation.ts';
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
						formType: offering.program.code,
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
};
