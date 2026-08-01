import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS entirely. Server-only.
 * Used for privileged operations the anon/authenticated key can't do,
 * e.g. inviting a Staff/Admin user via the Auth Admin API (role is set in
 * `app_metadata`, which only the service role can write).
 *
 * Never import this from a Client Component or expose the key to the
 * browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
