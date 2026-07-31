import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const STAFF_ONLY_PREFIXES = ["/admin"];
const AUTH_REQUIRED_PREFIXES = ["/admin", "/dashboard"];

/**
 * Refreshes the Supabase session cookie on every request and gates access
 * to authenticated/staff-only routes. Fine-grained role checks (e.g.
 * ADMIN vs STAFF within /admin) still happen per-route via
 * src/lib/auth.ts — this is the coarse, fast, cookie-only check.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not remove — this call refreshes the auth token and must
  // run before any other logic that reads the session.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth = AUTH_REQUIRED_PREFIXES.some((p) => path.startsWith(p));
  const staffOnly = STAFF_ONLY_PREFIXES.some((p) => path.startsWith(p));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (staffOnly && user) {
    // profiles.role is the single source of truth; RLS lets a user read
    // their own row, so this is safe with the anon-key client above.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN" && profile?.role !== "STAFF") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
