import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { assertAccessAssessment } from "@/lib/assessmentAccess";
import { handleApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/assessments/[id]?token=... — fetch one assessment. `token` is
 * the resumeToken emailed via magic link, required only for anonymous
 * resume; logged-in owners/staff don't need it.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");

    const assessment = await prisma.assessment.findUniqueOrThrow({
      where: { id },
      include: { client: true },
    });

    const profile = await getCurrentProfile();
    assertAccessAssessment(assessment, profile, token);

    return Response.json({ assessment });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateAssessmentSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]).optional(),
  /** Attach the caller's profile (and promote it to CLIENT-owner) once logged in mid-audit. */
  claim: z.boolean().optional(),
});

/** PATCH /api/assessments/[id]?token=... — update status, or claim an anonymous assessment. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const body = updateAssessmentSchema.parse(await request.json());

    const existing = await prisma.assessment.findUniqueOrThrow({ where: { id } });
    const profile = await getCurrentProfile();
    assertAccessAssessment(existing, profile, token);

    const assessment = await prisma.$transaction(async (tx) => {
      const updated = await tx.assessment.update({
        where: { id },
        data: {
          status: body.status,
          claimedByProfileId: body.claim && profile ? profile.id : undefined,
        },
      });

      // First time a logged-in CLIENT claims an anonymous assessment,
      // adopt its client record if they don't already have one.
      if (body.claim && profile?.role === "CLIENT" && !profile.clientId) {
        await tx.profile.update({ where: { id: profile.id }, data: { clientId: updated.clientId } });
      }

      return updated;
    });

    return Response.json({ assessment });
  } catch (error) {
    return handleApiError(error);
  }
}
