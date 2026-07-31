import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { loadActiveCategories } from "@/lib/questionBank";
import { generateReport } from "@/lib/report";
import type { AnswersMap } from "@/lib/scoring";
import { handleApiError } from "@/lib/api";

const lineItemSchema = z.object({
  service: z.string(),
  serviceId: z.string().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  timeToFix: z.string().nullable().optional(),
  costRangeMin: z.number().int().nullable().optional(),
  costRangeMax: z.number().int().nullable().optional(),
});

const createProposalSchema = z.object({
  clientId: z.string(),
  assessmentId: z.string().optional(),
  /** Manual line items; omit to auto-generate from the assessment's triggered recommendations. */
  items: z.array(lineItemSchema).optional(),
});

/**
 * POST /api/proposals — generate a proposal from an assessment's triggered
 * recommendations (architecture doc §10 Phase 3), or from manually
 * supplied line items (ADMIN/STAFF only).
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await requireRole("ADMIN", "STAFF");
    const body = createProposalSchema.parse(await request.json());

    let items = body.items;
    let totalMin = 0;
    let totalMax = 0;

    if (!items && body.assessmentId) {
      const assessment = await prisma.assessment.findUniqueOrThrow({
        where: { id: body.assessmentId },
      });

      const report =
        assessment.status === "COMPLETED" && assessment.reportJson
          ? (assessment.reportJson as unknown as { recommendations: typeof items; budget: { min: number; max: number } })
          : generateReport(await loadActiveCategories(), assessment.answersJson as AnswersMap);

      items = report.recommendations as NonNullable<typeof items>;
      totalMin = report.budget.min;
      totalMax = report.budget.max;
    } else if (items) {
      totalMin = items.reduce((sum, i) => sum + (i.costRangeMin ?? 0), 0);
      totalMax = items.reduce((sum, i) => sum + (i.costRangeMax ?? 0), 0);
    }

    if (!items) {
      return Response.json(
        { error: "Provide either assessmentId or items" },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.create({
      data: {
        clientId: body.clientId,
        assessmentId: body.assessmentId,
        itemsJson: items as unknown as Prisma.InputJsonValue,
        totalMin,
        totalMax,
        createdByProfileId: profile.id,
      },
    });

    return Response.json({ proposal }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** GET /api/proposals?clientId=... — admin listing (ADMIN/STAFF only). */
export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;

    const proposals = await prisma.proposal.findMany({
      where: { clientId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ proposals });
  } catch (error) {
    return handleApiError(error);
  }
}
