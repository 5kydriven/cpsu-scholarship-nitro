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
			headers: {
				'x-skip-middleware': 'true',
			},
		},
	},

	devServer: {
		port: 3000,
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
