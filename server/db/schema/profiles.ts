import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['user', 'admin']);

// id = Supabase auth.users.id — same UUID, no foreign key needed
export const profiles = pgTable('profiles', {
	id: uuid('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	role: roleEnum('role').default('user').notNull(),
	avatarUrl: text('avatar_url'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
