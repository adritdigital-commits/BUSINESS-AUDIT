import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { assertAccessAssessment } from "@/lib/assessmentAccess";
import { loadActiveCategories } from "@/lib/questionBank";
import { computeScore, type AnswersMap } from "@/lib/scoring";
import { handleApiError } from "@/lib/api";

const answerSchema = z.object({
  questionId: z.string(),
  answer: z.object({
    optionId: z.string().optional(),
    optionIds: z.array(z.string()).optional(),
    value: z.union([z.number(), z.string()]).optional(),
  }),
});

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/assessments/[id]/answer?token=... — upsert a single answer
 * (autosave on every question). Recomputes a live category/overall score
 * preview so the client-facing progress UI stays in sync with the
 * server's authoritative scoring engine — but does NOT freeze reportJson;
 * that only happens on /complete.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const { questionId, answer } = answerSchema.parse(await request.json());

    const existing = await prisma.assessment.findUniqueOrThrow({ where: { id } });
    const profile = await getCurrentProfile();
    assertAccessAssessment(existing, profile, token);

    if (existing.status !== "IN_PROGRESS") {
      return Response.json({ error: "Assessment is no longer in progress" }, { status: 409 });
    }

    const answers: AnswersMap = { ...(existing.answersJson as AnswersMap), [questionId]: answer };

    const categories = await loadActiveCategories();
    const { categoryScores, overall } = computeScore(categories, answers);

    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        answersJson: answers as unknown as Prisma.InputJsonValue,
        categoryScoresJson: categoryScores as unknown as Prisma.InputJsonValue,
        overallScore: overall,
      },
    });

    return Response.json({ assessment, categoryScores, overall });
  } catch (error) {
    return handleApiError(error);
  }
}
