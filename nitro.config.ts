import { defineConfig } from 'nitro';

export default defineConfig({
	serverDir: './server',
	routeRules: {
		'/**': {
			cors: true,
			headers: {
				'Access-Control-Allow-Origin': 'http://localhost:3000',
				'Access-Control-Allow-Methods': '*',
				'Access-Control-Allow-Headers': '*',
				'Access-Control-Allow-Credentials': 'true',
				Vary: 'Origin',
			},
		},
	},
	devServer: {
		port: 3001,
	},
	experimental: {
		openAPI: true,
	},
	openAPI: {
		meta: {
			title: 'CPSU-Scholarship-API',
			description: 'CPSU Scholarship API',
			version: '1.0',
		},
		production: 'runtime',
	},
});
