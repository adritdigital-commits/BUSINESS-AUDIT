import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { assertAccessAssessment } from "@/lib/assessmentAccess";
import { loadActiveCategories } from "@/lib/questionBank";
import { generateReport } from "@/lib/report";
import type { AnswersMap } from "@/lib/scoring";
import { handleApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/assessments/[id]/complete?token=... — finalize the assessment:
 * computes the authoritative score and freezes a reportJson snapshot so
 * historical reports stay reproducible even if the question bank changes
 * later (architecture doc §3, §5).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");

    const existing = await prisma.assessment.findUniqueOrThrow({ where: { id } });
    const profile = await getCurrentProfile();
    assertAccessAssessment(existing, profile, token);

    if (existing.status === "COMPLETED") {
      return Response.json({ error: "Assessment is already completed" }, { status: 409 });
    }

    const categories = await loadActiveCategories();
    const answers = existing.answersJson as AnswersMap;
    const report = generateReport(categories, answers);

    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        overallScore: report.overall,
        categoryScoresJson: report.categoryScores as unknown as Prisma.InputJsonValue,
        reportJson: report as unknown as Prisma.InputJsonValue,
      },
    });

    return Response.json({ assessment, report });
  } catch (error) {
    return handleApiError(error);
  }
}
