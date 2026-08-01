import { Role, type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * The logged-in caller's profile, or null if unauthenticated.
 *
 * Treats a misconfigured or unreachable auth provider as "not signed in"
 * rather than throwing. Throwing here would surface as a 500 on every
 * server-rendered page and API route that reads the session, including
 * public ones — the same site-wide outage the middleware guard prevents.
 * Callers that require a session use requireProfile/requireRole, which
 * still reject, so this cannot grant access.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    return await prisma.profile.findUnique({ where: { id: user.id } });
  } catch (error) {
    console.error("[auth] Could not resolve the current profile:", error);
    return null;
  }
}

/** Same as getCurrentProfile, but throws a 401 AuthError if not logged in. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new AuthError("Not authenticated", 401);
  return profile;
}

/** Throws a 401/403 AuthError unless the caller has one of `roles`. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) {
    throw new AuthError(`Requires role: ${roles.join(" or ")}`, 403);
  }
  return profile;
}

/** Turns a thrown AuthError (or unknown error) into a JSON error response. */
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
