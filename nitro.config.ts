import { defineConfig } from 'nitro';

export default defineConfig({
	serverDir: './server',
	// ── Route rules ───────────────────────────
	routeRules: {
		'/api/**': {
			cors: true,
			headers: {
				'Access-Control-Allow-Origin': 'http://localhost:3000',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Allow-Credentials': 'true',
			},
		},
		'/': {
			basicAuth: false,
		},
	},

	// ── Admin-only middleware ─────────────────
	// admin-guard.ts runs AFTER 02.auth.ts (global middleware runs first).
	// It is scoped only to /api/admin/** — no overhead on student routes.
	handlers: [
		{
			route: '/api/admin/**',
			handler: './server/middleware/admin-guard.ts',
			middleware: true,
		},
	],

	devServer: {
		port: 3001,
	},

	// ── Scheduled tasks (Phase 5) ─────────────
	// scheduledTasks: {
	// 	// Check scholar qualification status at start of each semester
	// 	// Runs at midnight on the 1st of June and November
	// 	'0 0 1 6,11 *': 'scholars:qualify-check',

	// 	// Process pending mail queue every hour
	// 	'0 * * * *': 'mail:queue',

	// 	// Health check every 30 minutes
	// 	'*/30 * * * *': 'health:check',
	// },
});
