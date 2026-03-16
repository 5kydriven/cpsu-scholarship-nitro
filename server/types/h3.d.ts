import type { User } from '@supabase/supabase-js';
import type { Profile } from '../db/schema';

declare module 'h3' {
	interface H3EventContext {
		user: User; // Supabase auth user
		profile: Profile; // Your app profile from DB
	}
}
