import type { Assessment, Profile } from "@prisma/client";
import { AuthError } from "@/lib/auth";

/**
 * Who may read/write a given assessment:
 *  - ADMIN/STAFF: always.
 *  - A logged-in CLIENT profile whose clientId matches, or who has
 *    already claimed it.
 *  - An anonymous caller holding the assessment's resumeToken (the
 *    magic-link resume flow described in architecture doc §8).
 */
export function canAccessAssessment(
  assessment: Pick<Assessment, "clientId" | "claimedByProfileId" | "resumeToken">,
  profile: Profile | null,
  token: string | null
): boolean {
  if (profile?.role === "ADMIN" || profile?.role === "STAFF") return true;
  if (profile && profile.clientId === assessment.clientId) return true;
  if (profile && profile.id === assessment.claimedByProfileId) return true;
  if (!profile && token && assessment.resumeToken && token === assessment.resumeToken) return true;
  return false;
}

export function assertAccessAssessment(
  assessment: Pick<Assessment, "clientId" | "claimedByProfileId" | "resumeToken">,
  profile: Profile | null,
  token: string | null
) {
  if (!canAccessAssessment(assessment, profile, token)) {
    throw new AuthError("Not authorized to access this assessment", 403);
  }
}
