import "server-only";

/**
 * Server-side Supabase (service-role key). Used from route handlers / server
 * actions to mint short-lived signed URLs for submission files and to enforce
 * access before doing so (the caller must already be verified via
 * `requireSession()` / `requireRole()`).
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is server-only and secret — never `NEXT_PUBLIC_`.
 * Lazily initialised so `next build` doesn't need it.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUBMISSIONS_BUCKET } from "@/lib/firestore/paths";

let cached: SupabaseClient | undefined;

function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin config incomplete. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server env)."
    );
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Signed download URL for a submission object. Default TTL: 5 minutes. */
export async function createSubmissionSignedUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(SUBMISSIONS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) {
    throw new Error(`Failed to sign ${storagePath}: ${error?.message}`);
  }
  return data.signedUrl;
}

/** Remove a submission object (used when a draft is superseded/withdrawn). */
export async function removeSubmissionObject(
  storagePath: string
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .storage.from(SUBMISSIONS_BUCKET)
    .remove([storagePath]);
  if (error) throw new Error(`Failed to remove ${storagePath}: ${error.message}`);
}
