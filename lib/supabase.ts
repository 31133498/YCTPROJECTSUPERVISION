"use client";

/**
 * Client-side Supabase — used for Storage only (auth stays on Firebase).
 * Lazily initialised from `NEXT_PUBLIC_SUPABASE_*` env vars (safe to expose;
 * the anon key is protected by Storage RLS policies, not by being hidden).
 *
 * Uploads go through this; downloads use a signed URL minted server-side by
 * `lib/supabase-admin.ts` so private objects never need a public bucket.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase client config incomplete. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local / Vercel."
    );
  }
  cached = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return cached;
}
