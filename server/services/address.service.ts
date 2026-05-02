import { eq } from 'drizzle-orm';
import { addresses, db, type NewAddress } from '../db';
import type { CreateAddressInput } from '#server/validators/address.validator.ts';

export const addressService = {
	async create(address: NewAddress) {
		return await db.insert(addresses).values(address).returning();
	},

	async upsertForStudent(
		studentId: string,
		input: Omit<CreateAddressInput, 'studentId' | 'personnelId'>,
		executor: typeof db | any = db,
	) {
		const values = {
			studentId,
			street: input.street,
			barangay: input.barangay,
			city: input.city,
			province: input.province,
			zipcode: input.zipcode,
		} satisfies NewAddress;

		const existing = await executor.query.addresses.findFirst({
			where: eq(addresses.studentId, studentId),
		});

		const [address] = existing
			? await executor
					.update(addresses)
					.set(values)
					.where(eq(addresses.studentId, studentId))
					.returning()
			: await executor.insert(addresses).values(values).returning();

		return address;
	},
};
