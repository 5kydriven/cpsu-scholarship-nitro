# CPSU Scholarship Nitro Backend - Current Architecture

> Stack: Nitro v3 + H3 + Drizzle ORM + Supabase + Zod  
> Scope: Documents the codebase as it exists now (not target-state conventions)
> Last synced: 2026-03-29

## 1) Runtime Stack

- Framework: `nitro` (`defineConfig`, `defineHandler`)
- DB ORM: `drizzle-orm` + `drizzle-kit`
- DB driver: `postgres`
- Auth and storage: `@supabase/supabase-js`
- Validation: `zod`
- Utility libs: `camelize`, `consola`, `nodemailer` (installed)

## 2) Project Structure

```text
server/
  db/
    index.ts
    schema/
      auth.ts
      students.ts
      student-parents.ts
      personnels.ts
      addresses.ts
      courses.ts
      relations.ts
      index.ts
    migrations/
  lib/
    supabase.ts
  middleware/
    01.logger.ts
    02.auth.ts
    admin-guard.ts
  routes/
    index.ts
    api/
      auth/
      students/
      courses/
      personnels/
      parents/
      addresses/
      applications/          (currently scaffolded)
      admin/applications/    (currently scaffolded)
      admin/scholars/        (currently scaffolded)
      webhooks/              (folder exists, no files)
  service/
    student.service.ts
    student-parent.service.ts
    personnel.service.ts
    address.service.ts
    course.service.ts
  validators/
  utils/
  types/
```

Notes:
- Business logic directory is currently `server/service/` (singular).
- `server/services/` is not present.

## 3) Request Flow (Current)

```text
Request
  -> 01.logger middleware
  -> 02.auth middleware
  -> admin-guard middleware (only guards selected prefixes)
  -> route handler
  -> service (for most implemented endpoints)
  -> standardized response helpers
```

## 4) Middleware

### `server/middleware/01.logger.ts`

- Logs method, path, status, and duration.
- Also sets CORS headers at middleware level.
- Handles `OPTIONS` by setting status to `204`.

### `server/middleware/02.auth.ts`

- Public routes: `/api/auth/register`, `/api/auth/login`.
- Enforces `/api/**` access via cookie-based auth tokens:
  - `sb-access-token`
  - `sb-refresh-token`
- Uses `createUserClient()` to validate and refresh session.
- Resolves role from Supabase `user_metadata.role`:
  - `admin`, `staff`, fallback `student`
- For students, loads student row and attaches:
  - `event.context.user`
  - `event.context.role`
  - `event.context.student`
- Uses `h3` cookie helpers (`getCookie`, `setCookie`).

### `server/middleware/admin-guard.ts`

- Global middleware with path-based guarding (not configured via Nitro `handlers`).
- Guarded prefixes:
  - `/api/admin`
  - `/api/personnels`
- Allowed roles:
  - `admin`
  - `staff`

## 5) Auth and Supabase

### `server/lib/supabase.ts`

- `supabase`: standard client (anon key).
- `createUserClient(token?)`: request-scoped auth verification client.
- `supabaseAdmin`: service-role client.
- Storage helpers:
  - `getDocumentUrl(path)`
  - `uploadDocument(path, file, mime)`
  - `deleteDocument(path)`

Auth endpoints currently implemented:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/logout`

## 6) Database Layer

### `server/db/index.ts`

- Creates Drizzle client from `env.DATABASE_URL`.
- Uses `postgres` with:
  - `prepare: false`
  - `max: 10`
- Re-exports schema through `export * from './schema/index'`.

### Current schema modules

- `students`
- `student_parents`
- `personnels`
- `addresses`
- `courses`
- `auth.users` reference table (`auth.ts`)
- relations in `relations.ts`

## 7) Services

Current services in `server/service/`:
- `student.service.ts`
- `student-parent.service.ts`
- `personnel.service.ts`
- `address.service.ts`
- `course.service.ts`

Implemented pattern:
- Routes generally validate input then call service.
- DB access is done in services via Drizzle.

Current gaps:
- `studentService.update()` is declared but not implemented.
- Some routes are stubs or empty (see route inventory below).

## 8) Validators

Current validator files:
- `address.validator.ts`
- `application.validator.ts`
- `auth.validator.ts`
- `course.validator.ts`
- `parent.validator.ts`
- `personnel.validator.ts`
- `shared.validator.ts`
- `student.validation.ts`

Shared schema utilities include:
- pagination/search query schemas
- `paramsSchema` for UUID `id`

## 9) Response and Error Contract

### `server/utils/errors.ts`

- Uses `AppError` base class and typed subclasses:
  - `BadRequestError`, `UnauthorizedError`, `ForbiddenError`,
  - `NotFoundError`, `ConflictError`, `ValidationError`,
  - `FileTooLargeError`, `UnsupportedFileTypeError`,
  - `ImportError`, `InternalError`

### `server/utils/response.ts`

- `successResponse(data, meta?)`
- `createdResponse(data)`
- `noContentResponse()`
- `handleError(event, error)`

Current behavior:
- `successResponse` converts data keys to `snake_case`.
- `handleError` for `AppError` includes `context: event.context` in the response payload.

## 10) Config

### `nitro.config.ts`

- Uses `defineConfig` from `nitro`.
- `serverDir: './server'`
- `routeRules` enable CORS-style headers globally (`'/**'`).
- `devServer.port = 3001`
- `experimental.openAPI = true`
- `openAPI` metadata configured.

### `drizzle.config.ts`

- Schema path: `./server/db/schema/index.ts`
- Migrations out: `./server/db/migrations`
- Dialect: `postgresql`
- DB URL currently read from `process.env.DATABASE_URL`

## 11) Route Inventory

### Implemented endpoints

- `GET /` (`server/routes/index.ts`)
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `GET /api/auth/logout`
- Students:
  - `GET /api/students`
  - `POST /api/students`
  - `GET /api/students/:id`
  - `PUT /api/students/:id` (currently debug-style placeholder response)
  - `DELETE /api/students/:id` (stub, empty handler body)
- Courses:
  - `GET /api/courses`
  - `POST /api/courses`
  - `PUT /api/courses/:id`
  - `DELETE /api/courses/:id`
- Personnels:
  - `GET /api/personnels`
  - `POST /api/personnels`
  - `GET /api/personnels/:id`
- Parents:
  - `POST /api/parents`
- Addresses:
  - `POST /api/addresses`

### Scaffolded / empty files (present, zero-byte)

- `server/routes/api/applications/index.post.ts`
- `server/routes/api/applications/me.get.ts`
- `server/routes/api/admin/applications/index.get.ts`
- `server/routes/api/admin/applications/[id].get.ts`
- `server/routes/api/admin/applications/[id].patch.ts`
- `server/routes/api/admin/scholars/index.get.ts`
- `server/routes/api/admin/scholars/[id].get.ts`
- `server/routes/api/admin/scholars/import.post.ts`

## 12) Environment Variables (Current Parse Contract)

Defined in `server/utils/env.ts`:
- `NODE_ENV`
- `APP_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `STORAGE_BUCKET_DOCUMENTS`
- `EXPORT_HEADER_TITLE`
- `EXPORT_HEADER_SUBTITLE`

Additional note:
- `ANTHROPIC_API_KEY` is referenced only as a warning check and is not part of the parsed schema.

## 13) Current Conventions Snapshot

This repository currently follows a mostly consistent "route -> validator -> service -> response" shape, with some active deviations:
- Some handlers throw raw `Error` instead of `AppError`.
- Some files still access `process.env` directly.
- Schema barrel exports use `export *` in some places.
- Several planned modules/routes are scaffolded but not implemented yet.

This document is intentionally descriptive of current state.
