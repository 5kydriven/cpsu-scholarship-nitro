# Nitro v3 Backend — Architecture & Coding Standards

> **Stack**: Nitro v3 · H3 v2 · Drizzle ORM · Supabase · Zod · Nodemailer  
> **Team size**: 1–2 developers  
> **Deployment**: Vercel / Netlify Edge  
> **Last updated**: March 2026 (Nitro v3 Beta)

---

## Table of Contents

1. [Stack & Tools](#1-stack--tools)
2. [Why Nitro v3 Changes Things](#2-why-nitro-v3-changes-things)
3. [Project Structure](#3-project-structure)
4. [Architecture Philosophy](#4-architecture-philosophy)
5. [Environment Variables](#5-environment-variables)
6. [Database — Drizzle + Supabase](#6-database--drizzle--supabase)
7. [Auth — Supabase Handles It](#7-auth--supabase-handles-it)
8. [Middleware](#8-middleware)
9. [Services](#9-services)
10. [Route Handlers](#10-route-handlers)
11. [Validation — Zod](#11-validation--zod)
12. [Pagination & Filtering](#12-pagination--filtering)
13. [Error Handling](#13-error-handling)
14. [Responses](#14-responses)
15. [Cron / Scheduled Tasks](#15-cron--scheduled-tasks)
16. [Webhooks](#16-webhooks)
17. [Mailing](#17-mailing)
18. [Config](#18-config)
19. [Coding Rules](#19-coding-rules)

---

## 1. Stack & Tools

| Layer            | Tool                            | Notes                                                   |
| ---------------- | ------------------------------- | ------------------------------------------------------- |
| Server framework | `nitro` v3                      | Replaces `nitropack`. Use `nitro/*` imports             |
| HTTP layer       | H3 v2                           | Web-standard `Request` / `Response`. No more H3 helpers |
| ORM              | `drizzle-orm` + `drizzle-kit`   | SQL-native, great TS inference                          |
| Database         | PostgreSQL via Supabase         | Direct connection string for Drizzle                    |
| Auth             | Supabase Auth                   | JWT issued by Supabase, verified server-side            |
| Supabase client  | `@supabase/supabase-js`         | Auth operations only                                    |
| Validation       | `zod`                           | Schema-first, used for body + query + env               |
| Mailing          | `nodemailer`                    | SMTP, fire-and-forget                                   |
| Cron             | Nitro built-in `scheduledTasks` | No `node-cron` needed in v3                             |
| Logging          | `console` + structured errors   | Pino optional for production                            |
| Package          | `nitro` (NOT `nitropack`)       | v3 is a new npm package                                 |

### Install

```bash
npm install nitro drizzle-orm drizzle-kit pg @supabase/supabase-js zod nodemailer
npm install -D @types/pg @types/nodemailer tsx
```

---

## 2. Why Nitro v3 Changes Things

Nitro v3 (Beta, March 2026) is a ground-up rewrite. Key differences from v2:

### New package name

```ts
// ❌ v2
import { defineNitroConfig } from 'nitropack';
import { defineEventHandler } from 'h3';

// ✅ v3
import { defineNitroConfig } from 'nitro/config';
import { defineHandler } from 'nitro';
```

### H3 v2 — Web Standard APIs

```ts
// ❌ v2 (H3 helpers)
const body = await readBody(event);
const query = getQuery(event);
const header = getRequestHeader(event, 'authorization');

// ✅ v3 (Web standard)
const body = await event.req.json();
const url = new URL(event.req.url);
const params = url.searchParams;
const header = event.req.headers.get('authorization');
```

### Built-in Scheduled Tasks (replaces node-cron)

```ts
// nitro.config.ts
scheduledTasks: {
  '0 0 * * *': 'cleanup:sessions',
}
```

### Route handlers use `defineHandler`

```ts
import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
	return { ok: true };
});
```

### No runtime router — each route is its own chunk loaded on demand.

---

## 3. Project Structure

```
nitro-app/
├── server/
│   ├── routes/
│   │   └── api/
│   │       ├── auth/
│   │       │   └── me.get.ts
│   │       ├── users/
│   │       │   ├── index.get.ts
│   │       │   ├── index.post.ts
│   │       │   └── [id].get.ts
│   │       ├── webhooks/
│   │       │   └── stripe.post.ts
│   │       └── health.get.ts
│   ├── middleware/
│   │   ├── 01.logger.ts
│   │   └── 02.auth.ts
│   ├── services/               ← Business logic lives here
│   │   ├── user.service.ts
│   │   ├── mail.service.ts
│   │   └── webhook.service.ts
│   ├── db/
│   │   ├── index.ts            ← Drizzle client
│   │   └── schema/
│   │       ├── index.ts
│   │       └── profiles.ts
│   ├── tasks/                  ← Nitro v3 scheduled tasks
│   │   ├── cleanup-sessions.ts
│   │   └── process-mail-queue.ts
│   ├── plugins/
│   │   └── db.ts               ← DB connection check on startup
│   ├── lib/
│   │   └── supabase.ts         ← Supabase client instances
│   ├── validators/
│   │   ├── user.validator.ts
│   │   └── shared.validator.ts ← Pagination, search reusables
│   ├── utils/
│   │   ├── env.ts
│   │   ├── errors.ts
│   │   └── response.ts
│   └── types/
│       └── index.ts            ← H3EventContext extensions
├── drizzle/
│   └── migrations/
├── drizzle.config.ts
├── nitro.config.ts
└── package.json
```

### No repository layer

With 1–2 devs, a separate repository layer adds indirection without meaningful benefit. All DB access goes directly in services using Drizzle. If a query is reused across services, extract it as a named function in `db/queries/`.

---

## 4. Architecture Philosophy

```
Request
  → middleware (auth check, logging)
  → route handler (validate input → call service → return response)
  → service (business logic + DB via Drizzle)
  → Response
```

**Rules:**

- Routes are HTTP boundaries only — no business logic
- Services own all logic — DB queries, mail, side effects
- Zod validates everything that comes in (body, query, env)
- All errors are `AppError` instances — never throw raw strings
- All responses follow the same shape via `successResponse` / `handleError`

---

## 5. Environment Variables

### `server/utils/env.ts`

```ts
import { z } from 'zod';

const envSchema = z.object({
	// Supabase
	SUPABASE_URL: z.string().url(),
	SUPABASE_ANON_KEY: z.string(),
	SUPABASE_SERVICE_ROLE_KEY: z.string(),

	// Drizzle — use direct connection (port 5432), not pooler
	DATABASE_URL: z.string().url(),

	// Mail
	SMTP_HOST: z.string(),
	SMTP_PORT: z.coerce.number().default(587),
	SMTP_USER: z.string(),
	SMTP_PASS: z.string(),
	MAIL_FROM: z.string().email(),

	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('❌ Invalid environment variables:');
	console.error(parsed.error.flatten().fieldErrors);
	process.exit(1);
}

export const env = parsed.data;
```

### `.env`

```env
# Supabase
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Drizzle — ALWAYS use direct (port 5432), not pooler
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Mail
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=yourpassword
MAIL_FROM=no-reply@yourdomain.com
```

> ⚠️ Never use the Supabase connection pooler URL for Drizzle — it breaks migrations.

---

## 6. Database — Drizzle + Supabase

### `server/db/schema/profiles.ts`

```ts
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
```

### `server/db/schema/index.ts`

```ts
// Always use explicit named exports — export * causes Drizzle query client conflicts
export { profiles, roleEnum, type Profile, type NewProfile } from './profiles';
```

### `server/db/index.ts`

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../utils/env';
import postgres from 'postgres';

const connectionString = env.DATABASE_URL;

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);

export type DB = typeof db;
```

### `drizzle.config.ts`

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './server/db/schema/index.ts',
	out: './drizzle/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
```

### Migration commands

```bash
npx drizzle-kit generate   # generate migration from schema changes
npx drizzle-kit migrate    # apply migrations
npx drizzle-kit studio     # visual DB browser
```

---

## 7. Auth — Supabase Handles It

Supabase issues and manages JWTs. Your server only verifies them.

**Flow:**

```
Client → POST /api/auth/sign-in (via Supabase JS SDK on client)
Supabase → returns { access_token, refresh_token }
Client → sends Authorization: Bearer <access_token> on every request
Middleware → calls supabase.auth.getUser(token) → attaches user to event.context
```

You do **not** manage sessions, tokens, or password hashing. Supabase owns that entirely.

### `server/lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js';
import { env } from '../utils/env';

// Standard client — respects RLS
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Admin client — bypasses RLS, server-side only
export const supabaseAdmin = createClient(
	env.SUPABASE_URL,
	env.SUPABASE_SERVICE_ROLE_KEY,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	},
);
```

### `server/types/h3.d.ts`

```ts
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../db/schema';

declare module 'h3' {
	interface H3EventContext {
		user: User; // Supabase auth user
		profile: Profile; // Your app profile from DB
	}
}
```

### `server/routes/api/auth/me.get.ts`

```ts
import { defineHandler } from 'nitro';
import { successResponse, handleError } from '../../../utils/response';

// Middleware already verified token and attached context
export default defineHandler(async (event) => {
	try {
		return successResponse({
			user: event.context.user,
			profile: event.context.profile,
		});
	} catch (err) {
		return handleError(event, err);
	}
});
```

> Auth endpoints (sign-up, sign-in, sign-out, refresh) are handled by Supabase directly on the client via `@supabase/supabase-js`. You do not need server routes for these.

---

## 8. Middleware

Files in `middleware/` are numbered to enforce execution order.

### `server/middleware/01.logger.ts`

```ts
import { defineHandler } from 'nitro';

export default defineHandler((event) => {
	const start = Date.now();
	const method = event.req.method;
	const url = new URL(event.req.url).pathname;

	// Log after response
	event.node?.res?.on('finish', () => {
		const status = event.node?.res?.statusCode ?? 0;
		const ms = Date.now() - start;
		console.log(`[${method}] ${url} → ${status} (${ms}ms)`);
	});
});
```

### `server/middleware/02.auth.ts`

```ts
import { defineHandler } from 'nitro';
import { supabase } from '../lib/supabase';
import { db } from '../db';
import { profiles } from '../db/schema';
import { eq } from 'drizzle-orm';
import { UnauthorizedError } from '../utils/errors';
import { handleError } from '../utils/response';

const PUBLIC_ROUTES = ['/api/health', '/api/webhooks'];

export default defineHandler(async (event) => {
	const url = new URL(event.req.url);
	const path = url.pathname;

	if (PUBLIC_ROUTES.some((r) => path.startsWith(r))) return;

	const authHeader = event.req.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return handleError(event, new UnauthorizedError('Missing token'));
	}

	const token = authHeader.slice(7);

	// Supabase verifies the JWT — no manual jwt.verify needed
	const { data, error } = await supabase.auth.getUser(token);

	if (error || !data.user) {
		return handleError(
			event,
			new UnauthorizedError('Invalid or expired token'),
		);
	}

	event.context.user = data.user;

	// Attach app profile
	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.id, data.user.id),
	});

	if (!profile) {
		return handleError(event, new UnauthorizedError('Profile not found'));
	}

	event.context.profile = profile;
});
```

### Route-scoped middleware (admin only)

For admin routes, use Nitro's `handlers` config instead of a global middleware file:

```ts
// nitro.config.ts
handlers: [
	{
		route: '/api/admin/**',
		handler: './server/middleware/admin-guard.ts',
		middleware: true,
	},
];
```

```ts
// server/middleware/admin-guard.ts
import { defineHandler } from 'nitro';
import { AppError } from '../utils/errors';
import { handleError } from '../utils/response';

export default defineHandler(async (event) => {
	const profile = event.context.profile;
	if (!profile || profile.role !== 'admin') {
		return handleError(event, new AppError(403, 'Forbidden', 'FORBIDDEN'));
	}
});
```

---

## 9. Services

Services own all business logic. They use Drizzle directly — no repository layer.

### `server/services/user.service.ts`

```ts
import { eq, ilike, and, asc, desc, count, or, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { profiles, type NewProfile } from '../db/schema';
import { mailService } from './mail.service';
import { NotFoundError, AppError } from '../utils/errors';
import { buildMeta, toOffset } from '../utils/pagination';
import type {
	CreateUserInput,
	UpdateUserInput,
	UserQuery,
} from '../validators/user.validator';

export const userService = {
	async getById(id: string) {
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.id, id),
		});
		if (!profile) throw new NotFoundError('User');
		return profile;
	},

	async getAll(query: UserQuery) {
		const { page, limit, sortBy, sortOrder, q, role } = query;
		const offset = toOffset(page, limit);

		const conditions: SQL[] = [];

		if (q) {
			conditions.push(
				or(ilike(profiles.name, `%${q}%`), ilike(profiles.email, `%${q}%`))!,
			);
		}

		if (role) {
			conditions.push(eq(profiles.role, role));
		}

		const where = conditions.length ? and(...conditions) : undefined;

		const sortColumn =
			{
				name: profiles.name,
				email: profiles.email,
				createdAt: profiles.createdAt,
			}[sortBy] ?? profiles.createdAt;

		const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

		const [data, [{ value: total }]] = await Promise.all([
			db
				.select()
				.from(profiles)
				.where(where)
				.orderBy(orderBy)
				.limit(limit)
				.offset(offset),
			db.select({ value: count() }).from(profiles).where(where),
		]);

		return { data, meta: buildMeta(total, page, limit) };
	},

	async create(id: string, input: CreateUserInput) {
		const existing = await db.query.profiles.findFirst({
			where: eq(profiles.email, input.email),
		});
		if (existing) throw new AppError(409, 'Email already in use', 'CONFLICT');

		const [profile] = await db
			.insert(profiles)
			.values({
				id, // Supabase auth UID
				email: input.email,
				name: input.name,
			})
			.returning();

		mailService.sendWelcome(profile.email, profile.name).catch(console.error);
		return profile;
	},

	async update(id: string, input: UpdateUserInput) {
		const existing = await db.query.profiles.findFirst({
			where: eq(profiles.id, id),
		});
		if (!existing) throw new NotFoundError('User');

		const [profile] = await db
			.update(profiles)
			.set({ ...input, updatedAt: new Date() })
			.where(eq(profiles.id, id))
			.returning();

		return profile;
	},

	async delete(id: string) {
		const existing = await db.query.profiles.findFirst({
			where: eq(profiles.id, id),
		});
		if (!existing) throw new NotFoundError('User');

		const [profile] = await db
			.delete(profiles)
			.where(eq(profiles.id, id))
			.returning();

		return profile;
	},
};
```

---

## 10. Route Handlers

Routes are thin. They: validate → call service → respond. Nothing else.

### `server/routes/api/users/index.get.ts`

```ts
import { defineHandler } from 'nitro';
import { userQuerySchema } from '../../../validators/user.validator';
import { userService } from '../../../services/user.service';
import { successResponse, handleError } from '../../../utils/response';
import { ValidationError } from '../../../utils/errors';

export default defineHandler(async (event) => {
	try {
		const params = new URL(event.req.url).searchParams;
		const parsed = userQuerySchema.safeParse(Object.fromEntries(params));
		if (!parsed.success) throw new ValidationError(parsed.error.flatten());

		const result = await userService.getAll(parsed.data);
		return successResponse(result.data, result.meta);
	} catch (err) {
		return handleError(event, err);
	}
});
```

### `server/routes/api/users/index.post.ts`

```ts
import { defineHandler } from 'nitro';
import { createUserSchema } from '../../../validators/user.validator';
import { userService } from '../../../services/user.service';
import { successResponse, handleError } from '../../../utils/response';
import { ValidationError } from '../../../utils/errors';

export default defineHandler(async (event) => {
	try {
		const body = await event.req.json();
		const parsed = createUserSchema.safeParse(body);
		if (!parsed.success) throw new ValidationError(parsed.error.flatten());

		// Profile is tied to existing Supabase auth user
		const user = event.context.user;
		const profile = await userService.create(user.id, parsed.data);

		return new Response(JSON.stringify(successResponse(profile)), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		return handleError(event, err);
	}
});
```

### `server/routes/api/users/[id].get.ts`

```ts
import { defineHandler } from 'nitro';
import { userService } from '../../../services/user.service';
import { successResponse, handleError } from '../../../utils/response';

export default defineHandler(async (event) => {
	try {
		const { id } = event.context.params;
		const user = await userService.getById(id);
		return successResponse(user);
	} catch (err) {
		return handleError(event, err);
	}
});
```

---

## 11. Validation — Zod

### `server/validators/shared.validator.ts`

```ts
import { z } from 'zod';

export const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const searchSchema = paginationSchema.extend({
	q: z.string().min(1).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
```

### `server/validators/user.validator.ts`

```ts
import { z } from 'zod';
import { searchSchema } from './shared.validator';

export const createUserSchema = z.object({
	email: z.string().email(),
	name: z.string().min(2).max(100),
});

export const updateUserSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	email: z.string().email().optional(),
});

export const userQuerySchema = searchSchema.extend({
	role: z.enum(['user', 'admin']).optional(),
	sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
```

---

## 12. Pagination & Filtering

### `server/utils/pagination.ts`

```ts
export interface PaginatedMeta {
	total: number;
	limit: number;
	page: number;
	pageCount: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface PaginatedResult<T> {
	data: T[];
	meta: PaginatedMeta;
}

export function toOffset(page: number, limit: number): number {
	return (page - 1) * limit;
}

export function buildMeta(
	total: number,
	page: number,
	limit: number,
): PaginatedMeta {
	const pageCount = Math.ceil(total / limit);
	return {
		total,
		limit,
		page,
		pageCount,
		hasNext: page < pageCount,
		hasPrev: page > 1,
	};
}
```

### Response shape

```json
GET /api/users?q=john&page=2&limit=10&sortBy=name&role=admin

{
  "success": true,
  "data": [...],
  "meta": {
    "total": 43,
    "limit": 10,
    "page": 2,
    "pageCount": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## 13. Error Handling

### `server/utils/errors.ts`

```ts
export class AppError extends Error {
	constructor(
		public statusCode: number,
		public message: string,
		public code?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string) {
		super(404, `${resource} not found`, 'NOT_FOUND');
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized') {
		super(401, message, 'UNAUTHORIZED');
	}
}

export class ValidationError extends AppError {
	constructor(details: unknown) {
		super(422, 'Validation failed', 'VALIDATION_ERROR', details);
	}
}
```

---

## 14. Responses

### `server/utils/response.ts`

```ts
import { AppError } from './errors';

export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
	return { success: true, data, ...(meta ? { meta } : {}) };
}

export function handleError(event: unknown, error: unknown): Response {
	if (error instanceof AppError) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: error.code ?? 'ERROR',
					message: error.message,
					...(error.details ? { details: error.details } : {}),
				},
			}),
			{
				status: error.statusCode,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	console.error(error);
	return new Response(
		JSON.stringify({
			success: false,
			error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
		}),
		{ status: 500, headers: { 'Content-Type': 'application/json' } },
	);
}
```

---

## 15. Cron / Scheduled Tasks

Nitro v3 has built-in scheduled tasks via `scheduledTasks` in config. No `node-cron` needed.

### `nitro.config.ts`

```ts
import { defineNitroConfig } from 'nitro/config';

export default defineNitroConfig({
	serverDir: './server',
	scheduledTasks: {
		'0 0 * * *': 'cleanup:sessions', // daily midnight
		'0 * * * *': 'mail:queue', // every hour
		'*/30 * * * *': 'health:check', // every 30 min
	},
});
```

### `server/tasks/cleanup-sessions.ts`

```ts
export default defineTask({
	meta: {
		name: 'cleanup:sessions',
		description: 'Remove expired sessions from DB',
	},
	async run({ payload, context }) {
		const { db } = await import('../db');
		const { sessions } = await import('../db/schema');
		const { lt } = await import('drizzle-orm');

		const deleted = await db
			.delete(sessions)
			.where(lt(sessions.expiresAt, new Date()))
			.returning();

		console.log(`[cron] cleanup:sessions — removed ${deleted.length} sessions`);
		return { success: true, removed: deleted.length };
	},
});
```

### `server/tasks/mail-queue.ts`

```ts
export default defineTask({
	meta: {
		name: 'mail:queue',
		description: 'Process pending mail queue',
	},
	async run() {
		const { mailService } = await import('../services/mail.service');
		await mailService.processQueue();
		return { success: true };
	},
});
```

> Tasks can also be triggered manually via `runTask('cleanup:sessions')` from a route handler — useful for admin panels or one-off operations.

---

## 16. Webhooks

Webhook routes are in `PUBLIC_ROUTES` — they skip auth middleware but verify their own signature.

### `server/routes/api/webhooks/stripe.post.ts`

```ts
import { defineHandler } from 'nitro';
import { env } from '../../../utils/env';
import { handleError } from '../../../utils/response';
import { AppError } from '../../../utils/errors';

export default defineHandler(async (event) => {
	try {
		const sig = event.req.headers.get('stripe-signature');
		const rawBody = await event.req.text();

		if (!sig || !rawBody) {
			throw new AppError(400, 'Missing signature or body', 'BAD_REQUEST');
		}

		// Replace with: stripe.webhooks.constructEvent(rawBody, sig, env.WEBHOOK_SECRET_STRIPE)
		const isValid = verifyStripeSignature(
			rawBody,
			sig,
			env.WEBHOOK_SECRET_STRIPE,
		);
		if (!isValid) {
			throw new AppError(400, 'Invalid webhook signature', 'INVALID_SIGNATURE');
		}

		const payload = JSON.parse(rawBody);
		console.log(`[webhook] stripe: ${payload.type}`);

		switch (payload.type) {
			case 'checkout.session.completed':
				// await orderService.handleCheckout(payload.data.object)
				break;
			case 'customer.subscription.deleted':
				// await subscriptionService.handleCancellation(payload.data.object)
				break;
			default:
				console.log(`[webhook] unhandled: ${payload.type}`);
		}

		return { received: true };
	} catch (err) {
		return handleError(event, err);
	}
});

function verifyStripeSignature(
	body: string,
	sig: string,
	secret: string,
): boolean {
	// Use official stripe SDK in production
	return true;
}
```

---

## 17. Mailing

### `server/services/mail.service.ts`

```ts
import nodemailer from 'nodemailer';
import { env } from '../utils/env';

const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_PORT === 465,
	auth: {
		user: env.SMTP_USER,
		pass: env.SMTP_PASS,
	},
});

export const mailService = {
	async send(to: string, subject: string, html: string) {
		return transporter.sendMail({
			from: env.MAIL_FROM,
			to,
			subject,
			html,
		});
	},

	async sendWelcome(to: string, name: string) {
		return this.send(
			to,
			'Welcome!',
			`<h1>Hey ${name}!</h1><p>Thanks for joining.</p>`,
		);
	},

	async sendPasswordReset(to: string, resetUrl: string) {
		return this.send(
			to,
			'Reset your password',
			`<p>Click <a href="${resetUrl}">here</a> to reset your password. Expires in 1 hour.</p>`,
		);
	},

	// Called by the mail:queue scheduled task
	async processQueue() {
		// Extend with DB-backed queue (e.g. a `mail_queue` table) when needed
		console.log('[mail] processQueue — no pending items');
	},
};
```

> For rich email templates, add `@react-email/components` and render to HTML before passing to `send()`.

---

## 18. Config

### `nitro.config.ts`

```ts
import { defineNitroConfig } from 'nitro/config';

export default defineNitroConfig({
	serverDir: './server',

	scheduledTasks: {
		'0 0 * * *': 'cleanup:sessions',
		'0 * * * *': 'mail:queue',
		'*/30 * * * *': 'health:check',
	},

	routeRules: {
		'/api/**': { cors: true },
		'/api/auth/**': { cors: true },
	},

	// Admin-only middleware scoped to /api/admin
	handlers: [
		{
			route: '/api/admin/**',
			handler: './server/middleware/admin-guard.ts',
			middleware: true,
		},
	],
});
```

### `server/plugins/db.ts`

```ts
export default definePlugin(async () => {
	const { db } = await import('../db');
	try {
		await db.execute('select 1');
		console.log('✅ Database connected');
	} catch (err) {
		console.error('❌ Database connection failed:', err);
		process.exit(1);
	}
});
```

---

## 19. Coding Rules

These are the non-negotiables for consistency across a 1–2 dev team.

### Imports — use `nitro/*` subpaths (v3)

```ts
// ✅
import { defineHandler } from 'nitro';
import { defineNitroConfig } from 'nitro/config';
import { useStorage } from 'nitro/storage';

// ❌ Never
import { defineEventHandler } from 'h3';
import { defineNitroConfig } from 'nitropack';
```

### H3 v2 — use Web Standard APIs

```ts
// ✅
const body = await event.req.json();
const url = new URL(event.req.url);
const q = url.searchParams.get('q');
const token = event.req.headers.get('authorization');

// ❌ Never (H3 v1 helpers)
const body = await readBody(event);
const query = getQuery(event);
const token = getRequestHeader(event, 'authorization');
```

### Schema exports — always explicit, never `export *`

```ts
// ✅ explicit
export { profiles, type Profile, type NewProfile } from './profiles';

// ❌ causes Drizzle query client conflicts
export * from './profiles';
```

### Every route follows this exact pattern

```ts
export default defineHandler(async (event) => {
	try {
		// 1. Parse input (body or searchParams)
		// 2. Validate with zod .safeParse()
		// 3. Call service
		// 4. Return successResponse
	} catch (err) {
		return handleError(event, err);
	}
});
```

### Errors are always AppError subclasses

```ts
// ✅
throw new NotFoundError('User');
throw new AppError(409, 'Email in use', 'CONFLICT');

// ❌
throw new Error('not found');
throw 'something went wrong';
```

### Never access `process.env` directly

```ts
// ✅
import { env } from '../utils/env';
const url = env.SUPABASE_URL;

// ❌
const url = process.env.SUPABASE_URL;
```

### Services — Drizzle directly, no extra repo layer

```ts
// ✅ Drizzle in service
const user = await db.query.profiles.findFirst({ where: eq(profiles.id, id) });

// ❌ unnecessary indirection for 1-2 devs
const user = await userRepository.findById(id);
```

### Fire-and-forget side effects

```ts
// Emails and non-critical tasks should never block the response
mailService.sendWelcome(user.email, user.name).catch(console.error);
```

### Pagination always uses `page`, never raw `offset`

```ts
// ✅ in all list endpoints
?page=1&limit=20&sortBy=createdAt&sortOrder=desc

// ❌ never expose offset to the client
?offset=0&limit=20
```
