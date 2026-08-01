import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { assertAccessAssessment } from "@/lib/assessmentAccess";
import { loadActiveCategories } from "@/lib/questionBank";
import { generateReport, type Report } from "@/lib/report";
import type { AnswersMap } from "@/lib/scoring";
import { handleApiError } from "@/lib/api";
import { ReportDocument } from "@/lib/pdf/ReportDocument";
import { pdfFilename } from "@/lib/pdf/filename";

// @react-pdf/renderer needs Node APIs, not the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/assessments/[id]/pdf?token=… — streams the report as a PDF,
 * built from the same Report object the on-screen view renders.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");

    const assessment = await prisma.assessment.findUniqueOrThrow({
      where: { id },
      include: { client: { select: { businessName: true } } },
    });

    const profile = await getCurrentProfile();
    assertAccessAssessment(assessment, profile, token);

    const report: Report =
      assessment.status === "COMPLETED" && assessment.reportJson
        ? (assessment.reportJson as unknown as Report)
        : generateReport(await loadActiveCategories(), assessment.answersJson as AnswersMap);

    const buffer = await renderToBuffer(
      createElement(ReportDocument, {
        report,
        businessName: assessment.client?.businessName,
        completedAt: assessment.completedAt,
      }) as Parameters<typeof renderToBuffer>[0]
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename(assessment.client?.businessName, id)}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
