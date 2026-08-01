import { createBrowserClient } from "@supabase/ssr";
import { readSupabaseEnv } from "@/lib/env";

/** Supabase client for use in Client Components. */
export function createClient() {
  const envResult = readSupabaseEnv();
  if (!envResult.ok) {
    throw new Error(
      `Supabase is not configured: missing ${envResult.missing.join(", ")}. ` +
        "These are inlined at build time — set them and redeploy."
    );
  }

  return createBrowserClient(envResult.env.url, envResult.env.anonKey);
}
