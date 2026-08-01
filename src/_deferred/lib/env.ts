/**
 * Environment access for the Edge middleware.
 *
 * Deliberately returns a result rather than throwing at module scope: a
 * throw during module initialisation of middleware crashes every request
 * with MIDDLEWARE_INVOCATION_FAILED, which is the exact outage this module
 * exists to prevent.
 *
 * Note on NEXT_PUBLIC_*: these are inlined at build time. A value added to
 * the hosting dashboard after a build is NOT picked up by that build — a
 * redeploy is required. `scripts/check-env.mjs` enforces this before deploy.
 */

export interface SupabaseBrowserEnv {
  url: string;
  anonKey: string;
}

export type SupabaseEnvResult =
  | { ok: true; env: SupabaseBrowserEnv }
  | { ok: false; missing: string[] };

/** The public Supabase credentials the middleware and browser client need. */
export function readSupabaseEnv(): SupabaseEnvResult {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  // Treat empty/whitespace as missing: an env var set to "" is a common
  // dashboard mistake and would otherwise reach the Supabase client and throw.
  if (!url?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, env: { url: url!.trim(), anonKey: anonKey!.trim() } };
}

/** Every variable the deployed application needs, for preflight checking. */
export const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
