import { defineConfig } from 'nitro';

export default defineConfig({
	serverDir: './server',
	routeRules: {
		'/api/**': { cors: true },
		'/api/auth/**': { cors: true },
	},
});
