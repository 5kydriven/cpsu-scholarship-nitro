import * as p from 'drizzle-orm/pg-core';

export const semesterEnum = p.pgEnum('semester', ['1', '2']);

export const scholarshipOfferingStatusEnum = p.pgEnum(
	'scholarship_offering_status',
	['draft', 'open', 'closed', 'archived'],
);

export const applicationStatusEnum = p.pgEnum('application_status', [
	'pending',
	'under_review',
	'approved',
	'rejected',
	'cancelled',
]);

export const scholarStatusEnum = p.pgEnum('scholar_status', [
	'active',
	'inactive',
	'completed',
	'revoked',
]);

export const payoutStatusEnum = p.pgEnum('payout_status', [
	'pending',
	'released',
	'cancelled',
]);
