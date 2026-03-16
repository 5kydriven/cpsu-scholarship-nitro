import { definePlugin } from 'nitro';

export default definePlugin(async () => {
	const { db } = await import('../db');
	try {
		await db.execute('select 1');
		console.log('✅ Database connected');
	} catch (err) {
		console.error('❌ Database connection failed:', err);
		process.exit(1);
	}
});
