import * as p from 'drizzle-orm/pg-core';

const authSchema = p.pgSchema('auth');

export const authUsers = authSchema.table('users', {
	id: p.uuid().primaryKey().notNull(),
});
