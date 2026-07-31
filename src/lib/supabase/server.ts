import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseEnv } from "@/lib/env";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Reads the session from cookies; writes are a no-op when called
 * from a Server Component (cookies are read-only there — session refresh
 * happens in middleware instead).
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Fail with a diagnosable message rather than @supabase/ssr's generic one.
  // Callers that read the session go through getCurrentProfile, which treats
  // this as "not signed in" instead of propagating a 500.
  const envResult = readSupabaseEnv();
  if (!envResult.ok) {
    throw new Error(
      `Supabase is not configured: missing ${envResult.missing.join(", ")}. ` +
        "NEXT_PUBLIC_* values are inlined at build time — set them and redeploy."
    );
  }

  return createServerClient(
    envResult.env.url,
    envResult.env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore since
            // middleware refreshes the session on every request.
          }
        },
      },
    }
  );
}
