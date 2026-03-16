import consola from 'consola';
import { defineMiddleware } from 'nitro';

export default defineMiddleware((event) => {
	const start = Date.now();

	event.waitUntil?.(Promise.resolve());

	const ms = Date.now() - start;

	consola.info({
		method: event.req.method,
		path: event.url.pathname,
		status: event.res.status,
		ms,
	});
});
