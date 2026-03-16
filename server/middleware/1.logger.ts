import { defineHandler } from 'nitro';

export default defineHandler((event) => {
	const start = Date.now();
	const method = event.req.method;
	const url = new URL(event.req.url).pathname;

	// Log after response
	event.node?.res?.on('finish', () => {
		const status = event.node?.res?.statusCode ?? 0;
		const ms = Date.now() - start;
		console.log(`[${method}] ${url} → ${status} (${ms}ms)`);
	});
});
