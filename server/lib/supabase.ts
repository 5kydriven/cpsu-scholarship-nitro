import { createClient } from '@supabase/supabase-js';
import { env } from '../utils/env';
import type { Database } from '#server/types/database.types.js';

// ─────────────────────────────────────────────
// Standard client — used for auth token verification.
// Respects Row-Level Security (RLS).
// DO NOT use this for admin operations.
// ─────────────────────────────────────────────
export const supabase = createClient<Database>(
	env.SUPABASE_URL,
	env.SUPABASE_ANON_KEY,
	// {
	// 	auth: {
	// 		autoRefreshToken: false,
	// 		persistSession: false,
	// 		detectSessionInUrl: false,
	// 	},
	// },
);

export function createUserClient(token?: string) {
	return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		global: token
			? {
					headers: {
						Authorization: `Bearer ${token}`,
					},
			  }
			: {},
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}

// ─────────────────────────────────────────────
// Admin client — bypasses RLS entirely.
// Use ONLY on the server side for:
//   • Creating/deleting auth users (Phase 2 — student registration)
//   • Reading auth.users metadata
//   • Storage operations (Phase 3 — application documents)
// Never expose this client to the frontend.
// ─────────────────────────────────────────────
export const supabaseAdmin = createClient<Database>(
	env.SUPABASE_URL,
	env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─────────────────────────────────────────────
// Storage helpers
// Centralise bucket names so a rename is one change.
// ─────────────────────────────────────────────

/**
 * Returns the public URL for a file stored in the
 * application-documents bucket (application_documents.file_url).
 *
 * @example
 * const url = getDocumentUrl('disability/abc123.pdf');
 */
export function getDocumentUrl(path: string): string {
	const { data } = supabaseAdmin.storage
		.from(env.STORAGE_BUCKET_DOCUMENTS)
		.getPublicUrl(path);

	return data.publicUrl;
}

/**
 * Uploads a file to the application-documents bucket.
 * Returns the public URL on success, throws on error.
 *
 * Used by: application.service.ts (Phase 3)
 *
 * @param path   Storage path, e.g. `disability/<applicationId>/<filename>`
 * @param file   ArrayBuffer or Blob of the file content
 * @param mime   MIME type, e.g. `application/pdf` or `image/jpeg`
 */
export async function uploadDocument(
	path: string,
	file: ArrayBuffer | Blob,
	mime: string,
): Promise<string> {
	const { error } = await supabaseAdmin.storage
		.from(env.STORAGE_BUCKET_DOCUMENTS)
		.upload(path, file, {
			contentType: mime,
			upsert: false,
		});

	if (error) {
		throw new Error(`Storage upload failed: ${error.message}`);
	}

	return getDocumentUrl(path);
}

/**
 * Deletes a file from the application-documents bucket.
 * Fire-and-forget safe — logs error but does not throw.
 *
 * Used by: application.service.ts when an application is deleted.
 */
export async function deleteDocument(path: string): Promise<void> {
	const { error } = await supabaseAdmin.storage
		.from(env.STORAGE_BUCKET_DOCUMENTS)
		.remove([path]);

	if (error) {
		console.error(`[storage] Failed to delete ${path}:`, error.message);
	}
}
