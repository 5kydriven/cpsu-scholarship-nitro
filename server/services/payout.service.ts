import { and, asc, count, desc, eq, inArray, SQL, sum } from 'drizzle-orm';
import {
	db,
	payouts,
	scholars,
	scholarshipOfferings,
	type NewPayout,
} from '../db';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from '#server/utils/errors.ts';
import { buildMeta, toOffset } from '#server/utils/pagination.ts';
import type {
	ConfirmPayoutReceiptInput,
	PayoutQuery,
	ReleasePayoutInput,
} from '#server/validators/payout.validator.ts';

function toCents(amount: string): number {
	return Math.round(Number(amount) * 100);
}

function fromCents(cents: number): string {
	return (cents / 100).toFixed(2);
}

function splitAmount(totalAmount: string, count: number): string[] {
	const totalCents = toCents(totalAmount);
	const base = Math.floor(totalCents / count);
	const remainder = totalCents % count;

	return Array.from({ length: count }, (_, index) =>
		fromCents(base + (index < remainder ? 1 : 0)),
	);
}

export const payoutService = {
	async generateForOffering(offeringId: string) {
		const offering = await db.query.scholarshipOfferings.findFirst({
			where: eq(scholarshipOfferings.id, offeringId),
			with: {
				program: true,
			},
		});

		if (!offering) throw new NotFoundError('Scholarship offering');

		const offeringScholars = await db.query.scholars.findMany({
			where: and(
				eq(scholars.offeringId, offeringId),
				eq(scholars.status, 'active'),
			),
			orderBy: asc(scholars.createdAt),
		});

		if (!offeringScholars.length) {
			throw new BadRequestError('No approved scholars found for this offering');
		}

		const scholarIds = offeringScholars.map((scholar) => scholar.id);
		const existingPayouts = await db.query.payouts.findMany({
			where: and(
				inArray(payouts.scholarId, scholarIds),
				eq(payouts.academicYear, offering.academicYear),
				eq(payouts.semester, offering.semester),
			),
		});

		if (existingPayouts.length) {
			throw new ConflictError(
				'Payouts were already generated for this offering',
			);
		}

		const amounts = splitAmount(
			offering.allocatedBudget,
			offeringScholars.length,
		);

		const rows = offeringScholars.map(
			(scholar, index) =>
				({
					scholarId: scholar.id,
					academicYear: offering.academicYear,
					semester: offering.semester,
					amount: amounts[index] ?? '',
					status: 'pending',
				}) satisfies NewPayout,
		);

		return await db.insert(payouts).values(rows).returning();
	},

	async release(id: string, personnelId: string, input: ReleasePayoutInput) {
		const payout = await db.query.payouts.findFirst({
			where: eq(payouts.id, id),
		});

		if (!payout) throw new NotFoundError('Payout');
		if (payout.status !== 'pending') {
			throw new ConflictError('Only pending payouts can be released');
		}

		const [released] = await db
			.update(payouts)
			.set({
				status: 'released',
				releasedAt: new Date().toISOString(),
				processedBy: personnelId,
				remarks: input.remarks,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(payouts.id, id))
			.returning();

		return released;
	},

	async confirmReceipt(
		id: string,
		studentId: string,
		input: ConfirmPayoutReceiptInput,
	) {
		const payout = await db.query.payouts.findFirst({
			where: eq(payouts.id, id),
			with: {
				scholar: true,
			},
		});

		if (!payout) throw new NotFoundError('Payout');
		if (payout.scholar.studentId !== studentId) {
			throw new ForbiddenError('You can only confirm your own payout');
		}
		if (payout.status !== 'released') {
			throw new ConflictError('Only released payouts can be confirmed');
		}

		const now = new Date().toISOString();
		const [received] = await db
			.update(payouts)
			.set({
				status: 'received',
				checkNumber: input.checkNumber,
				receivedAt: now,
				updatedAt: now,
			})
			.where(eq(payouts.id, id))
			.returning();

		return received;
	},

	async list(query: PayoutQuery) {
		const { page, limit, sortOrder, status, offeringId, studentId } = query;
		const conditions: SQL[] = [];

		if (status) conditions.push(eq(payouts.status, status));

		if (offeringId || studentId) {
			const scholarConditions: SQL[] = [];
			if (offeringId)
				scholarConditions.push(eq(scholars.offeringId, offeringId));
			if (studentId) scholarConditions.push(eq(scholars.studentId, studentId));

			const matchedScholars = await db
				.select({ id: scholars.id })
				.from(scholars)
				.where(and(...scholarConditions));

			conditions.push(
				matchedScholars.length
					? inArray(
							payouts.scholarId,
							matchedScholars.map((scholar) => scholar.id),
						)
					: eq(payouts.scholarId, crypto.randomUUID()),
			);
		}

		const where = conditions.length ? and(...conditions) : undefined;
		const order =
			sortOrder === 'desc' ? desc(payouts.createdAt) : asc(payouts.createdAt);

		const [countResult] = await db
			.select({ total: count() })
			.from(payouts)
			.where(where);

		const data = await db.query.payouts.findMany({
			where,
			with: {
				scholar: {
					with: {
						student: true,
						offering: {
							with: {
								program: true,
							},
						},
					},
				},
				processor: true,
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

	async listByStudent(studentId: string) {
		const studentScholars = await db
			.select({ id: scholars.id })
			.from(scholars)
			.where(eq(scholars.studentId, studentId));
		const scholarIds = studentScholars.map((scholar) => scholar.id);

		if (!scholarIds.length) {
			return {
				payouts: [],
				totalReceived: '0.00',
			};
		}

		const studentPayouts = await db.query.payouts.findMany({
			where: inArray(payouts.scholarId, scholarIds),
			with: {
				scholar: {
					with: {
						offering: {
							with: {
								program: true,
							},
						},
					},
				},
			},
			orderBy: desc(payouts.createdAt),
		});

		const [total] = await db
			.select({ received: sum(payouts.amount) })
			.from(payouts)
			.where(
				and(
					inArray(payouts.scholarId, scholarIds),
					eq(payouts.status, 'received'),
				),
			);

		return {
			payouts: studentPayouts,
			totalReceived: total?.received ?? '0.00',
		};
	},
};
