# CPSU Scholarship Nitro API

## Project Snapshot
- Backend API for a custom scholarship system.
- Live stack: Nitro v3, TypeScript, Drizzle ORM, Supabase Auth/Postgres, and Zod.
- Treat `server/` as the source of truth. This repo includes roadmap comments, stale docs, and placeholder files that do not represent live behavior.

## Current Scope
Implemented domains in the current codebase:
- Auth
- Students
- Personnels
- Courses
- Addresses
- Student parents

Notes:
- Student routes currently support create, list, and get-by-id. Update/delete are not complete.
- Personnel routes currently support create, list, and get-by-id.
- Course routes currently support create, list, update, and delete.

## Not Implemented / Do Not Assume
The following are placeholder-only, roadmap-only, or otherwise not wired end-to-end today:
- `/api/applications`
- `/api/admin/applications`
- `/api/admin/scholars`
- Scholarship ranking flows
- Scholarship CSV import flows
- AI-assisted selection flows
- Export flows
- Storage-driven application document workflows

Do not treat these as implemented just because related validators, env vars, comments, TODOs, or empty route files exist.

## Repo Layout
- `server/routes/`: HTTP handlers. The root `/` route returns an HTML route list, but it is stale and not authoritative.
- `server/middleware/`: request middleware. Effective order is `01.logger.ts`, `02.auth.ts`, then `admin-guard.ts`.
- `server/services/`: business logic and Drizzle access.
- `server/db/schema/`: Drizzle tables and relations.
- `server/db/migrations/`: Drizzle migration output.
- `server/lib/`: Supabase clients and storage helpers.
- `server/utils/`: env parsing, error/response helpers, pagination, request parsing, case conversion.
- `server/validators/`: Zod schemas for body/query validation.
- `supabase/`: Supabase CLI config and migration artifacts.

## Request Lifecycle
1. `server/middleware/01.logger.ts` runs first on every request. It logs method, path, status, and duration, and currently also sets CORS headers in the finish callback.
2. `server/middleware/02.auth.ts` protects `/api/**` except the public auth routes. It reads `sb-access-token` and `sb-refresh-token` cookies, refreshes sessions when possible, and attaches auth context to the event.
3. `server/middleware/admin-guard.ts` runs after auth and only blocks guarded prefixes. Today it restricts `/api/admin` and `/api/personnels` to `admin` or `staff`.
4. Route handlers validate input, call services, and return response helpers.
5. Services own business logic and access Drizzle directly.
6. `server/utils/response.ts` standardizes the JSON response envelope.

## Auth Model
- Supabase Auth is the auth system.
- Public routes today:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- Login/logout manage `sb-access-token` and `sb-refresh-token` cookies.
- Protected handlers rely on middleware-populated context:
  - `event.context.user`
  - `event.context.role`
  - `event.context.student`
- Student and personnel rows are linked to `auth.users` by UUID.
- Role/context helpers live in `server/types/h3.d.ts`:
  - `requireStudent`
  - `requireAdmin`
  - `requireStaffOrAdmin`

## Input And Response Conventions
- Use `defineHandler` from `nitro`.
- Prefer `requestBody(event)` for body parsing. It supports JSON and multipart form-data and camelizes incoming keys.
- For query parsing, use `new URL(event.req.url)` and validate `Object.fromEntries(url.searchParams.entries())` with Zod.
- Use Zod `safeParse()` in routes. Current route style typically converts failures to `ValidationError` with `z.treeifyError(...)`.
- Use `successResponse()` and `handleError()` from `server/utils/response.ts`.
- `successResponse()` currently converts `data` keys to `snake_case`. The envelope stays `{ success, data, meta? }`.
- Use `createdResponse()` or `noContentResponse()` only when the route semantics require them. The dominant current pattern is `successResponse()`.

## Coding Standards For Agents
- Keep routes thin: parse input, validate, call service, return a response helper.
- Put business logic and DB access in `server/services/`.
- Access Drizzle directly from services via `server/db`; do not add a repository layer.
- Throw `AppError` subclasses instead of raw strings.
- Prefer existing utilities over new abstractions unless the duplication is real and repeated.
- Preserve the current layout and naming unless you are deliberately refactoring the pattern repo-wide.

## Import Style
- Use `defineHandler` from `nitro`.
- In routes and other high-level app modules, follow the existing `#server/...ts` alias style.
- In lower-level modules that already use relative imports (`server/db`, `server/lib`, `server/middleware`, `server/types`), stay consistent with the local pattern instead of forcing aliases everywhere.
- Include file extensions on aliased imports to match the current codebase.

## Do Not Copy Existing Exceptions
These are current inconsistencies, not standards:
- Some files still throw raw `Error`.
- Some files still read `process.env` directly.
- Some handlers still contain debug `console.log` calls.
- Some route files are empty or placeholder-only.
- The root HTML route listing is stale.
- `docs/nitro-v3-architecture.md`, `TODO.md`, and phase comments describe planned work as well as implemented work.

Build success is not proof of feature completeness. Placeholder handlers can still bundle successfully.

## Commands
- `bun run dev`
- `bun run build`
- `bun run preview`
- `npx drizzle-kit generate`
- `npx drizzle-kit migrate`
- `npx drizzle-kit studio`
- `npx supabase start`
- `npx supabase stop`
- `npx supabase db reset`
- `npx supabase status`

There is no committed automated test suite in the repo today. Minimum verification is a build plus targeted route/code inspection.

## Source Of Truth Warning
- Treat live files under `server/` as authoritative.
- Do not use `docs/nitro-v3-architecture.md`, the root HTML route listing, `TODO.md`, or phase comments as proof that a feature is implemented.
- Verify placeholder-looking files before assuming behavior. Several `/api/applications` and `/api/admin/*` handlers currently exist as zero-byte stubs.
