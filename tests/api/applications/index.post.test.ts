import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ConflictError } from '../../../server/utils/errors.ts';

const txMock = { tx: true };
const transactionMock = mock(async (callback: (tx: unknown) => unknown) =>
	callback(txMock),
);
const requestBodyMock = mock(async () => validMultipartBody());
const getOfferingMock = mock(async () => validOffering());
const assertNotSubmittedMock = mock(async () => undefined);
const uploadDocumentsMock = mock(async (applicationId: string) => ({
	rows: [
		{
			applicationId,
			type: 'cor',
			url: 'https://storage.example/cor.pdf',
		},
	],
	uploadedPaths: [`applications/${applicationId}/cor.pdf`],
}));
const deleteUploadedMock = mock(async () => undefined);
const upsertProfileMock = mock(async () => ({
	id: studentUuid,
	studentId: '2024-0001',
	firstName: 'ada',
	lastName: 'lovelace',
}));
const upsertAddressMock = mock(async () => ({
	id: 'address-1',
	studentId: studentUuid,
	city: 'kabankalan',
}));
const replaceParentsMock = mock(async () => [
	{
		id: 'parent-1',
		studentId: studentUuid,
		type: 'mother',
		firstName: 'anne',
		lastName: 'lovelace',
	},
]);
const createApplicationMock = mock(async (input) => ({
	...input,
	createdAt: '2026-05-02T00:00:00.000Z',
}));
const createDocumentsMock = mock(async (rows) => rows);
const createStatusHistoryMock = mock(async (input) => ({
	id: 'status-1',
	...input,
}));
const findPendingNominationMock = mock(async () => ({
	id: 'nomination-1',
	studentId: studentUuid,
	offeringId,
	status: 'pending',
}));
const completeNominationMock = mock(async () => ({
	id: 'nomination-1',
	status: 'completed',
}));
const createScholarMock = mock(async () => ({
	id: 'scholar-1',
	studentId: studentUuid,
	offeringId,
	status: 'active',
}));

mock.module('#server/db/index.ts', () => ({
	db: {
		transaction: transactionMock,
	},
}));

mock.module('#server/utils/request-body.ts', () => ({
	requestBody: requestBodyMock,
}));

mock.module('#server/services/scholarship-offering.service.ts', () => ({
	scholarshipOfferingService: {
		getById: getOfferingMock,
	},
}));

mock.module('#server/services/application.service.ts', () => ({
	applicationService: {
		assertNotSubmitted: assertNotSubmittedMock,
		create: createApplicationMock,
	},
}));

mock.module('#server/services/document.service.ts', () => ({
	documentService: {
		uploadApplicationDocuments: uploadDocumentsMock,
		createMany: createDocumentsMock,
		deleteUploaded: deleteUploadedMock,
	},
}));

mock.module('#server/services/student.service.ts', () => ({
	studentService: {
		upsertProfile: upsertProfileMock,
	},
}));

mock.module('#server/services/address.service.ts', () => ({
	addressService: {
		upsertForStudent: upsertAddressMock,
	},
}));

mock.module('#server/services/student-parent.service.ts', () => ({
	studentParentService: {
		replaceForStudent: replaceParentsMock,
	},
}));

mock.module('#server/services/application-status-history.service.ts', () => ({
	applicationStatusHistoryService: {
		create: createStatusHistoryMock,
	},
}));

mock.module('#server/services/nomination.service.ts', () => ({
	nominationService: {
		findPendingByStudentAndOffering: findPendingNominationMock,
		complete: completeNominationMock,
	},
}));

mock.module('#server/services/scholar.service.ts', () => ({
	scholarService: {
		createForApplication: createScholarMock,
	},
}));

const { default: handler } = await import(
	'../../../server/routes/api/applications/index.post.ts'
);

const studentUuid = '11111111-1111-4111-8111-111111111111';
const offeringId = '22222222-2222-4222-8222-222222222222';

function validFile() {
	return {
		filename: 'cor.pdf',
		type: 'application/pdf',
		size: 1024,
		file: new File(['pdf'], 'cor.pdf', { type: 'application/pdf' }),
	};
}

function validMultipartBody() {
	return {
		studentId: '2024-0001',
		offeringId,
		'profile.firstName': 'Ada',
		'profile.lastName': 'Lovelace',
		'profile.birthdate': '2004-01-01',
		'profile.birthplace': 'Kabankalan',
		'profile.contactNumber': '09123456789',
		'profile.sex': 'female',
		'profile.yearLevel': '2',
		'profile.address.street': 'Main',
		'profile.address.barangay': 'Barangay 1',
		'profile.address.city': 'Kabankalan',
		'profile.address.province': 'Negros Occidental',
		'profile.address.zipcode': '6111',
		'profile.parents.0.type': 'mother',
		'profile.parents.0.firstName': 'Anne',
		'profile.parents.0.lastName': 'Lovelace',
		'profile.parents.0.status': 'living',
		'extraAnswers.disability': 'none',
		'documents.0.type': 'cor',
		'documents.0.file': validFile(),
	};
}

function validOffering() {
	return {
		id: offeringId,
		status: 'open',
		academicYear: '2026-2027',
		semester: '1',
		program: {
			code: 'TES',
			name: 'Tertiary Education Subsidy',
			isActive: true,
			intakeType: 'staff_nomination',
		},
	};
}

function event(contentType = 'multipart/form-data; boundary=test') {
	return {
		req: {
			headers: new Headers({
				'content-type': contentType,
			}),
		},
		context: {
			role: 'student',
			user: {
				id: studentUuid,
				email: 'ada@example.com',
			},
		},
	} as any;
}

function resetMocks() {
	for (const mocked of [
		transactionMock,
		requestBodyMock,
		getOfferingMock,
		assertNotSubmittedMock,
		uploadDocumentsMock,
		deleteUploadedMock,
		upsertProfileMock,
		upsertAddressMock,
		replaceParentsMock,
		createApplicationMock,
		createDocumentsMock,
		createStatusHistoryMock,
		findPendingNominationMock,
		completeNominationMock,
		createScholarMock,
	]) {
		mocked.mockClear();
	}

	transactionMock.mockImplementation(async (callback) => callback(txMock));
	requestBodyMock.mockImplementation(async () => validMultipartBody());
	getOfferingMock.mockImplementation(async () => validOffering());
	assertNotSubmittedMock.mockImplementation(async () => undefined);
	uploadDocumentsMock.mockImplementation(async (applicationId: string) => ({
		rows: [
			{
				applicationId,
				type: 'cor',
				url: 'https://storage.example/cor.pdf',
			},
		],
		uploadedPaths: [`applications/${applicationId}/cor.pdf`],
	}));
	deleteUploadedMock.mockImplementation(async () => undefined);
	findPendingNominationMock.mockImplementation(async () => ({
		id: 'nomination-1',
		studentId: studentUuid,
		offeringId,
		status: 'pending',
	}));
}

describe('POST /api/applications', () => {
	beforeEach(() => {
		resetMocks();
	});

	it('submits a flat multipart application and coordinates modular services', async () => {
		const result = await handler(event());
		const uploadApplicationId = uploadDocumentsMock.mock.calls[0]?.[0];

		expect(requestBodyMock).toHaveBeenCalledTimes(1);
		expect(getOfferingMock).toHaveBeenCalledWith(offeringId);
		expect(assertNotSubmittedMock).toHaveBeenCalledWith(studentUuid, offeringId);
		expect(findPendingNominationMock).toHaveBeenCalledWith(
			studentUuid,
			offeringId,
		);
		expect(typeof uploadApplicationId).toBe('string');
		expect(transactionMock).toHaveBeenCalledTimes(1);
		expect(upsertProfileMock).toHaveBeenCalledWith(
			studentUuid,
			'ada@example.com',
			expect.objectContaining({
				studentId: '2024-0001',
				firstName: 'ada',
				lastName: 'lovelace',
			}),
			txMock,
		);
		expect(upsertAddressMock).toHaveBeenCalledWith(
			studentUuid,
			expect.objectContaining({
				city: 'kabankalan',
			}),
			txMock,
		);
		expect(replaceParentsMock).toHaveBeenCalledWith(
			studentUuid,
			[
				expect.objectContaining({
					type: 'mother',
					firstName: 'anne',
				}),
			],
			txMock,
		);
		expect(createApplicationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				id: uploadApplicationId,
				studentId: studentUuid,
				offeringId,
				status: 'approved',
				formType: 'TES',
			}),
			txMock,
		);
		expect(createDocumentsMock).toHaveBeenCalledWith(
			[
				{
					applicationId: uploadApplicationId,
					type: 'cor',
					url: 'https://storage.example/cor.pdf',
				},
			],
			txMock,
		);
		expect(createStatusHistoryMock).toHaveBeenCalledWith(
			expect.objectContaining({
				applicationId: uploadApplicationId,
				toStatus: 'approved',
			}),
			txMock,
		);
		expect(createScholarMock).toHaveBeenCalledTimes(1);
		expect(completeNominationMock).toHaveBeenCalledWith(
			'nomination-1',
			uploadApplicationId,
			txMock,
		);
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
			}),
		);
	});

	it('rejects JSON requests', async () => {
		const response = (await handler(event('application/json'))) as Response;
		const json = await response.json();

		expect(response.status).toBe(400);
		expect(requestBodyMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('BAD_REQUEST');
	});

	it('rejects JSON payload fields in form-data', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			payload: '{"studentId":"2024-0001"}',
		}));

		const response = (await handler(event())) as Response;
		const json = await response.json();

		expect(response.status).toBe(400);
		expect(uploadDocumentsMock).not.toHaveBeenCalled();
		expect(json.error.message).toContain('payload');
	});

	it('returns 422 when a document row is missing its file', async () => {
		const body = validMultipartBody();
		delete body['documents.0.file'];
		requestBodyMock.mockImplementationOnce(async () => body);

		const response = (await handler(event())) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(uploadDocumentsMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('VALIDATION_ERROR');
	});

	it('returns 422 when required application fields are invalid', async () => {
		requestBodyMock.mockImplementationOnce(async () => ({
			studentId: '',
			offeringId: 'not-a-uuid',
		}));

		const response = (await handler(event())) as Response;
		const json = await response.json();

		expect(response.status).toBe(422);
		expect(getOfferingMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('VALIDATION_ERROR');
	});

	it('returns 409 when the student already submitted for the offering', async () => {
		assertNotSubmittedMock.mockImplementationOnce(async () => {
			throw new ConflictError(
				'You already submitted an application for this scholarship offering.',
			);
		});

		const response = (await handler(event())) as Response;
		const json = await response.json();

		expect(response.status).toBe(409);
		expect(uploadDocumentsMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('CONFLICT');
	});

	it('returns 401 when the user is not a student', async () => {
		const response = (await handler({
			...event(),
			context: {
				role: 'staff',
				user: {
					id: studentUuid,
				},
			},
		} as any)) as Response;
		const json = await response.json();

		expect(response.status).toBe(401);
		expect(requestBodyMock).not.toHaveBeenCalled();
		expect(json.error.code).toBe('UNAUTHORIZED');
	});
});
