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

	// In dev, include query string so you can see filter/pagination params
	const display =
		isDev && parsedUrl.search ? `${path}${parsedUrl.search}` : path;

	event.runtime?.node?.res?.on('finish', () => {
		const status = event.runtime?.node?.res?.statusCode ?? 0;
		const ms = Date.now() - start;

		// Colour-code by status band for quick visual scanning in terminal
		const label = statusLabel(status);

		console.log(`${label} [${method}] ${display} → ${status} (${ms}ms)`);
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
