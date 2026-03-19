// ─────────────────────────────────────────────
// DB Schema — explicit named exports only.
//
// ⚠️  NEVER use `export * from '...'`
//     Barrel re-exports of Drizzle table objects
//     cause query-client relation conflicts.
//     Always name every export explicitly.
// ─────────────────────────────────────────────

// ── Programs (scholarship programs list) ─────
export { programs, type Program, type NewProgram } from './programs';

// ── Uploads (CSV/Excel import records) ───────
export { uploads, type Upload, type NewUpload } from './uploads';

// ── Scholars (imported / manually added) ─────
export { scholars, type Scholar, type NewScholar } from './scholars';

// ── Enrollments (scholar ↔ program per sem) ──
export {
	enrollments,
	type Enrollment,
	type NewEnrollment,
} from './enrollments';

// ── Students (auth-linked applicants) ────────
export { students, type Student, type NewStudent } from './students';

// ── Applications ─────────────────────────────
export {
	applications,
	applicationStatuses,
	type Application,
	type NewApplication,
} from './applications';

// ── Application sub-tables ───────────────────
export {
	applicationAddresses,
	type ApplicationAddress,
	type NewApplicationAddress,
} from './application-addresses';

export {
	applicationDocuments,
	type ApplicationDocument,
	type NewApplicationDocument,
} from './application-documents';

export {
	applicationParents,
	type ApplicationParent,
	type NewApplicationParent,
} from './application-parents';

// ── Relations (required for db.query.* API) ──
export * from './relations';
