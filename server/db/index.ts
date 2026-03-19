import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../utils/env';
import * as schema from './schema/schema-index';

// ─────────────────────────────────────────────
// Postgres connection
//
// ⚠️  `prepare: false` is REQUIRED for Supabase.
//     Supabase uses PgBouncer in transaction mode
//     even on the direct port, and prepared statements
//     are not supported in that mode.
// ─────────────────────────────────────────────
const client = postgres(env.DATABASE_URL, {
	prepare: false,

	// Caps the connection pool — fine for 1–2 dev team on edge deployment.
	// Increase if you see connection timeout errors under load.
	max: 10,
});

// ─────────────────────────────────────────────
// Drizzle instance
//
// Passing `schema` enables the relational query API:
//   db.query.students.findFirst({ with: { applications: true } })
//
// The schema object must include both table definitions
// AND the relations() calls — both are in schema/index.ts.
// ─────────────────────────────────────────────
export const db = drizzle(client, { schema });

// Convenience type — use in service function signatures
// to accept the db instance (useful for transaction contexts).
export type DB = typeof db;

// Re-export schema so services can import from one place:
//   import { db, students, applications } from '../db';
export * from './schema/schema-index';
