import { applicationStatusHistory, db, type NewApplicationStatusHistory } from '../db';

export const applicationStatusHistoryService = {
	async create(
		input: NewApplicationStatusHistory,
		executor: typeof db | any = db,
	) {
		const [statusHistory] = await executor
			.insert(applicationStatusHistory)
			.values(input)
			.returning();

		return statusHistory;
	},
};
