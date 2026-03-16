import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../utils/env';
import postgres from 'postgres';

const connectionString = env.DATABASE_URL;

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);

export type DB = typeof db;
