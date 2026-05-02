import { describe, expect, it } from 'bun:test';
import {
	parseFlatMultipartForm,
	type MultipartDocumentFile,
} from '../../server/utils/multipart-form.ts';

function file(): MultipartDocumentFile {
	return {
		filename: 'cor.pdf',
		type: 'application/pdf',
		size: 100,
		file: new File(['pdf'], 'cor.pdf', { type: 'application/pdf' }),
	};
}

describe('parseFlatMultipartForm', () => {
	it('converts flat dot-path fields into nested objects and arrays', () => {
		const parsed = parseFlatMultipartForm({
			studentId: '2024-0001',
			'profile.firstName': 'Ada',
			'profile.address.city': 'Kabankalan',
			'profile.parents.0.type': 'mother',
			'profile.parents.0.firstName': 'Anne',
			'extraAnswers.disability': 'none',
			'documents.0.type': 'cor',
			'documents.0.file': file(),
		});

		expect(parsed).toEqual({
			studentId: '2024-0001',
			profile: {
				firstName: 'Ada',
				address: {
					city: 'Kabankalan',
				},
				parents: [
					{
						type: 'mother',
						firstName: 'Anne',
					},
				],
			},
			extraAnswers: {
				disability: 'none',
			},
			documents: [
				{
					type: 'cor',
					file: expect.any(Object),
				},
			],
		});
	});

	it('rejects legacy JSON payload fields', () => {
		expect(() =>
			parseFlatMultipartForm({
				payload: '{"studentId":"2024-0001"}',
			}),
		).toThrow('payload JSON field is not supported');
	});

	it('rejects JSON string object fields', () => {
		expect(() =>
			parseFlatMultipartForm({
				documents: '[{"type":"cor"}]',
			}),
		).toThrow('documents must use dot-path form fields');
	});
});
