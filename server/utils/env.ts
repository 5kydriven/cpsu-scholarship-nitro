import { z } from 'zod';

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const envSchema = z.object({
	// ── App ──────────────────────────────────
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),

	APP_URL: z.string().url().default('http://localhost:3000'),

	// ── Supabase ─────────────────────────────
	SUPABASE_URL: z.string().url(),
	SUPABASE_ANON_KEY: z.string().min(1),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

	// ── Database (Drizzle) ───────────────────
	// ⚠️  Always use the DIRECT connection (port 5432).
	//     Never use the Supabase pooler URL — it breaks migrations.
	DATABASE_URL: z.string().url(),

	// ── Mail (Nodemailer / SMTP) ─────────────
	SMTP_HOST: z.string().min(1),
	SMTP_PORT: z.coerce.number().int().positive().default(587),
	SMTP_USER: z.string().min(1),
	SMTP_PASS: z.string().min(1),
	MAIL_FROM: z.string().email(),

	// ── Supabase Storage ─────────────────────
	// Bucket where student application documents are stored.
	// Phase 3 — application_documents (file_url)
	STORAGE_BUCKET_DOCUMENTS: z.string().min(1).default('application-documents'),

	// ── Export ───────────────────────────────
	// Used as the title/header on generated PDF exports.
	// Phase 5 — export.service.ts
	EXPORT_HEADER_TITLE: z
		.string()
		.min(1)
		.default('Central Philippine State University'),
	EXPORT_HEADER_SUBTITLE: z
		.string()
		.min(1)
		.default('Scholarship Management System'),

	// ── AI (Claude API) ──────────────────────
	// Phase 6 — ai.service.ts (stub until Phase 6 is implemented)
	// Optional: validation only warns, does not crash the server.
	ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

// ─────────────────────────────────────────────
// Parse & fail fast
// ─────────────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('\n❌  Invalid environment variables — server cannot start.\n');

	const errors = parsed.error.flatten().fieldErrors;

	for (const [key, messages] of Object.entries(errors)) {
		console.error(`   ${key}: ${messages?.join(', ')}`);
	}

	// Warn specifically if AI key is missing (non-fatal hint)
	if (!process.env['ANTHROPIC_API_KEY']) {
		console.warn(
			'\n⚠️   ANTHROPIC_API_KEY is not set — AI selection (Phase 6) will be unavailable.',
		);
	}

	console.error('');
	process.exit(1);
}

// Warn about missing AI key even on success (non-fatal)
if (!parsed.data.ANTHROPIC_API_KEY) {
	console.warn(
		'⚠️   ANTHROPIC_API_KEY is not set — AI selection (Phase 6) will be unavailable.',
	);
}

// ─────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────

export const env = parsed.data;

// Convenience flags used across services
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
