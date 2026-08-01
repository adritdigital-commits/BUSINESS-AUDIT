import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { canAccessAssessment } from "@/lib/assessmentAccess";
import { handleApiError } from "@/lib/api";

const createSchema = z.object({
  name: z.string().min(1, "Please tell us your name").max(120),
  email: z.string().email("That doesn't look like a valid email"),
  phone: z.string().max(40).optional(),
  message: z.string().max(2000).optional(),
  preferredTime: z.string().max(200).optional(),
  /** Ties the request to the audit it came from. */
  assessmentId: z.string().optional(),
  /** Resume token, when requesting from an anonymous report. */
  token: z.string().optional(),
});

/**
 * POST /api/consultations — request a consultation. Public, because the
 * strongest moment to book is right after seeing the report, which an
 * anonymous visitor can reach with a resume token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const profile = await getCurrentProfile();

    let clientId: string | null = profile?.clientId ?? null;

    // Prefer the client the assessment belongs to, once access is proven.
    if (body.assessmentId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: body.assessmentId },
        select: { id: true, clientId: true, claimedByProfileId: true, resumeToken: true },
      });
      if (!assessment) {
        return Response.json({ error: "Assessment not found" }, { status: 404 });
      }
      if (!canAccessAssessment(assessment, profile, body.token ?? null)) {
        return Response.json({ error: "Not authorized for this assessment" }, { status: 403 });
      }
      clientId = assessment.clientId;
    }

    if (!clientId) {
      return Response.json(
        { error: "Run an audit or sign in before booking a consultation" },
        { status: 400 }
      );
    }

    const consultation = await prisma.consultation.create({
      data: {
        clientId,
        assessmentId: body.assessmentId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
        preferredTime: body.preferredTime,
      },
    });

    return Response.json({ consultation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** GET /api/consultations — staff queue of incoming requests. */
export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const status = request.nextUrl.searchParams.get("status") ?? undefined;

    const consultations = await prisma.consultation.findMany({
      where: status ? { status: status as "REQUESTED" | "SCHEDULED" | "COMPLETED" | "CANCELLED" } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { client: { select: { businessName: true } } },
    });

    return Response.json({ consultations });
  } catch (error) {
    return handleApiError(error);
  }
}
