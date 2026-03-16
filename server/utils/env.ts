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
