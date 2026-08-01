import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { assertAccessAssessment } from "@/lib/assessmentAccess";
import { loadActiveCategories } from "@/lib/questionBank";
import { generateReport } from "@/lib/report";
import type { AnswersMap } from "@/lib/scoring";
import { handleApiError } from "@/lib/api";
import type { Report } from "@/lib/report";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/assessments/[id]/report?token=... — the generated report. If the
 * assessment is COMPLETED, returns the frozen reportJson snapshot; while
 * still IN_PROGRESS, computes a live preview from current answers instead
 * (same generateReport function, so numbers never disagree — doc §5, §9).
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");

    const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id } });
    const profile = await getCurrentProfile();
    assertAccessAssessment(assessment, profile, token);

    if (assessment.status === "COMPLETED" && assessment.reportJson) {
      return Response.json({ report: assessment.reportJson as unknown as Report, live: false });
    }

    const categories = await loadActiveCategories();
    const answers = assessment.answersJson as AnswersMap;
    const report = generateReport(categories, answers);

    return Response.json({ report, live: true });
  } catch (error) {
    return handleApiError(error);
  }
}
