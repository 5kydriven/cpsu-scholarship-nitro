type AnyRecord = Record<string, unknown>;

const TDP_EXTRA_KEYS = [
	'siblings',
	'financialAid',
	'citizenship',
	'schoolName',
	'schoolId',
	'schoolAddress',
	'schoolSector',
] as const;

const TES_EXTRA_KEYS = ['disability', 'indigenous', 'fourPs', 'grades'] as const;

function isRecord(value: unknown): value is AnyRecord {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getPath(source: unknown, path: string): unknown {
	if (!isRecord(source)) return undefined;

	let current: unknown = source;

	for (const segment of path.split('.')) {
		if (!isRecord(current) || !(segment in current)) return undefined;
		current = current[segment];
	}

	return current;
}

function firstValue(source: unknown, paths: string[]) {
	for (const path of paths) {
		const value = getPath(source, path);
		if (value !== undefined && value !== null && value !== '') return value;
	}

	return undefined;
}

function setIfPresent(target: AnyRecord, key: string, value: unknown) {
	if (value !== undefined && value !== null && value !== '') {
		target[key] = value;
	}
}

function mergeRecord(value: unknown): AnyRecord {
	return isRecord(value) ? { ...value } : {};
}

function normalizeParent(source: unknown, type: 'father' | 'mother') {
	const parent = mergeRecord(getPath(source, type));
	const prefix = type;
	const title = type === 'father' ? 'father' : 'mother';

	const normalized: AnyRecord = {
		type,
		...parent,
	};

	setIfPresent(normalized, 'firstName', firstValue(source, [
		`${type}.firstName`,
		`${type}.${title}FirstName`,
		`${title}FirstName`,
	]));
	setIfPresent(normalized, 'lastName', firstValue(source, [
		`${type}.lastName`,
		`${type}.${title}LastName`,
		`${title}LastName`,
	]));
	setIfPresent(normalized, 'middleName', firstValue(source, [
		`${type}.middleName`,
		`${type}.${title}MiddleName`,
		`${title}MiddleName`,
	]));
	setIfPresent(normalized, 'occupation', firstValue(source, [
		`${type}.occupation`,
		`${type}.${prefix}Occupation`,
		`${prefix}Occupation`,
	]));
	setIfPresent(normalized, 'monthlyIncome', firstValue(source, [
		`${type}.monthlyIncome`,
		`${type}.income`,
		`${type}.${prefix}Income`,
		`${prefix}Income`,
	]));
	setIfPresent(normalized, 'status', firstValue(source, [
		`${type}.status`,
		`${type}.${prefix}Status`,
		`${prefix}Status`,
	]));
	setIfPresent(normalized, 'contactNumber', firstValue(source, [
		`${type}.contactNumber`,
		`${type}.mobile`,
		`${prefix}ContactNumber`,
	]));
	setIfPresent(normalized, 'email', firstValue(source, [
		`${type}.email`,
		`${prefix}Email`,
	]));

	return normalized;
}

function normalizeParents(source: unknown): unknown[] | undefined {
	const existingParents = getPath(source, 'parents');
	if (Array.isArray(existingParents)) return existingParents;

	const parents = ['father', 'mother']
		.map((type) => normalizeParent(source, type as 'father' | 'mother'))
		.filter((parent) => parent.firstName || parent.lastName);

	return parents.length ? parents : undefined;
}

function normalizeProfile(source: unknown) {
	const existingProfile = mergeRecord(getPath(source, 'profile'));
	const profile: AnyRecord = { ...existingProfile };

	setIfPresent(profile, 'studentId', firstValue(source, [
		'profile.studentId',
		'student.studentId',
		'studentId',
		'studentNumber',
		'schoolStudentId',
	]));
	setIfPresent(profile, 'firstName', firstValue(source, [
		'profile.firstName',
		'student.firstName',
		'firstName',
	]));
	setIfPresent(profile, 'lastName', firstValue(source, [
		'profile.lastName',
		'student.lastName',
		'lastName',
	]));
	setIfPresent(profile, 'middleName', firstValue(source, [
		'profile.middleName',
		'student.middleName',
		'middleName',
	]));
	setIfPresent(profile, 'birthdate', firstValue(source, [
		'profile.birthdate',
		'student.birthdate',
		'birthdate',
	]));
	setIfPresent(profile, 'birthplace', firstValue(source, [
		'profile.birthplace',
		'student.birthplace',
		'birthplace',
	]));
	setIfPresent(profile, 'sex', firstValue(source, [
		'profile.sex',
		'student.sex',
		'sex',
	]));
	setIfPresent(profile, 'contactNumber', firstValue(source, [
		'profile.contactNumber',
		'student.contactNumber',
		'student.mobile',
		'contact.contactNumber',
		'contactNumber',
	]));
	setIfPresent(profile, 'email', firstValue(source, [
		'profile.email',
		'student.email',
		'contact.email',
		'email',
	]));
	setIfPresent(profile, 'yearLevel', firstValue(source, [
		'profile.yearLevel',
		'student.yearLevel',
		'school.yearLevel',
		'yearLevel',
	]));
	setIfPresent(profile, 'courseId', firstValue(source, [
		'profile.courseId',
		'student.courseId',
		'school.courseId',
		'courseId',
	]));

	const existingAddress = mergeRecord(profile.address);
	const address: AnyRecord = { ...existingAddress };
	setIfPresent(address, 'street', firstValue(source, [
		'profile.address.street',
		'address.street',
		'address.streetBarangay',
	]));
	setIfPresent(address, 'barangay', firstValue(source, [
		'profile.address.barangay',
		'address.barangay',
		'address.streetBarangay',
	]));
	setIfPresent(address, 'city', firstValue(source, [
		'profile.address.city',
		'address.city',
	]));
	setIfPresent(address, 'province', firstValue(source, [
		'profile.address.province',
		'address.province',
	]));
	setIfPresent(address, 'zipcode', firstValue(source, [
		'profile.address.zipcode',
		'profile.address.zipCode',
		'address.zipcode',
		'address.zipCode',
	]));
	if (Object.keys(address).length) profile.address = address;

	const parents = normalizeParents(source);
	if (parents) profile.parents = parents;

	return Object.keys(profile).length ? profile : undefined;
}

function normalizeExtraAnswers(source: unknown) {
	const extraAnswers = mergeRecord(getPath(source, 'extraAnswers'));

	for (const key of TDP_EXTRA_KEYS) {
		setIfPresent(extraAnswers, key, firstValue(source, [
			`extraAnswers.${key}`,
			`school.${key}`,
			key,
		]));
	}

	for (const key of TES_EXTRA_KEYS) {
		setIfPresent(extraAnswers, key, firstValue(source, [
			`extraAnswers.${key}`,
			`student.${key}`,
			key,
		]));
	}

	setIfPresent(extraAnswers, 'courseText', firstValue(source, [
		'extraAnswers.courseText',
		'student.program',
		'school.course',
		'program',
		'course',
	]));

	return extraAnswers;
}

export function normalizeScholarshipApplicationPayload(payload: unknown) {
	const normalized: AnyRecord = {
		...(isRecord(payload) ? payload : {}),
	};

	const profile = normalizeProfile(payload);
	if (profile) normalized.profile = profile;

	normalized.extraAnswers = normalizeExtraAnswers(payload);
	normalized.studentId = firstValue(payload, [
		'studentId',
		'profile.studentId',
		'student.studentId',
		'studentNumber',
		'schoolStudentId',
	]);
	normalized.offeringId = firstValue(payload, ['offeringId', 'offering.id']);
	normalized.documents = firstValue(payload, ['documents']) ?? [];

	return normalized;
}
