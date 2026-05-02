import { BadRequestError } from './errors';

export interface MultipartDocumentFile {
	filename: string;
	type: string;
	size: number;
	file: File;
}

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const JSON_FORM_FIELDS = new Set(['profile', 'extraAnswers', 'documents']);

export function isMultipartDocumentFile(
	value: unknown,
): value is MultipartDocumentFile {
	if (!value || typeof value !== 'object') return false;

	const candidate = value as Partial<MultipartDocumentFile>;
	return (
		typeof candidate.filename === 'string' &&
		typeof candidate.type === 'string' &&
		typeof candidate.size === 'number' &&
		candidate.file instanceof File
	);
}

function isIndex(segment: string) {
	return /^\d+$/.test(segment);
}

function assertSafePath(parts: string[]) {
	for (const part of parts) {
		if (BLOCKED_KEYS.has(part)) {
			throw new BadRequestError(`Invalid form field "${part}"`);
		}
	}
}

function assignPath(target: Record<string, unknown>, path: string, value: unknown) {
	const parts = path.split('.').filter(Boolean);
	if (!parts.length) throw new BadRequestError('Invalid empty form field');

	assertSafePath(parts);

	let current: any = target;

	for (let index = 0; index < parts.length; index += 1) {
		const part = parts[index]!;
		const isLast = index === parts.length - 1;

		if (isLast) {
			if (Array.isArray(current) && isIndex(part)) {
				current[Number(part)] = value;
			} else {
				current[part] = value;
			}
			return;
		}

		const nextPart = parts[index + 1]!;
		const nextValue = isIndex(nextPart) ? [] : {};

		if (Array.isArray(current) && isIndex(part)) {
			const arrayIndex = Number(part);
			current[arrayIndex] ??= nextValue;
			current = current[arrayIndex];
			continue;
		}

		current[part] ??= nextValue;
		current = current[part];
	}
}

export function parseFlatMultipartForm(body: Record<string, unknown>) {
	const parsed: Record<string, unknown> = {};

	for (const [field, value] of Object.entries(body)) {
		if (field === 'payload') {
			throw new BadRequestError('payload JSON field is not supported');
		}

		if (JSON_FORM_FIELDS.has(field) && typeof value === 'string') {
			throw new BadRequestError(`${field} must use dot-path form fields`);
		}

		if (isMultipartDocumentFile(value) && !/^documents\.\d+\.file$/.test(field)) {
			throw new BadRequestError(`Unexpected file field "${field}"`);
		}

		assignPath(parsed, field, value);
	}

	return parsed;
}
