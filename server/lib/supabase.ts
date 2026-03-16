import { createClient } from '@supabase/supabase-js';
import { env } from '../utils/env';

// Standard client — respects RLS
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Admin client — bypasses RLS, server-side only
export const supabaseAdmin = createClient(
	env.SUPABASE_URL,
	env.SUPABASE_SERVICE_ROLE_KEY,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	},
);
