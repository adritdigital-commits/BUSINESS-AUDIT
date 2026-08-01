import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const startAssessmentSchema = z.object({
  businessName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  /** STAFF/ADMIN may start an assessment against an existing client instead. */
  clientId: z.string().optional(),
});

/**
 * POST /api/assessments — start a new assessment. No login required (the
 * audit can be taken anonymously — see architecture doc §8): a minimal
 * Client record is created from whatever contact info is supplied, and a
 * resumeToken is issued for the magic-link resume flow. If the caller is
 * already logged in as CLIENT, the assessment is attached to their
 * existing client account instead of creating a new one.
 */
export async function POST(request: NextRequest) {
  try {
    const body = startAssessmentSchema.parse(await request.json());
    const profile = await getCurrentProfile();

    let clientId = body.clientId;
    if (profile?.role === "CLIENT" && profile.clientId) {
      clientId = profile.clientId;
    } else if (!clientId) {
      const client = await prisma.client.create({
        data: {
          businessName: body.businessName,
          contactName: body.contactName,
          email: body.email,
          phone: body.phone,
          website: body.website,
          industry: body.industry,
        },
      });
      clientId = client.id;
    }

    const assessment = await prisma.assessment.create({
      data: {
        clientId,
        claimedByProfileId: profile?.id,
        resumeToken: profile ? undefined : randomUUID(),
      },
    });

    return Response.json({ assessment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** GET /api/assessments — admin listing, filterable (ADMIN/STAFF only). */
export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("clientId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const take = Math.min(Number(searchParams.get("take") ?? 25), 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where: {
          clientId,
          status: status as "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | undefined,
        },
        include: { client: true },
        orderBy: { startedAt: "desc" },
        take,
        skip,
      }),
      prisma.assessment.count({ where: { clientId, status: status as never } }),
    ]);

    return Response.json({ assessments, total });
  } catch (error) {
    return handleApiError(error);
  }
}
