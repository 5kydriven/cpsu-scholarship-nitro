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
});
