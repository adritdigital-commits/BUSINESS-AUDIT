import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseEnv } from "@/lib/env";

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

  // Without credentials the Supabase client constructor throws. Uncaught in
  // middleware that matches every route, that returns 500
  // MIDDLEWARE_INVOCATION_FAILED for the whole site — including public pages
  // that need no auth at all. Degrade instead: skip the session refresh and
  // let the request through. Authorization is not weakened, because every
  // protected page re-checks the session server-side via getCurrentProfile().
  const envResult = readSupabaseEnv();
  if (!envResult.ok) {
    console.error(
      `[middleware] Missing environment variables: ${envResult.missing.join(", ")}. ` +
        "Session refresh and route gating are disabled; protected pages will " +
        "still redirect via their own server-side checks. " +
        "NEXT_PUBLIC_* values are inlined at build time — set them and redeploy."
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(
    envResult.env.url,
    envResult.env.anonKey,
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

  const path = request.nextUrl.pathname;
  const needsAuth = AUTH_REQUIRED_PREFIXES.some((p) => path.startsWith(p));
  const staffOnly = STAFF_ONLY_PREFIXES.some((p) => path.startsWith(p));

  try {
    // IMPORTANT: do not remove — this call refreshes the auth token and must
    // run before any other logic that reads the session.
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
  } catch (error) {
    // Supabase unreachable, misconfigured, or rate-limiting. Same reasoning
    // as the missing-env branch: a auth-provider outage must not take the
    // public site down, and protected pages still guard themselves.
    console.error("[middleware] Supabase session check failed:", error);
    return supabaseResponse;
  }

  return supabaseResponse;
}
