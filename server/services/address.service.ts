import { addresses, db, type NewAddress } from '../db';

export const addressService = {
	async create(address: NewAddress) {
		return await db.insert(addresses).values(address).returning();
	},
};
