import { defineHandler } from 'nitro';

type EndpointStatus = 'ready' | 'not-ready';

interface ApiEndpoint {
	method: string;
	path: string;
	access: string;
	input: string;
	summary: string;
	payload?: string[];
	example?: unknown;
	notes?: string[];
	status?: EndpointStatus;
}

interface ApiGroup {
	title: string;
	description: string;
	endpoints: ApiEndpoint[];
}

const commonListQuery = [
	'page?: number, default 1',
	'limit?: number, default 20, max 100',
	'sortOrder?: asc | desc, default asc',
	'q?: string',
];

const studentProfilePayload = {
	studentId: '2024-0001',
	firstName: 'juan',
	lastName: 'dela cruz',
	middleName: 'santos',
	extName: 'jr',
	birthdate: '2004-01-31',
	birthplace: 'kabankalan city',
	contactNumber: '09171234567',
	email: 'student@example.com',
	sex: 'male',
	courseId: 'uuid',
	yearLevel: 1,
	address: {
		street: 'sample street',
		barangay: 'sample barangay',
		city: 'kabankalan city',
		province: 'negros occidental',
		zipcode: '6111',
	},
	parents: [
		{
			type: 'father',
			firstName: 'pedro',
			lastName: 'dela cruz',
			monthlyIncome: '10000',
			status: 'living',
			contactNumber: '09171234567',
		},
	],
};

const applicationFormData = [
	{
		key: 'studentId',
		type: 'Text',
		value: '2024-0001',
	},
	{
		key: 'offeringId',
		type: 'Text',
		value: 'uuid',
	},
	{
		key: 'profile.firstName',
		type: 'Text',
		value: 'juan',
	},
	{
		key: 'profile.lastName',
		type: 'Text',
		value: 'dela cruz',
	},
	{
		key: 'profile.birthdate',
		type: 'Text',
		value: '2004-01-31',
	},
	{
		key: 'profile.birthplace',
		type: 'Text',
		value: 'kabankalan city',
	},
	{
		key: 'profile.contactNumber',
		type: 'Text',
		value: '09171234567',
	},
	{
		key: 'profile.sex',
		type: 'Text',
		value: 'male',
	},
	{
		key: 'profile.yearLevel',
		type: 'Text',
		value: '1',
	},
	{
		key: 'profile.address.street',
		type: 'Text',
		value: 'sample street',
	},
	{
		key: 'profile.address.barangay',
		type: 'Text',
		value: 'sample barangay',
	},
	{
		key: 'profile.address.city',
		type: 'Text',
		value: 'kabankalan city',
	},
	{
		key: 'profile.address.province',
		type: 'Text',
		value: 'negros occidental',
	},
	{
		key: 'profile.address.zipcode',
		type: 'Text',
		value: '6111',
	},
	{
		key: 'profile.parents.0.type',
		type: 'Text',
		value: 'father',
	},
	{
		key: 'profile.parents.0.firstName',
		type: 'Text',
		value: 'pedro',
	},
	{
		key: 'profile.parents.0.lastName',
		type: 'Text',
		value: 'dela cruz',
	},
	{
		key: 'profile.parents.0.status',
		type: 'Text',
		value: 'living',
	},
	{
		key: 'extraAnswers.courseText',
		type: 'Text',
		value: 'bs information technology',
	},
	{
		key: 'documents.0.type',
		type: 'Text',
		value: 'certificate_of_registration',
	},
	{
		key: 'documents.0.file',
		type: 'File',
		value: 'Select the PDF or JPG file for certificate_of_registration',
	},
];

const apiGroups: ApiGroup[] = [
	{
		title: 'Auth',
		description:
			'Public login/register routes plus authenticated session helpers.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/auth/register',
				access: 'Public',
				input: 'application/json or multipart/form-data',
				summary:
					'Creates a student Supabase Auth user and links an imported student ID.',
				payload: [
					'studentId: imported school student ID, currently unlinked',
					'email: valid email',
					'password: string, min 8 characters',
				],
				example: {
					studentId: '2024-0001',
					email: 'student@example.com',
					password: 'password123',
				},
			},
			{
				method: 'POST',
				path: '/api/auth/student-id/check',
				access: 'Public',
				input: 'application/json or multipart/form-data',
				summary:
					'Checks whether an imported student ID is linked to an account.',
				payload: ['studentId: imported school student ID'],
				example: {
					studentId: '2024-0001',
				},
				notes: [
					'Returns status linked when the frontend should show the password field.',
					'Returns status unlinked when the frontend should continue to registration with email and password.',
					'Returns 404 when the student ID was not imported.',
				],
			},
			{
				method: 'POST',
				path: '/api/auth/login',
				access: 'Public',
				input: 'application/json or multipart/form-data',
				summary:
					'Signs in with email or linked student ID and sets sb-access-token and sb-refresh-token cookies.',
				payload: [
					'email: valid email OR studentId: linked school student ID',
					'password: string',
				],
				example: {
					studentId: '2024-0001',
					password: 'password123',
				},
				notes: [
					'Email/password login remains supported.',
					'Student ID login requires the roster row to be linked to an account.',
				],
			},
			{
				method: 'GET',
				path: '/api/auth/me',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Returns the authenticated Supabase user.',
			},
			{
				method: 'GET',
				path: '/api/auth/logout',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Clears auth cookies and signs out from Supabase.',
			},
		],
	},
	{
		title: 'Students',
		description: 'Student profile creation and lookup routes.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/students',
				access: 'Student',
				input: 'application/json or multipart/form-data',
				summary: 'Creates or updates the authenticated student profile.',
				payload: [
					'studentId, firstName, lastName, birthdate, birthplace, contactNumber, sex, yearLevel',
					'middleName?, extName?, email?, courseId?',
					'address: street, barangay, city, province, zipcode',
					'parents[]: type, firstName, lastName, optional identity/contact fields',
				],
				example: studentProfilePayload,
			},
			{
				method: 'GET',
				path: '/api/students',
				access: 'Authenticated',
				input: 'Query params',
				summary: 'Lists students with pagination.',
				payload: [
					...commonListQuery,
					'sortBy?: yearLevel, default yearLevel',
					'yearLevel?: number, 1 to 6',
				],
			},
			{
				method: 'GET',
				path: '/api/students/:id',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Returns one student by UUID path parameter.',
			},
			{
				method: 'PUT',
				path: '/api/students/:id',
				access: 'Authenticated',
				input: 'application/json or multipart/form-data',
				summary: 'Not ready. Current handler only echoes id and body.',
				status: 'not-ready',
			},
			{
				method: 'DELETE',
				path: '/api/students/:id',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Not ready. Current handler is empty.',
				status: 'not-ready',
			},
		],
	},
	{
		title: 'Student ID Roster',
		description:
			'Staff/admin roster routes for imported school student IDs used by student ID login.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/admin/student-id-roster/import',
				access: 'Staff/Admin',
				input: 'multipart/form-data',
				summary:
					'Imports school student IDs for the student ID login and registration flow.',
				payload: [
					'file: CSV, TSV, XLS, or XLSX upload',
					'Headers must be exactly Student ID No., Name',
					'Each row creates or updates the student_id_roster table',
				],
				example: [
					{
						key: 'file',
						type: 'File',
						value:
							'CSV/Excel file with columns Student ID No., Name',
					},
				],
				notes: [
					'student_id_roster.student_id is unique.',
					'Imported names are stored for reference.',
					'Importing an existing linked student ID updates the stored reference data but does not unlink the account.',
				],
			},
			{
				method: 'PUT',
				path: '/api/admin/student-id-roster/:id',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Edits one student_id_roster row by roster UUID.',
				payload: [
					'studentId?: unique school student ID',
					'fullName?: student name from school roster',
				],
				example: {
					studentId: '2025-0015-R',
					fullName: 'ABELO, JANEL',
				},
			},
			{
				method: 'DELETE',
				path: '/api/admin/student-id-roster/:id',
				access: 'Staff/Admin',
				input: 'No body',
				summary: 'Deletes one student_id_roster row by roster UUID.',
			},
			{
				method: 'POST',
				path: '/api/admin/student-id-roster/batch-delete',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Deletes multiple student_id_roster rows by UUIDs or student IDs.',
				payload: [
					'ids?: roster UUID[]',
					'studentIds?: unique school student ID[]',
					'Send at least one of ids or studentIds',
				],
				example: {
					studentIds: ['2025-0015-R', '2025-0075-R'],
				},
			},
		],
	},
	{
		title: 'Personnels',
		description: 'Staff/admin personnel management routes.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/personnels',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Creates a personnel auth user and personnel row.',
				payload: [
					'email, password, role, firstName, lastName, sex',
					'middleName?, extName?, birthdate?, contactNumber?, position?, department?',
				],
				example: {
					email: 'staff@example.com',
					password: 'password123',
					role: 'staff',
					firstName: 'ana',
					lastName: 'reyes',
					sex: 'female',
					position: 'scholarship coordinator',
					department: 'student affairs',
				},
			},
			{
				method: 'GET',
				path: '/api/personnels',
				access: 'Staff/Admin',
				input: 'Query params',
				summary: 'Lists personnels with pagination.',
				payload: [
					...commonListQuery,
					'sortBy?: lastName | firstName, default lastName',
				],
			},
			{
				method: 'GET',
				path: '/api/personnels/:id',
				access: 'Staff/Admin',
				input: 'No body',
				summary: 'Returns one personnel by UUID path parameter.',
			},
		],
	},
	{
		title: 'Courses',
		description: 'Course catalogue routes.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/courses',
				access: 'Authenticated',
				input: 'application/json or multipart/form-data',
				summary: 'Creates a course.',
				payload: ['name: string', 'abbreviation: string', 'major?: string'],
				example: {
					name: 'bachelor of science in information technology',
					abbreviation: 'bsit',
					major: 'networking',
				},
			},
			{
				method: 'GET',
				path: '/api/courses',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Lists all courses.',
			},
			{
				method: 'PUT',
				path: '/api/courses/:id',
				access: 'Authenticated',
				input: 'application/json or multipart/form-data',
				summary:
					'Updates a course. All fields are optional, but send at least one.',
				payload: ['name?: string', 'abbreviation?: string', 'major?: string'],
				example: {
					name: 'bachelor of science in information technology',
				},
			},
			{
				method: 'DELETE',
				path: '/api/courses/:id',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Deletes a course by UUID path parameter.',
			},
		],
	},
	{
		title: 'Addresses And Parents',
		description: 'Supporting student/personnel profile data.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/addresses',
				access: 'Authenticated',
				input: 'application/json or multipart/form-data',
				summary: 'Creates an address linked to a student or personnel.',
				payload: [
					'studentId?: string',
					'personnelId?: string',
					'street, barangay, city, province, zipcode',
				],
				example: {
					studentId: 'uuid',
					street: 'sample street',
					barangay: 'sample barangay',
					city: 'kabankalan city',
					province: 'negros occidental',
					zipcode: '6111',
				},
			},
			{
				method: 'POST',
				path: '/api/parents',
				access: 'Authenticated',
				input: 'application/json or multipart/form-data',
				summary: 'Creates parent/guardian data for the authenticated student.',
				payload: [
					'type: father | mother | guardian',
					'firstName, lastName',
					'middleName?, extName?, occupation?, monthlyIncome?, status?, contactNumber?, email?',
				],
				example: {
					type: 'guardian',
					firstName: 'maria',
					lastName: 'santos',
					status: 'living',
					contactNumber: '09171234567',
				},
				notes: [
					'Creates one parent or guardian row per request. Use /api/students or /api/applications for all-in-one profile submission.',
				],
			},
		],
	},
	{
		title: 'Scholarship Programs',
		description: 'Scholarship program definitions.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/scholarship-programs',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Creates a scholarship program.',
				payload: [
					'code?: string',
					'name: string',
					'description?: string | null',
					'intakeType?: public_application | staff_nomination, default public_application',
					'defaultAmountPerSemester: positive number',
					'isActive?: boolean',
				],
				example: {
					code: 'TES',
					name: 'Tertiary Education Subsidy',
					description: 'Sample scholarship program',
					intakeType: 'public_application',
					defaultAmountPerSemester: 10000,
					isActive: true,
				},
			},
			{
				method: 'GET',
				path: '/api/scholarship-programs',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Lists scholarship programs.',
			},
			{
				method: 'GET',
				path: '/api/scholarship-programs/:id',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Returns one scholarship program by UUID path parameter.',
			},
			{
				method: 'PUT',
				path: '/api/scholarship-programs/:id',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Updates a scholarship program. Send at least one field.',
				payload: [
					'code?, name?, description?, intakeType?, defaultAmountPerSemester?, isActive?',
				],
			},
			{
				method: 'DELETE',
				path: '/api/scholarship-programs/:id',
				access: 'Staff/Admin',
				input: 'No body',
				summary: 'Deletes a scholarship program by UUID path parameter.',
			},
		],
	},
	{
		title: 'Scholarship Offerings',
		description:
			'Scholarship program openings for an academic year and semester.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/scholarship-offerings',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Creates a scholarship offering.',
				payload: [
					'programId: UUID',
					'academicYear: YYYY-YYYY',
					'semester: 1 | 2',
					'allocatedBudget: positive number',
					'availableSlots?: positive integer | null',
					'applicationStartAt?: date string | null',
					'applicationEndAt?: date string | null',
					'status?: draft | open | closed | archived, default draft',
				],
				example: {
					programId: 'uuid',
					academicYear: '2025-2026',
					semester: '1',
					allocatedBudget: 500000,
					availableSlots: 50,
					applicationStartAt: '2026-05-01T00:00:00.000Z',
					applicationEndAt: '2026-05-31T23:59:59.000Z',
					status: 'open',
				},
			},
			{
				method: 'GET',
				path: '/api/scholarship-offerings',
				access: 'Authenticated',
				input: 'Query params',
				summary: 'Lists scholarship offerings with pagination.',
				payload: [...commonListQuery, 'status?: draft, open, closed, archived'],
			},
			{
				method: 'GET',
				path: '/api/scholarship-offerings/:id',
				access: 'Authenticated',
				input: 'No body',
				summary: 'Returns one scholarship offering by UUID path parameter.',
			},
			{
				method: 'PUT',
				path: '/api/scholarship-offerings/:id',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Updates a scholarship offering. Send at least one field.',
				payload: [
					'programId?, academicYear?, semester?, allocatedBudget?, availableSlots?, applicationStartAt?, applicationEndAt?, status?',
				],
			},
		],
	},
	{
		title: 'Applications',
		description:
			'Student scholarship application submission and review routes.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/applications',
				access: 'Student',
				input: 'multipart/form-data',
				summary:
					'Submits a scholarship application for the authenticated student.',
				payload: [
					'Postman Body type: form-data',
					'studentId: Text, school student ID such as 2024-0001',
					'offeringId: Text, scholarship offering UUID',
					'profile.firstName, profile.lastName, profile.birthdate, profile.birthplace',
					'profile.contactNumber, profile.sex, profile.yearLevel, profile.courseId?',
					'profile.address.street, profile.address.barangay, profile.address.city, profile.address.province, profile.address.zipcode',
					'profile.parents.0.type, profile.parents.0.firstName, profile.parents.0.lastName',
					'extraAnswers.<key>: Text, optional scholarship-specific answers',
					'documents.0.type: Text, snake_case document type',
					'documents.0.file: File, matching PDF or JPG upload',
				],
				example: applicationFormData,
				notes: [
					'This endpoint rejects application/json bodies.',
					'Do not send payload, profile, extraAnswers, or documents as JSON strings inside form-data.',
					'Accepted document file types are application/pdf and image/jpeg.',
					'Each document file can be up to 50 MB.',
					'The authenticated user UUID is stored as applications.student_id. The submitted studentId field is stored on students.student_id.',
					'The profile, address, and parent rows are upserted before the application is created.',
				],
			},
			{
				method: 'GET',
				path: '/api/applications/me',
				access: 'Student',
				input: 'No body',
				summary: 'Lists applications for the authenticated student.',
			},
			{
				method: 'GET',
				path: '/api/admin/applications',
				access: 'Staff/Admin',
				input: 'Query params',
				summary: 'Lists applications for staff/admin review.',
				payload: [
					...commonListQuery,
					'status?: pending | under_review | approved | rejected | cancelled',
					'offeringId?: UUID',
					'sortBy?: createdAt | lastName, default createdAt',
				],
			},
			{
				method: 'GET',
				path: '/api/admin/applications/:id',
				access: 'Staff/Admin',
				input: 'No body',
				summary: 'Returns one application by UUID path parameter.',
			},
			{
				method: 'PATCH',
				path: '/api/admin/applications/:id',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Approves or rejects an application.',
				payload: [
					'status: approved | rejected',
					'reason?: string, required when status is rejected',
				],
				example: {
					status: 'rejected',
					reason: 'Incomplete documents',
				},
			},
		],
	},
	{
		title: 'Nominations',
		description: 'Staff/admin nomination routes for nomination-based programs.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/admin/nominations',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Creates a scholarship nomination for a student.',
				payload: [
					'studentId: text student ID',
					'offeringId: UUID',
					'remarks?: string, max 500 characters',
				],
				example: {
					studentId: '2024-0001',
					offeringId: 'uuid',
					remarks: 'Recommended by scholarship office',
				},
			},
			{
				method: 'GET',
				path: '/api/admin/nominations',
				access: 'Staff/Admin',
				input: 'Query params',
				summary: 'Lists nominations with pagination.',
				payload: [
					...commonListQuery,
					'offeringId?: UUID',
					'status?: pending | completed | cancelled',
				],
			},
		],
	},
	{
		title: 'Payouts',
		description: 'Scholar payout generation, release, and receipt routes.',
		endpoints: [
			{
				method: 'POST',
				path: '/api/admin/payouts/generate',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Generates payouts for an offering.',
				payload: ['offeringId: UUID'],
				example: {
					offeringId: 'uuid',
				},
			},
			{
				method: 'GET',
				path: '/api/admin/payouts',
				access: 'Staff/Admin',
				input: 'Query params',
				summary: 'Lists payouts with pagination.',
				payload: [
					...commonListQuery,
					'offeringId?: UUID',
					'studentId?: text student ID',
					'status?: pending | released | received | cancelled',
				],
			},
			{
				method: 'PATCH',
				path: '/api/admin/payouts/:id/release',
				access: 'Staff/Admin',
				input: 'application/json or multipart/form-data',
				summary: 'Marks a payout as released.',
				payload: ['remarks?: string, max 500 characters'],
				example: {
					remarks: 'Released through cashier',
				},
			},
			{
				method: 'GET',
				path: '/api/payouts/me',
				access: 'Student',
				input: 'No body',
				summary: 'Lists payouts for the authenticated student.',
			},
			{
				method: 'POST',
				path: '/api/payouts/:id/confirm-receipt',
				access: 'Student',
				input: 'application/json or multipart/form-data',
				summary: 'Confirms receipt of a released payout.',
				payload: ['checkNumber: string'],
				example: {
					checkNumber: 'CHK-0001',
				},
			},
		],
	},
	{
		title: 'Scholars',
		description: 'Staff/admin scholar listing routes.',
		endpoints: [
			{
				method: 'GET',
				path: '/api/admin/scholars',
				access: 'Staff/Admin',
				input: 'Query params',
				summary: 'Lists scholars with pagination.',
				payload: [
					...commonListQuery,
					'offeringId?: UUID',
					'programId?: UUID',
					'academicYear?: string',
					'semester?: 1 | 2',
					'status?: active | inactive | completed | revoked',
					'sortBy?: createdAt | lastName | scholarNo, default createdAt',
				],
			},
			{
				method: 'POST',
				path: '/api/admin/scholars/import',
				access: 'Staff/Admin',
				input: 'Not ready',
				summary: 'Not ready. Current route file is empty.',
				status: 'not-ready',
			},
			{
				method: 'GET',
				path: '/api/admin/scholars/:id',
				access: 'Staff/Admin',
				input: 'Not ready',
				summary: 'Not ready. Current route file is empty.',
				status: 'not-ready',
			},
		],
	},
];

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderPayload(endpoint: ApiEndpoint) {
	if (!endpoint.payload?.length) {
		return '<p class="muted">No body</p>';
	}

	return `<ul class="payload">${endpoint.payload
		.map((field) => `<li>${escapeHtml(field)}</li>`)
		.join('')}</ul>`;
}

function renderExample(endpoint: ApiEndpoint) {
	if (!endpoint.example) return '';

	if (
		Array.isArray(endpoint.example) &&
		endpoint.example.every(
			(row) =>
				row &&
				typeof row === 'object' &&
				'key' in row &&
				'type' in row &&
				'value' in row,
		)
	) {
		return `<details>
	<summary>Postman form-data body</summary>
	<table class="form-data-example">
		<thead>
			<tr>
				<th>Key</th>
				<th>Type</th>
				<th>Value</th>
			</tr>
		</thead>
		<tbody>
			${endpoint.example
				.map((row) => {
					const item = row as { key: string; type: string; value: string };
					return `<tr>
				<td><code>${escapeHtml(item.key)}</code></td>
				<td>${escapeHtml(item.type)}</td>
				<td><code>${escapeHtml(item.value)}</code></td>
			</tr>`;
				})
				.join('')}
		</tbody>
	</table>
</details>`;
	}

	return `<details>
	<summary>Example payload</summary>
	<pre><code>${escapeHtml(JSON.stringify(endpoint.example, null, 2))}</code></pre>
</details>`;
}

function renderNotes(endpoint: ApiEndpoint) {
	if (!endpoint.notes?.length) return '';

	return `<ul class="notes">${endpoint.notes
		.map((note) => `<li>${escapeHtml(note)}</li>`)
		.join('')}</ul>`;
}

function renderEndpoint(endpoint: ApiEndpoint) {
	const status = endpoint.status ?? 'ready';

	return `<article class="endpoint ${status === 'not-ready' ? 'not-ready' : ''}">
	<div class="endpoint-header">
		<span class="method method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
		<code>${escapeHtml(endpoint.path)}</code>
		${status === 'not-ready' ? '<span class="status">Not ready</span>' : ''}
	</div>
	<p>${escapeHtml(endpoint.summary)}</p>
	<div class="meta">
		<span><strong>Access:</strong> ${escapeHtml(endpoint.access)}</span>
		<span><strong>Input:</strong> ${escapeHtml(endpoint.input)}</span>
	</div>
	${renderPayload(endpoint)}
	${renderExample(endpoint)}
	${renderNotes(endpoint)}
</article>`;
}

function renderGroup(group: ApiGroup) {
	return `<section>
	<div class="section-title">
		<h2>${escapeHtml(group.title)}</h2>
		<p>${escapeHtml(group.description)}</p>
	</div>
	<div class="endpoint-grid">
		${group.endpoints.map(renderEndpoint).join('')}
	</div>
</section>`;
}

function countEndpoints(status?: EndpointStatus) {
	return apiGroups.reduce((total, group) => {
		return (
			total +
			group.endpoints.filter(
				(endpoint) => !status || endpoint.status === status,
			).length
		);
	}, 0);
}

function renderHtml() {
	const readyCount = countEndpoints() - countEndpoints('not-ready');

	return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1" />
		<title>CPSU Scholarship API Reference</title>
		<style>
			:root {
				color-scheme: light;
				--bg: #f6f7f9;
				--panel: #ffffff;
				--ink: #1b1f24;
				--muted: #626b76;
				--line: #d8dee6;
				--accent: #1f6feb;
				--warning-bg: #fff8e6;
				--warning-line: #d29922;
			}

			* {
				box-sizing: border-box;
			}

			body {
				margin: 0;
				background: var(--bg);
				color: var(--ink);
				font-family:
					Inter,
					ui-sans-serif,
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					"Segoe UI",
					sans-serif;
				line-height: 1.5;
			}

			main {
				width: min(1180px, calc(100% - 32px));
				margin: 0 auto;
				padding: 32px 0 56px;
			}

			header {
				margin-bottom: 28px;
				padding-bottom: 20px;
				border-bottom: 1px solid var(--line);
			}

			h1,
			h2,
			p {
				margin-top: 0;
			}

			h1 {
				margin-bottom: 8px;
				font-size: clamp(2rem, 5vw, 3.5rem);
				line-height: 1.05;
				letter-spacing: 0;
			}

			header p {
				max-width: 820px;
				margin-bottom: 16px;
				color: var(--muted);
				font-size: 1rem;
			}

			.summary {
				display: flex;
				flex-wrap: wrap;
				gap: 10px;
			}

			.summary span,
			.status {
				display: inline-flex;
				align-items: center;
				min-height: 30px;
				padding: 4px 10px;
				border: 1px solid var(--line);
				border-radius: 6px;
				background: var(--panel);
				color: var(--muted);
				font-size: 0.88rem;
				font-weight: 600;
			}

			section {
				margin-top: 32px;
			}

			.section-title {
				margin-bottom: 14px;
			}

			.section-title h2 {
				margin-bottom: 4px;
				font-size: 1.35rem;
				letter-spacing: 0;
			}

			.section-title p,
			.endpoint p,
			.muted {
				color: var(--muted);
			}

			.endpoint-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
				gap: 12px;
			}

			.endpoint {
				min-width: 0;
				padding: 16px;
				border: 1px solid var(--line);
				border-radius: 8px;
				background: var(--panel);
			}

			.endpoint.not-ready {
				border-color: var(--warning-line);
				background: var(--warning-bg);
			}

			.endpoint-header {
				display: flex;
				align-items: center;
				flex-wrap: wrap;
				gap: 8px;
				margin-bottom: 10px;
			}

			.method {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				min-width: 64px;
				min-height: 28px;
				padding: 3px 8px;
				border-radius: 6px;
				background: #24292f;
				color: #fff;
				font-size: 0.78rem;
				font-weight: 800;
			}

			.method-get {
				background: #116329;
			}

			.method-post {
				background: #1f6feb;
			}

			.method-put,
			.method-patch {
				background: #9a6700;
			}

			.method-delete {
				background: #cf222e;
			}

			code {
				max-width: 100%;
				overflow-wrap: anywhere;
				font-family:
					"SFMono-Regular",
					Consolas,
					"Liberation Mono",
					monospace;
				font-size: 0.92rem;
			}

			.meta {
				display: grid;
				gap: 6px;
				margin: 12px 0;
				color: var(--muted);
				font-size: 0.92rem;
			}

			.payload,
			.notes {
				margin: 10px 0 0;
				padding-left: 20px;
			}

			.payload li,
			.notes li {
				margin: 4px 0;
			}

			details {
				margin-top: 12px;
			}

			summary {
				cursor: pointer;
				color: var(--accent);
				font-weight: 700;
			}

			pre {
				max-width: 100%;
				overflow: auto;
				margin: 10px 0 0;
				padding: 12px;
				border-radius: 6px;
				background: #0d1117;
				color: #e6edf3;
				font-size: 0.82rem;
			}

			.form-data-example {
				width: 100%;
				margin-top: 10px;
				border-collapse: collapse;
				font-size: 0.86rem;
			}

			.form-data-example th,
			.form-data-example td {
				padding: 8px;
				border: 1px solid var(--line);
				text-align: left;
				vertical-align: top;
			}

			.form-data-example th {
				background: #f0f3f6;
				color: var(--muted);
			}
		</style>
	</head>
	<body>
		<main>
			<header>
				<h1>CPSU Scholarship API Reference</h1>
				<p>
					This page documents the live route handlers under <code>server/routes/api</code>.
					Protected routes require the Supabase auth cookies set by login unless marked public.
					Request bodies are camelCase; response data is returned in the standard API envelope.
				</p>
				<div class="summary">
					<span>${readyCount} usable endpoints</span>
					<span>${countEndpoints('not-ready')} not-ready route stubs</span>
					<span>JSON and multipart bodies are parsed by requestBody()</span>
				</div>
			</header>
			${apiGroups.map(renderGroup).join('')}
		</main>
	</body>
</html>`;
}

export default defineHandler(() => {
	return new Response(renderHtml(), {
		headers: { 'Content-Type': 'text/html; charset=utf-8' },
	});
});
