import { documents, db, type NewDocument } from '../db';
import { deleteDocument, uploadDocument } from '#server/lib/supabase.ts';
import {
	BadRequestError,
	FileTooLargeError,
	UnsupportedFileTypeError,
} from '#server/utils/errors.ts';
import type { MultipartDocumentFile } from '#server/utils/multipart-form.ts';

const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg'];
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;

interface ApplicationDocumentUpload {
	type: string;
	file: MultipartDocumentFile;
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

function assertDocumentFile(file: MultipartDocumentFile | undefined) {
	if (!file) throw new BadRequestError('Document file is required');

	if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
		throw new UnsupportedFileTypeError(ALLOWED_DOCUMENT_TYPES);
	}

	if (file.size > MAX_DOCUMENT_SIZE) {
		throw new FileTooLargeError(50);
	}
}

export const documentService = {
	async uploadApplicationDocuments(
		applicationId: string,
		input: ApplicationDocumentUpload[],
	) {
		const uploadedPaths: string[] = [];
		const rows: NewDocument[] = [];

		for (const document of input) {
			assertDocumentFile(document.file);

			const path = toStoragePath(
				applicationId,
				document.type,
				document.file.type,
			);
			const url = await uploadDocument(path, document.file.file, document.file.type);
			uploadedPaths.push(path);

			rows.push({
				applicationId,
				type: document.type,
				url,
			});
		}

		return {
			rows,
			uploadedPaths,
		};
	},

	async createMany(rows: NewDocument[], executor: typeof db | any = db) {
		if (!rows.length) return [];
		return await executor.insert(documents).values(rows).returning();
	},

	async deleteUploaded(paths: string[]) {
		await Promise.all(paths.map((path) => deleteDocument(path)));
	},
};
