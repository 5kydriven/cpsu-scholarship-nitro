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
NODE_ENV=development
APP_URL=http://localhost:3000

SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

SMTP_HOST=smtp.yourmailprovider.com
SMTP_PORT=587
SMTP_USER=you@yourdomain.com
SMTP_PASS=your-smtp-password
MAIL_FROM=no-reply@cpsu-scholarship.edu.ph

STORAGE_BUCKET_DOCUMENTS=http://127.0.0.1:54321/storage/v1/s3

EXPORT_HEADER_TITLE=Central Philippine State University
EXPORT_HEADER_SUBTITLE=Scholarship Management System
```

> ⚠️ Never use the Supabase connection pooler URL for Drizzle — it breaks migrations.

---

## 6. Database — Drizzle + Supabase

### `server/db/index.ts`

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../utils/env';
import * as schema from './schema/index';

const client = postgres(env.DATABASE_URL, {
	prepare: false,
	max: 10,
});

export const db = drizzle(client, { schema });

export type DB = typeof db;

export * from './schema/index';
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

// ─────────────────────────────────────────────
// Standard client — used for auth token verification.
// Respects Row-Level Security (RLS).
// DO NOT use this for admin operations.
// ─────────────────────────────────────────────
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────
// Admin client — bypasses RLS entirely.
// Use ONLY on the server side for:
//   • Creating/deleting auth users (Phase 2 — student registration)
//   • Reading auth.users metadata
//   • Storage operations (Phase 3 — application documents)
// Never expose this client to the frontend.
// ─────────────────────────────────────────────
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

/**
 * Returns the public URL for a file stored in the
 * application-documents bucket (application_documents.file_url).
 *
 * @example
 * const url = getDocumentUrl('disability/abc123.pdf');
 */
export function getDocumentUrl(path: string): string {
	const { data } = supabaseAdmin.storage
		.from(env.STORAGE_BUCKET_DOCUMENTS)
		.getPublicUrl(path);

	return data.publicUrl;
}

/**
 * Uploads a file to the application-documents bucket.
 * Returns the public URL on success, throws on error.
 *
 * Used by: application.service.ts (Phase 3)
 *
 * @param path   Storage path, e.g. `disability/<applicationId>/<filename>`
 * @param file   ArrayBuffer or Blob of the file content
 * @param mime   MIME type, e.g. `application/pdf` or `image/jpeg`
 */
export async function uploadDocument(
	path: string,
	file: ArrayBuffer | Blob,
	mime: string,
): Promise<string> {
	const { error } = await supabaseAdmin.storage
		.from(env.STORAGE_BUCKET_DOCUMENTS)
		.upload(path, file, {
			contentType: mime,
			upsert: false,
		});

	if (error) {
		throw new Error(`Storage upload failed: ${error.message}`);
	}

	return getDocumentUrl(path);
}

export async function deleteDocument(path: string): Promise<void> {
	const { error } = await supabaseAdmin.storage
		.from(env.STORAGE_BUCKET_DOCUMENTS)
		.remove([path]);

	if (error) {
		console.error(`[storage] Failed to delete ${path}:`, error.message);
	}
}
```

### `server/types/h3.d.ts`

```ts
import type { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'student' | 'staff';

export interface AppStudent {
	id: string;
	studentId: string;
	lastName: string;
	givenName: string;
	middleName: string | null;
	extName: string | null;
	sex: string | null;
	birthdate: string | null;
	contactNumber: string | null;
	email: string | null;
	createdAt: string | null;
}

declare module 'h3' {
	interface H3EventContext {
		user: User;
		role: AppRole;
		student: AppStudent | null;
		params: Record<string, string>;
	}
}

import type { H3EventContext } from 'h3';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requireStudent(ctx: H3EventContext): AppStudent {
	if (ctx.role !== 'student' || !ctx.student) {
		throw new UnauthorizedError('Student access required');
	}
	return ctx.student;
}

export function requireAdmin(ctx: H3EventContext): void {
	if (ctx.role !== 'admin') {
		throw new ForbiddenError('Admin access required');
	}
}

export function requireStaffOrAdmin(ctx: H3EventContext): void {
	if (ctx.role !== 'staff' && ctx.role !== 'admin') {
		throw new ForbiddenError('Staff or admin access required');
	}
}

export function isStudentContext(
	ctx: H3EventContext,
): ctx is H3EventContext & { student: AppStudent } {
	return ctx.role === 'student' && ctx.student !== null;
}
```

## 8. Middleware

Files in `middleware/` are numbered to enforce execution order.

### `server/middleware/01.logger.ts`

```ts
import { defineHandler } from 'nitro';
import { isDev } from '../utils/env';

export default defineHandler((event) => {
	const start = Date.now();
	const method = event.req.method;
	const parsedUrl = new URL(event.req.url);
	const path = parsedUrl.pathname;

	const display =
		isDev && parsedUrl.search ? `${path}${parsedUrl.search}` : path;

	event.node?.res?.on('finish', () => {
		const status = event.node?.res?.statusCode ?? 0;
		const ms = Date.now() - start;

		const label = statusLabel(status);

		console.log(`${label} [${method}] ${display} → ${status} (${ms}ms)`);
	});
});

function statusLabel(status: number): string {
	if (status >= 500) return '🔴';
	if (status >= 400) return '🟡';
	if (status >= 300) return '🔵';
	return '🟢';
}
```

### `server/middleware/02.auth.ts`

```ts
import { defineHandler } from 'nitro';
import { eq } from 'drizzle-orm';
import { supabase } from '../lib/supabase';
import { db, students } from '../db';
import { UnauthorizedError } from '../utils/errors';
import { handleError } from '../utils/response';
import type { AppRole } from '../types/h3';

const PUBLIC_ROUTES: string[] = ['/api/health'];

export default defineHandler(async (event) => {
	const url = new URL(event.req.url);
	const path = url.pathname;

	if (PUBLIC_ROUTES.some((r) => path.startsWith(r))) return;

	const authHeader = event.req.headers.get('authorization');

	if (!authHeader?.startsWith('Bearer ')) {
		return handleError(
			event,
			new UnauthorizedError('Missing or malformed Authorization header'),
		);
	}

	const token = authHeader.slice(7);

	const { data, error } = await supabase.auth.getUser(token);

	if (error || !data.user) {
		return handleError(
			event,
			new UnauthorizedError('Invalid or expired token'),
		);
	}

	const authUser = data.user;

	const rawRole = authUser.user_metadata?.role as string | undefined;
	const role: AppRole = rawRole === 'admin' ? 'admin' : 'student';

	event.context.user = authUser;
	event.context.role = role;

	const student = await db.query.students.findFirst({
		where: eq(students.id, authUser.id),
	});

	event.context.student = student ?? null;

	if (role === 'student' && !student) {
		return handleError(
			event,
			new UnauthorizedError(
				'Student profile not found — please complete registration',
			),
		);
	}
});
```

### Route-scoped middleware (admin only)

For admin routes, use Nitro's `handlers` config instead of a global middleware file:

```ts
// nitro.config.ts
serverDir: './server',
	routeRules: {
		'/api/**': { cors: true },
	},

	handlers: [
		{
			route: '/api/admin/**',
			handler: './server/middleware/admin-guard.ts',
			middleware: true,
		},
	],

	scheduledTasks: {

		'0 0 1 6,11 *': 'scholars:qualify-check',

		'0 * * * *': 'mail:queue',

		'*/30 * * * *': 'health:check',
	},
```

```ts
import { defineHandler } from 'nitro';
import { ForbiddenError } from '../utils/errors';
import { handleError } from '../utils/response';
import type { AppRole } from '../types/h3';

const ALLOWED_ROLES: AppRole[] = ['admin'];

export default defineHandler(async (event) => {
	const role = event.context.role;

	if (!role || !ALLOWED_ROLES.includes(role)) {
		return handleError(event, new ForbiddenError('Admin access required'));
	}

	return;
});
```

---

## 9. Services

Services own all business logic. They use Drizzle directly — no repository layer.

### `server/services/user.service.ts`

---

## 10. Route Handlers

Routes are thin. They: validate → call service → respond. Nothing else.

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
		public override message: string,
		public code: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'AppError';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class BadRequestError extends AppError {
	constructor(message = 'Bad request') {
		super(400, message, 'BAD_REQUEST');
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized') {
		super(401, message, 'UNAUTHORIZED');
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'Forbidden') {
		super(403, message, 'FORBIDDEN');
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string) {
		super(404, `${resource} not found`, 'NOT_FOUND');
	}
}

export class ConflictError extends AppError {
	constructor(message: string) {
		super(409, message, 'CONFLICT');
	}
}

export class ValidationError extends AppError {
	constructor(details: unknown) {
		super(422, 'Validation failed', 'VALIDATION_ERROR', details);
	}
}

export class FileTooLargeError extends AppError {
	constructor(maxMb = 50) {
		super(413, `File exceeds the ${maxMb} MB limit`, 'FILE_TOO_LARGE');
	}
}

export class UnsupportedFileTypeError extends AppError {
	constructor(allowed: string[]) {
		super(
			415,
			`Unsupported file type. Allowed: ${allowed.join(', ')}`,
			'UNSUPPORTED_FILE_TYPE',
		);
	}
}

export class ImportError extends AppError {
	constructor(message: string, details?: unknown) {
		super(422, message, 'IMPORT_ERROR', details);
	}
}

export class InternalError extends AppError {
	constructor(message = 'An unexpected error occurred') {
		super(500, message, 'INTERNAL_ERROR');
	}
}

export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}
```

---

## 14. Responses

### `server/utils/response.ts`

```ts
import type { H3Event } from 'nitro';
import { AppError } from './errors';
import { isDev } from './env';

export function successResponse<T>(
	data: T,
	meta?: Record<string, unknown>,
): SuccessResponse<T> {
	return {
		success: true,
		data,
		...(meta ? { meta } : {}),
	};
}

export function createdResponse<T>(data: T): Response {
	return new Response(
		JSON.stringify({ success: true, data } satisfies SuccessResponse<T>),
		{
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		},
	);
}

export function noContentResponse(): Response {
	return new Response(null, { status: 204 });
}

export function handleError(event: H3Event, error: unknown): Response {
	if (error instanceof AppError) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: error.code,
					message: error.message,
					...(error.details !== undefined ? { details: error.details } : {}),
				},
			} satisfies ErrorResponse),
			{
				status: error.statusCode,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	console.error('[handleError] Unhandled error:', error);

	const body: ErrorResponse & { _debug?: unknown } = {
		success: false,
		error: {
			code: 'INTERNAL_ERROR',
			message: 'An unexpected error occurred',
		},
	};

	if (isDev && error instanceof Error) {
		body._debug = {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	return new Response(JSON.stringify(body), {
		status: 500,
		headers: { 'Content-Type': 'application/json' },
	});
}

export interface SuccessResponse<T> {
	success: true;
	data: T;
	meta?: Record<string, unknown>;
}

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

## 16. Webhooks

Webhook routes are in `PUBLIC_ROUTES` — they skip auth middleware but verify their own signature.

### `server/routes/api/webhooks/[feature].[http_method].ts`

---

## 17. Mailing

### `server/services/[feature].service.ts`

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
