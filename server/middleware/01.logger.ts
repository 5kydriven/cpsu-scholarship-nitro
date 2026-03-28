import { defineHandler } from 'nitro';
import { isDev } from '../utils/env';

// ─────────────────────────────────────────────
// 01.logger.ts
//
// Runs first on every request (numbered prefix
// enforces execution order in Nitro v3).
// Logs method, path, status code, and duration.
//
// In production: one clean line per request.
// In development: also logs query string for easier debugging.
// ─────────────────────────────────────────────

export default defineHandler((event) => {
	const start = Date.now();
	const method = event.req.method;
	const parsedUrl = new URL(event.req.url);
	const path = parsedUrl.pathname;

	event.res.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
	event.res.headers.set('Access-Control-Allow-Methods', '*');
	event.res.headers.set('Access-Control-Allow-Headers', '*');
	event.res.headers.set('Access-Control-Allow-Credentials', 'true');

	// ✅ Handle preflight OPTIONS request immediately
	if (method === 'OPTIONS') {
		event.res.status = 204;
	}

	// In dev, include query string so you can see filter/pagination params
	const display =
		isDev && parsedUrl.search ? `${path}${parsedUrl.search}` : path;

	event.runtime?.node?.res?.on('finish', () => {
		const status = event.runtime?.node?.res?.statusCode ?? 0;
		const ms = Date.now() - start;

		// Colour-code by status band for quick visual scanning in terminal
		const label = statusLabel(status);

		console.log(`${label} [${method}] ${display} → ${status} (${ms}ms)`);
		console.log(`Headers: ${JSON.stringify(event.res.headers.entries())}`);
	});
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function statusLabel(status: number): string {
	if (status >= 500) return '🔴';
	if (status >= 400) return '🟡';
	if (status >= 300) return '🔵';
	return '🟢';
}
